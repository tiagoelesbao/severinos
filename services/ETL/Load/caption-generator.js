/**
 * Caption Generator — gera a legenda pronta pra postar (+ hashtags) do
 * criativo FINAL, pro custom field "Descrição & Hashtags" (Design e Criação
 * / Agendamento). Pedido do founder 2026-08-17: "modelado a partir do
 * criativo original que o metadata já traz a descrição usada no post
 * original" — a legenda do benchmark original é referência de ESTILO/volume
 * de hashtag, não texto a copiar; o conteúdo vem SEMPRE da copy final já
 * aprovada (content_data recast), nunca inventa claim novo (No Invention).
 *
 * Mesmo padrão de chamada Gemini já usado no repo (local-transcriber.js):
 * REST direto (não o SDK @google/generative-ai), GEMINI_API_KEY,
 * fallback gemini-2.5-flash -> gemini-2.5-flash-lite.
 */

const MODEL_CHAIN = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

/** Pura — monta o prompt. Testável sem rede. */
function buildCaptionPrompt({ clientName, finalCopyText, originalDescription }) {
    return [
        `Você escreve a legenda de Instagram pronta pra postar para "${clientName}".`,
        '',
        'REGRA MAIS IMPORTANTE: use SÓ o conteúdo abaixo em "COPY FINAL DO CRIATIVO" — não',
        'invente números, resultados, nomes ou promessas que não estão lá. A legenda',
        'resume/reforça essa copy, não adiciona informação nova.',
        '',
        '=== COPY FINAL DO CRIATIVO (fonte de verdade) ===',
        finalCopyText || '(sem copy — não gerar legenda sem isso)',
        '',
        '=== LEGENDA DO POST ORIGINAL (só referência de ESTILO e volume de hashtag — não copiar o conteúdo) ===',
        originalDescription || '(sem legenda original capturada)',
        '',
        'Devolva SÓ a legenda final (texto corrido + hashtags no final), sem explicação,',
        'sem markdown, sem aspas envolvendo o texto todo.',
    ].join('\n');
}

/** Pura — limpa a resposta crua do modelo. Testável sem rede. */
function parseCaptionResponse(rawText) {
    if (!rawText) return null;
    return rawText.trim().replace(/^["']|["']$/g, '').trim() || null;
}

async function callGemini(prompt) {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) throw new Error('GEMINI_API_KEY ausente no .env');

    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
    };

    for (const model of MODEL_CHAIN) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await resp.json();
            if (resp.ok && data.candidates && data.candidates[0]) {
                const text = (data.candidates[0].content?.parts || []).map((p) => p.text).filter(Boolean).join('\n');
                if (text) return text;
            }
            console.warn(`[CaptionGenerator] ${model} falhou: ${data.error?.message || resp.statusText}`);
        } catch (e) {
            console.warn(`[CaptionGenerator] ${model} exception: ${e.message}`);
        }
    }
    return null;
}

/** finalCopyText: string já montada (headline/body por slide, joined).
 * originalDescription: Benchmark.json.description do criativo de referência. */
async function generateCaption({ clientName, finalCopyText, originalDescription }) {
    const prompt = buildCaptionPrompt({ clientName, finalCopyText, originalDescription });
    const raw = await callGemini(prompt);
    return parseCaptionResponse(raw);
}

module.exports = { buildCaptionPrompt, parseCaptionResponse, generateCaption };
