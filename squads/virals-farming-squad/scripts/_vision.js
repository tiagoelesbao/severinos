/**
 * _vision.js — Cascata de visão para a F3 (descarte de camadas + tradução de cena).
 *
 * A F3 é a fase que mais consome visão: um call por frame, por criativo, por lote.
 * A cota do Gemini é o gargalo real — por isso existe esta cascata.
 *
 * VERIFICADO EM 2026-07-26:
 *   ✅ Gemini (via LocalTranscriber.analyzeImageWithGemini) — provider primário
 *   ✅ OpenRouter — 8 modelos de visão GRATUITOS. Testados com frame real:
 *        openrouter/free                     ~2,5s
 *        google/gemma-4-31b-it:free          ~4,6s
 *        nvidia/nemotron-nano-12b-v2-vl:free ~9,3s
 *      (não há modelo de GERAÇÃO de imagem gratuito no OpenRouter — só visão.)
 *
 * ⚠️ ARMADILHA MEDIDA: o nemotron ALUCINOU sobreposições que não existiam no frame
 * ("etiqueta do criador", "botões"), enquanto gemma e openrouter/free corretamente
 * devolveram lista vazia. Um modelo instruído a "listar a UI" inventa UI se não
 * houver. Por isso o prompt precisa autorizar explicitamente a lista vazia e o
 * roteador prefere os modelos que não confabulam.
 */

const fs = require('fs');
const path = require('path');

const SQUAD_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SQUAD_ROOT, '..', '..');

/**
 * Modelos de visão gratuitos do OpenRouter, em ordem de preferência.
 * A ordem NÃO é por velocidade: é por confiabilidade medida contra alucinação.
 * O nemotron é o mais lento E o que confabulou — fica por último de propósito.
 */
const OPENROUTER_VISION_MODELS = [
    'openrouter/free',
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'nvidia/nemotron-nano-12b-v2-vl:free',
];

function mimeFor(file) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    return 'image/jpeg';
}

/**
 * Chama um modelo de visão do OpenRouter.
 * @returns {{ok: boolean, text?: string, reason?: string, model?: string}}
 */
async function callOpenRouter(imagePath, prompt, model, timeoutMs = 90000) {
    const key = String(process.env.OPENROUTER_API_KEY || '').trim();
    if (!key) return { ok: false, reason: 'OPENROUTER_API_KEY ausente' };

    const b64 = fs.readFileSync(imagePath).toString('base64');
    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/SynkraAI/aiox',
                'X-Title': 'Virals Farming Squad',
            },
            body: JSON.stringify({
                model,
                max_tokens: 1200,
                temperature: 0.2, // descrição visual quer fidelidade, não criatividade
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: `data:${mimeFor(imagePath)};base64,${b64}` } },
                        ],
                    },
                ],
            }),
            signal: AbortSignal.timeout(timeoutMs),
        });

        if (res.status === 429) return { ok: false, reason: 'rate limit (429)', quotaExceeded: true, model };
        const json = await res.json();
        const text = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
        if (!text) {
            const err = (json && json.error && (json.error.message || json.error)) || `status ${res.status}`;
            return { ok: false, reason: String(err).slice(0, 200), model };
        }
        return { ok: true, text, model };
    } catch (e) {
        return { ok: false, reason: e.message.slice(0, 160), model };
    }
}

/**
 * Cascata completa: Gemini → modelos gratuitos do OpenRouter.
 *
 * @param {object} opts
 * @param {string} opts.imagePath
 * @param {string} opts.prompt
 * @param {object} [opts.transcriber]  instância de LocalTranscriber (provider primário)
 * @param {boolean} [opts.skipGemini]  força começar pelo OpenRouter
 * @returns {{ok, text?, provider?, attempts: Array}}
 */
async function analyze({ imagePath, prompt, transcriber, skipGemini = false }) {
    const attempts = [];

    // 1 — Gemini (primário). Reusa o LocalTranscriber do ETL, não reimplementa.
    if (!skipGemini && transcriber && typeof transcriber.analyzeImageWithGemini === 'function') {
        try {
            const raw = await transcriber.analyzeImageWithGemini(imagePath, prompt);
            attempts.push({ provider: 'gemini', ok: !!raw, reason: raw ? null : 'resposta vazia' });
            if (raw) return { ok: true, text: raw, provider: 'gemini', attempts };
        } catch (e) {
            attempts.push({ provider: 'gemini', ok: false, reason: e.message.slice(0, 160) });
        }
    }

    // 2 — OpenRouter gratuito. Cota do Gemini estourada não trava a F3.
    for (const model of OPENROUTER_VISION_MODELS) {
        const r = await callOpenRouter(imagePath, prompt, model);
        attempts.push({ provider: `openrouter:${model}`, ok: r.ok, reason: r.reason || null });
        if (r.ok) return { ok: true, text: r.text, provider: `openrouter:${model}`, attempts };
    }

    return {
        ok: false,
        attempts,
        reason: attempts.map((a) => `${a.provider}: ${a.reason}`).join(' | ') || 'nenhum provider de visão disponível',
    };
}

/** Diagnóstico: quais providers de visão estão utilizáveis agora. */
async function status() {
    const out = [];
    out.push({
        provider: 'gemini',
        available: !!String(process.env.GEMINI_API_KEY || '').trim(),
        note: 'via LocalTranscriber do services/ETL',
    });
    out.push({
        provider: 'openrouter',
        available: !!String(process.env.OPENROUTER_API_KEY || '').trim(),
        note: `${OPENROUTER_VISION_MODELS.length} modelos gratuitos configurados`,
    });
    return out;
}

module.exports = { analyze, callOpenRouter, status, OPENROUTER_VISION_MODELS, REPO_ROOT };
