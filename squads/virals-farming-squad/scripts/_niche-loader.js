/**
 * _niche-loader.js — Carregador de nicho e config do Virals Farming Squad.
 *
 * Responsável por resolver o YAML do nicho, fundir a nota de corte do nicho sobre
 * a global e expor helpers de sessão. Compartilhado por farm-monitor.js e farm-benchmark.js.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const SQUAD_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SQUAD_ROOT, '..', '..');
const NICHES_DIR = path.join(SQUAD_ROOT, 'data', 'niches');
const CONFIG_DIR = path.join(SQUAD_ROOT, 'config');
const OUTPUT_ROOT = path.join(REPO_ROOT, 'workspaces', 'businesses', 'virals', 'farming');

function parseArgs(argv) {
    return argv.slice(2).reduce((acc, arg) => {
        const withValue = arg.match(/^--([^=]+)=(.*)$/);
        if (withValue) {
            acc[withValue[1]] = withValue[2];
            return acc;
        }
        const flag = arg.match(/^--([^=]+)$/);
        if (flag) acc[flag[1]] = true;
        return acc;
    }, {});
}

/**
 * Data de HOJE no fuso LOCAL — nunca em UTC.
 *
 * `toISOString()` devolve UTC. No Brasil (UTC-3) isso significa que, a partir das 21h
 * locais, o "hoje" do pipeline vira o dia seguinte: uma sessão aberta às 20h e retomada
 * às 22h passa a ser procurada numa pasta de outra data e o script morre com "Sessão não
 * encontrada" — foi exatamente o que aconteceu no lote de 234 packs, no meio da geração
 * de imagens.
 *
 * O operador pensa em "hoje" no relógio dele, e a pasta da sessão carrega essa data.
 * Trocar de dia no meio de um turno de trabalho é o comportamento errado.
 */
function todayISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

function listNiches() {
    if (!fs.existsSync(NICHES_DIR)) return [];
    return fs
        .readdirSync(NICHES_DIR)
        .filter((f) => f.endsWith('.yaml'))
        .map((f) => path.basename(f, '.yaml'));
}

function loadScoringConfig() {
    const file = path.join(CONFIG_DIR, 'scoring-weights.yaml');
    return yaml.load(fs.readFileSync(file, 'utf8'));
}

/**
 * Carrega o nicho e funde `cutoff` do nicho sobre o global.
 * O nicho ganha sempre que declarar a chave — o global só preenche buracos.
 */
function loadNiche(nicheId) {
    const file = path.join(NICHES_DIR, `${nicheId}.yaml`);
    if (!fs.existsSync(file)) {
        const available = listNiches();
        throw new Error(
            `Nicho "${nicheId}" não encontrado em data/niches/. Disponíveis: ${available.join(', ') || '(nenhum)'}`
        );
    }

    const doc = yaml.load(fs.readFileSync(file, 'utf8'));
    const scoring = loadScoringConfig();

    return {
        id: doc.niche.id,
        label: doc.niche.label,
        icon: doc.niche.icon || '•',
        language: doc.niche.language || 'pt-BR',
        discovery: doc.discovery || {},
        modeling: doc.modeling || {},
        guardrails: doc.guardrails || {},
        cutoff: { ...scoring.cutoff, ...(doc.cutoff || {}) },
        ranking: scoring.ranking,
        signals: scoring.modelability_signals,
        viralScore: scoring.viral_score,
        sessionLimits: scoring.session_limits,
        _raw: doc,
    };
}

/** Viral Score — mesma fórmula do BaseEngine do ETL, para rankings comparáveis. */
function calculateViralScore(metrics, weights) {
    const w = weights || { views: 0.1, likes: 1, comments: 5 };
    return (
        (Number(metrics.views) || 0) * w.views +
        (Number(metrics.likes) || 0) * w.likes +
        (Number(metrics.comments) || 0) * w.comments
    );
}

function engagementRate(metrics) {
    const views = Number(metrics.views) || 0;
    if (views === 0) return 0;
    return ((Number(metrics.likes) || 0) + (Number(metrics.comments) || 0)) / views;
}

// --- Sinais de FORMATO: canal faceless x criador falando na câmera ---
//
// POR QUE ISSO EXISTE: a F1 ordenava por viral score e entregava padres e pastores
// gravando pregação — conteúdo excelente e IMPOSSÍVEL de modelar com IA. O sinal que
// separa os dois (`no_face_bonus`, `static_scene_bonus`) só é computado na F2, depois
// de baixar o vídeo. Caro demais para descobrir só ali que o candidato não serve.
//
// O nome do canal é o proxy mais barato e mais estável que existe nos metadados:
// canal faceless se chama pelo TEMA (@versiculodehoje23, @oracao_diaria77,
// @biblianarradacidmoreira); criador se chama pelo NOME ou pelo cargo
// (@prfernandobranco, @pe.manzotti, @padretiagomsc).
//
// É heurística, e ela ORDENA — não reprova sozinha. A palavra final continua sendo
// da F2, que vê o vídeo.

// Cargo por extenso: o nome costuma vir COLADO (@padretiagomsc, @freigilsonoficial),
// então não se pode exigir separador depois do cargo.
const CLERGY_LONG = /(^|[._-])(padre|pastor|pastora|frei|bispo|arcebispo|reverendo|diacono|diácono|missionari[oa]|apostol[oa]|apóstol[oa]|monsenhor|seminarista|conego|cônego)/i;
// Abreviações são curtas demais para valer sem separador: "pr" casaria "praise",
// "prosperidade", "prfernandobranco". Aqui o separador é obrigatório (@pe.manzotti).
const CLERGY_SHORT = /(^|[._-])(pe|pr|pra|pb)[._-]/i;
const CUTS_PATTERNS = /(cortes?|live|podcast|pregacao|pregação|culto|entrevista|sermao|sermão)/i;
// Termos de 2–3 letras ficam FORA: "fe" casa dentro de "fernando", "perfeito", "cafe"
// — foi assim que @prfernandobranco ganhou bônus de canal faceless na primeira versão.
const THEMATIC_PATTERNS = /(versiculo|versículo|oracao|oração|oracoes|orações|palavra|biblia|bíblia|salmo|evangelho|luzdivina|luz_|_luz|mensagem|promessa|reflexao|reflexão|contos|historia|história|caminho|deus|jesus|cristo|senhor|divina|divino|sagrad|celestial|espiritual|devocional|narrad|voz_|_voz|fedeus|fecrista)/i;
const SINGER_PATTERNS = /(louvor|adorador|adoradora|cantor|cantora|music|banda|ministerio|ministério|worship)/i;

// Legenda que denuncia presença do criador no vídeo (convite em 1ª pessoa).
const PRESENTER_SPEECH = /(deixa eu orar|ore comigo|ora[çc][ãa]o\s*.{0,3}\s*comigo|reze comigo|comigo hoje|me acompanhe|eu vou orar|estou aqui para|meus irm[ãa]os|inscreva-se|marque alguém|marca alguém|deixa nos coment)/i;

/**
 * Achata texto para comparação com vocabulário de nicho: minúsculas, SEM ACENTO e sem
 * separadores. Resolve as duas formas em que o mesmo termo aparece na prática.
 *
 * Sem isso, a poda temática cortou @deusnocotidiano1 e @oracao_diaria77 — dois canais
 * faceless legítimos — porque a legenda diz "ORAÇÃO DA NOITE" e o vocabulário do nicho
 * é "oracao". Mesma palavra, zero acertos. E "bom dia" nunca casaria "bomdia".
 */
function flattenForMatch(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

// Emoji e pontuação decorativa quebram os testes de legenda ("ORAÇÃO🙏COMIGO").
function normalizeCaption(text) {
    return String(text || '')
        .replace(/[^\p{L}\p{N}\s.,!?-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Estima se o item veio de um canal modelável (faceless) ou de um criador na câmera.
 * @returns {{score: number, reasons: string[]}}
 */
function facelessSignal(item, weights = {}) {
    const handle = String(item.handle || '').toLowerCase();
    const text = normalizeCaption(`${item.description || ''} ${item.title || ''}`);
    let score = 0;
    const reasons = [];

    if (CLERGY_LONG.test(handle) || CLERGY_SHORT.test(handle)) {
        score += weights.clergy_handle_penalty || 0;
        reasons.push('handle de clero (provável fala à câmera)');
    }
    if (CUTS_PATTERNS.test(handle)) {
        score += weights.cuts_handle_penalty || 0;
        reasons.push('handle de cortes/live (fala longa)');
    }
    if (SINGER_PATTERNS.test(handle)) {
        score += weights.singer_handle_penalty || 0;
        reasons.push('handle de música/louvor (performance)');
    }
    // Só conta como temático se não caiu em nenhuma das armadilhas acima — senão
    // "@cortesbispobrunol" ganharia bônus por conter "bispo"... e por conter "cortes".
    if (!reasons.length && THEMATIC_PATTERNS.test(handle)) {
        score += weights.thematic_handle_bonus || 0;
        reasons.push('handle temático (provável canal faceless)');
    }
    if (PRESENTER_SPEECH.test(text)) {
        score += weights.presenter_speech_penalty || 0;
        reasons.push('legenda de apresentador em 1ª pessoa');
    }

    return { score, reasons };
}

/**
 * Modelabilidade no estágio F1 — só o que os metadados permitem observar.
 * Os sinais que exigem o vídeo em disco (cortes, rosto, take único) entram na F2.
 */
function preliminaryModelability(item, signals) {
    const s = (signals && signals.metadata_stage) || {};
    let score = 0;
    const reasons = [];

    const dur = Number(item.duration) || 0;
    if (dur > 0 && dur <= 15) {
        score += s.short_duration_bonus || 0;
        reasons.push(`curto (${dur}s)`);
    } else if (dur > 15 && dur <= 30) {
        score += s.medium_duration_bonus || 0;
        reasons.push(`médio (${dur}s)`);
    } else if (dur > 45) {
        score += s.long_duration_penalty || 0;
        reasons.push(`longo (${dur}s)`);
    }

    if (item.track || item.album || item.artist) {
        score += s.music_audio_bonus || 0;
        reasons.push('trilha identificada');
    }

    if (item.description && item.description.length > 40) {
        score += s.text_hint_bonus || 0;
        reasons.push('legenda extensa');
    }

    // Formato do canal — o que decide se dá para modelar com IA de forma rápida.
    const fmt = facelessSignal(item, s);
    score += fmt.score;
    reasons.push(...fmt.reasons);

    return { score, reasons };
}

// Sinais de idioma. Deliberadamente pequenos e de alta precisão: o objetivo é
// separar conteúdo BR de conteúdo global, não classificar idioma de verdade.
const PT_SIGNALS = [
    // Diacríticos que praticamente só aparecem em pt (ã/õ/ç são o sinal mais forte).
    /[ãõçáéíóúâêôà]/i,
    // Stopwords e formas verbais curtas — cobrem legenda sem acento.
    /\b(que|não|nao|para|com|você|voce|meu|minha|seu|sua|uma|dos|das|pelo|pela|hoje|amém|amem|oração|oracao|deus|senhor|fé|santo|santa|padre|pastor|irmão|irma)\b/i,
];
const EN_SIGNALS = [
    /\b(the|this|that|with|from|what|when|have|been|they|your|about|would|could|should|these|those|there|because|people|video|watch)\b/i,
    /\b(i'm|it's|don't|can't|won't|you're|we're|they're)\b/i,
];

/**
 * Detecta se o texto é do idioma-alvo do nicho.
 *
 * REGRA DE OURO: ausência de sinal NÃO é rejeição. Legenda vazia, só emoji ou só
 * hashtag é comum e não diz nada sobre o idioma do vídeo — descartar por isso
 * repetiria o erro de tratar "sem dado" como "dado ruim". Só rejeita quando há
 * sinal do idioma ERRADO e nenhum do certo.
 *
 * POR QUE EXISTE: em 2026-07-27 a F1 do nicho religioso aprovou 30 itens e 10 eram
 * de fora do nicho — as três primeiras posições eram de uma conta em inglês, e
 * @theviewabc (o programa de TV americano) entrou três vezes com pauta política.
 * O buscador indexa tiktok.com no mundo todo; `gl=br` não basta.
 *
 * @returns {{ok: boolean, reason: string|null}}
 */
function matchesLanguage(text, expected = 'pt') {
    if (!String(expected || '').toLowerCase().startsWith('pt')) return { ok: true, reason: null };

    const t = String(text || '').trim();
    if (t.length < 12) return { ok: true, reason: null }; // sem dado suficiente — não pune

    const hasPT = PT_SIGNALS.some((re) => re.test(t));
    if (hasPT) return { ok: true, reason: null };

    const hasEN = EN_SIGNALS.some((re) => re.test(t));
    if (hasEN) return { ok: false, reason: 'idioma fora do nicho (sinal de inglês, nenhum de português)' };

    return { ok: true, reason: null }; // nenhum sinal reconhecido — passa
}

/**
 * Classifica HANDLES por idioma usando a evidência agregada de todos os posts dele.
 *
 * POR QUE NÃO BASTA O FILTRO POR ITEM: a conta que dominou o top 3 do religioso em
 * 2026-07-27 (@r3alism_0fficial) escrevia legendas curtas e neutras — "Very interesting",
 * "#spreadthegospel", "#greenscreenvideo". Nenhum sinal de português, nenhum de inglês.
 * Item a item, cada uma passa; a conta inteira é gringa.
 *
 * A evidência agregada resolve: um criador BR com 20 posts escreve português em ALGUM
 * deles. Zero sinal de pt em toda a conta é o próprio sinal.
 *
 * Também protege o caso inverso: @pablotinoco tem um post legendado só "Romanos 4:17"
 * — indistinguível isolado, mas a conta tem outros posts em português claro, então o
 * handle é validado e o post curto entra junto.
 *
 * @returns {{ok: Set<string>, rejected: Array<{handle, reason, samples}>}}
 */
function classifyHandlesByLanguage(items, expected = 'pt', minPostsForVerdict = 3) {
    const ok = new Set();
    const rejected = [];
    if (!String(expected || '').toLowerCase().startsWith('pt')) {
        items.forEach((i) => ok.add(i.handle));
        return { ok, rejected };
    }

    const byHandle = {};
    for (const it of items) {
        (byHandle[it.handle] = byHandle[it.handle] || []).push(it);
    }

    for (const [handle, posts] of Object.entries(byHandle)) {
        let pt = 0;
        let en = 0;
        let withText = 0;
        const samples = [];

        for (const p of posts) {
            const t = `${p.description || ''} ${p.title || ''}`.trim();
            if (t.length < 12) continue;
            withText++;
            if (PT_SIGNALS.some((re) => re.test(t))) pt++;
            else if (EN_SIGNALS.some((re) => re.test(t))) {
                en++;
                if (samples.length < 2) samples.push(t.slice(0, 60));
            } else if (samples.length < 2) samples.push(t.slice(0, 60));
        }

        if (pt > 0) { ok.add(handle); continue; }
        if (en > 0) {
            rejected.push({ handle, reason: `${en} post(s) com sinal de inglês e nenhum de português`, samples });
            continue;
        }
        // Nenhum sinal em nenhuma direção: só condena com massa de evidência.
        if (withText >= minPostsForVerdict) {
            rejected.push({ handle, reason: `${withText} post(s) com legenda e nenhum sinal de português`, samples });
            continue;
        }
        ok.add(handle); // pouca evidência — não pune
    }

    return { ok, rejected };
}

/**
 * Poda handles que não são DO TEMA do nicho — mesma arquitetura da poda por idioma,
 * pelo mesmo motivo: a evidência de uma conta inteira é confiável, a de um post não.
 *
 * POR QUE EXISTE: buscar frases devocionais trouxe @gshow (resumo de novela) e
 * @tntsportsbr (futebol) para as primeiras posições, porque são contas gigantes e o
 * ranking ordena por viral score. Nenhum filtro anterior os pegava — escrevem
 * português correto, publicam vídeos curtos, e o handle não denuncia formato.
 *
 * Um post devocional pode ter legenda só "🙏", e por isso o teste NÃO é por item:
 * é a conta que precisa provar pertencimento, em pelo menos `minHits` posts.
 *
 * @param {string[]} vocabulary termos do nicho (de discovery.hashtags/topic_keywords)
 * @returns {{ok: Set<string>, rejected: Array<{handle, reason, samples}>}}
 */
function classifyHandlesByTopic(items, vocabulary, minHits = 2) {
    const ok = new Set();
    const rejected = [];
    const vocab = (vocabulary || []).map(flattenForMatch).filter((v) => v.length >= 3);
    if (vocab.length === 0) {
        items.forEach((i) => ok.add(i.handle));
        return { ok, rejected };
    }

    // Casa o termo em qualquer forma: hashtag colada (#palavradedeus), palavra solta
    // ou dentro de composto. Vocabulário de nicho é específico o bastante para isso
    // não gerar falso positivo.
    const re = new RegExp(`(${vocab.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'i');

    const byHandle = {};
    for (const it of items) (byHandle[it.handle] = byHandle[it.handle] || []).push(it);

    for (const [handle, posts] of Object.entries(byHandle)) {
        let hits = 0;
        const samples = [];
        for (const p of posts) {
            const t = normalizeCaption(`${p.description || ''} ${p.title || ''}`);
            if (re.test(flattenForMatch(t))) hits++;
            else if (samples.length < 2 && t.length > 12) samples.push(t.slice(0, 60));
        }
        // O mínimo é proporcional: uma conta com 1 post capturado não pode ser cobrada
        // por 2 acertos. Sem isso a âncora @contosdeoracao — faceless e legítima — era
        // podada por aparecer pouco na amostra, enquanto o critério existe para derrubar
        // conta grande de OUTRO assunto, que sempre aparece muito.
        const withText = posts.filter((p) => normalizeCaption(`${p.description || ''} ${p.title || ''}`).length > 0).length;
        const required = Math.max(1, Math.min(minHits, withText));

        if (hits >= required) ok.add(handle);
        else rejected.push({
            handle,
            reason: `${hits} post(s) com vocabulário do nicho (exigido ${required}) em ${posts.length} capturado(s)`,
            samples,
        });
    }

    return { ok, rejected };
}

/** Slug seguro para nome de pasta/arquivo. */
function slug(value, max = 40) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, max) || 'item';
}

function sessionId(nicheId, date) {
    const hash = crypto.createHash('sha1').update(`${nicheId}-${date}-${Date.now()}`).digest('hex').slice(0, 6);
    return `${date}-${slug(nicheId)}-${hash}`;
}

/** Diretório da sessão. Reusa o existente quando `explicitId` é passado. */
function resolveSessionDir(nicheId, date, explicitId) {
    if (explicitId) {
        const dir = path.join(OUTPUT_ROOT, date, explicitId);
        if (!fs.existsSync(dir)) throw new Error(`Sessão "${explicitId}" não encontrada em ${dir}`);
        return { id: explicitId, dir };
    }
    const id = sessionId(nicheId, date);
    const dir = path.join(OUTPUT_ROOT, date, id);
    fs.mkdirSync(dir, { recursive: true });
    return { id, dir };
}

/** Localiza a sessão mais recente de um nicho numa data. */
function findLatestSession(nicheId, date) {
    const dayDir = path.join(OUTPUT_ROOT, date);
    if (!fs.existsSync(dayDir)) return null;
    const candidates = fs
        .readdirSync(dayDir)
        .filter((d) => d.includes(`-${slug(nicheId)}-`))
        .map((d) => ({ id: d, dir: path.join(dayDir, d), mtime: fs.statSync(path.join(dayDir, d)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
    return candidates[0] || null;
}

function fmtNumber(n) {
    return Number(n || 0).toLocaleString('pt-BR');
}

module.exports = {
    SQUAD_ROOT,
    REPO_ROOT,
    OUTPUT_ROOT,
    NICHES_DIR,
    parseArgs,
    todayISO,
    listNiches,
    loadNiche,
    loadScoringConfig,
    calculateViralScore,
    engagementRate,
    preliminaryModelability,
    facelessSignal,
    matchesLanguage,
    classifyHandlesByLanguage,
    classifyHandlesByTopic,
    slug,
    sessionId,
    resolveSessionDir,
    findLatestSession,
    fmtNumber,
};
