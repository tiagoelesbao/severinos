/**
 * Lote Builder — lógica pura por trás de "puxar a sondagem do dia dos rankings
 * do daily-monitor e virar um Lote de Conteúdos no ClickUp" (Máquina de Idéias).
 *
 * Separado do orquestrador (create-lote-de-conteudos.js) pelo mesmo motivo de
 * ranking-builders.js: parsing de markdown e inferência de tipo são puros e
 * testáveis sem falar com a API do ClickUp.
 */

/** IDs reais dos "Tipos de Tarefa" (custom_item_id) configurados em Máquina de
 * Idéias — descobertos manualmente via UI (a API pública não lista nome↔id,
 * só devolve o número em tasks existentes). Se o fundador criar/renomear tipo
 * na UI, este mapa precisa ser atualizado à mão. */
const TASK_TYPE_IDS = {
    lote: 1007,        // Planejamento
    videoCurto: 1005,  // Vídeo Curto
    videoLongo: 1006,  // Vídeo Longo
    carrossel: 1020,   // Carrocel
    post: 1021,        // Post
    postDeTexto: 1022, // Post de Texto
};

/**
 * Extrai as linhas MARCADAS (coluna "Sondagem" com [x]) de uma tabela de
 * ranking gerada por ranking-builders.js. Aceita [x] ou [X], ignora [ ].
 * Cada linha vira { rank, url, platform, identifier, description, raw } —
 * `raw` guarda a linha inteira pra extrair colunas específicas de cada tipo
 * de ranking (Norm/Viral Score no geral, Fit/Pilar/Por quê no de confluência).
 * `description` é a coluna "Descrição" — sempre a célula logo APÓS o
 * identificador (@handle) nos dois formatos de tabela, então acha pela
 * posição relativa ao identifier, não por índice fixo (os dois rankings têm
 * número de colunas diferente antes dele).
 */
function parseCheckedRows(markdown) {
    const lines = (markdown || '').split('\n');
    const rows = [];
    for (const line of lines) {
        if (!line.startsWith('| [')) continue;
        const checked = /^\|\s*\[[xX]\]/.test(line);
        if (!checked) continue;
        const cells = line.split('|').map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        // cells[0] = "[x]"; cells[1] = rank; o resto varia por tipo de ranking.
        const urlMatch = line.match(/\[Ver\]\((https?:\/\/[^)]+)\)/);
        const platform = cells.find((c) => /^(instagram|youtube|tiktok)$/i.test(c)) || null;
        const identifierIdx = cells.findIndex((c) => c.startsWith('@'));
        const identifier = identifierIdx >= 0 ? cells[identifierIdx] : null;
        const description = identifierIdx >= 0 ? cells[identifierIdx + 1] : null;
        rows.push({
            rank: Number(cells[1]) || null,
            url: urlMatch ? urlMatch[1] : null,
            platform: platform ? platform.toLowerCase() : null,
            identifier,
            description: description && description !== '—' ? description : null,
            raw: line,
        });
    }
    return rows;
}

/**
 * Deduplica por URL — o mesmo post pode aparecer marcado no ranking geral E
 * no de confluência (fit). Mantém a primeira ocorrência (geral tem prioridade
 * por ser o primeiro arquivo processado).
 */
function dedupeByUrl(rows) {
    const seen = new Set();
    const out = [];
    for (const r of rows) {
        const key = r.url || `${r.platform}:${r.identifier}:${r.rank}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
    }
    return out;
}

/**
 * Infere o Tipo de Tarefa (formato) a partir do padrão de URL — sinal barato
 * disponível no ranking, ANTES do benchmark rodar (que classificaria com
 * certeza via ContentClassifier). Ambíguo entre Post e Carrossel — o
 * benchmark confirma depois; aqui é só o palpite inicial que já deixa a
 * subtask no formato mais provável.
 *
 * @returns {{ typeId: number, typeName: string, confident: boolean }}
 */
function inferTaskType(url, platform) {
    const u = (url || '').toLowerCase();
    const plat = (platform || '').toLowerCase();

    if (plat === 'tiktok') return { typeId: TASK_TYPE_IDS.videoCurto, typeName: 'Vídeo Curto', confident: true };

    if (u.includes('/reel/') || u.includes('/reels/')) {
        return { typeId: TASK_TYPE_IDS.videoCurto, typeName: 'Vídeo Curto', confident: true };
    }
    if (u.includes('/shorts/')) {
        return { typeId: TASK_TYPE_IDS.videoCurto, typeName: 'Vídeo Curto', confident: true };
    }
    if (u.includes('/tv/') || u.includes('watch?v=')) {
        return { typeId: TASK_TYPE_IDS.videoLongo, typeName: 'Vídeo Longo', confident: true };
    }
    if (u.includes('/p/')) {
        // Instagram /p/ = post estático — pode ser imagem única OU carrossel,
        // a URL sozinha não distingue. Palpite: Post (mais comum); flag pro
        // benchmark/humano confirmar se for carrossel de verdade.
        return { typeId: TASK_TYPE_IDS.post, typeName: 'Post', confident: false };
    }
    return { typeId: TASK_TYPE_IDS.post, typeName: 'Post', confident: false };
}

/**
 * Reconcilia o Tipo de Tarefa com a classificação REAL do ContentClassifier
 * (Benchmark.json, gerado pelo creative-benchmark) — mais confiável que o
 * palpite por URL do inferTaskType, principalmente pro caso Post vs Carrossel
 * que a URL sozinha não resolve. Retorna null se o benchmarkType não mapeia
 * pra nenhum tipo conhecido (não reconcilia, mantém o palpite anterior).
 *
 * @returns {{ typeId: number, typeName: string } | null}
 */
function reconcileTaskType(benchmarkType) {
    const map = {
        'video-short': { typeId: TASK_TYPE_IDS.videoCurto, typeName: 'Vídeo Curto' },
        'video-long': { typeId: TASK_TYPE_IDS.videoLongo, typeName: 'Vídeo Longo' },
        carousel: { typeId: TASK_TYPE_IDS.carrossel, typeName: 'Carrocel' },
        'image-single': { typeId: TASK_TYPE_IDS.post, typeName: 'Post' },
    };
    return map[benchmarkType] || null;
}

/**
 * Próximo número de Lote — sequencial contínuo cruzando QUALQUER lista onde
 * um Lote já apareça (Máquina de Idéias + Planejamentos & Cronogramas, e
 * futuras listas do funil). Reconhece tanto o nome legado ("Lote de
 * Conteúdos NN", Lotes 01-03) quanto o atual ("Lote LNN - data", 2026-08-17+
 * — calibração do founder: tag identificadora + data no nome). Recebe os
 * NOMES já existentes (de qualquer lista), devolve o próximo número com 2
 * dígitos.
 */
function nextLoteNumber(existingTaskNames) {
    let max = 0;
    for (const name of existingTaskNames || []) {
        const m = /^Lote(?:\s+de\s+Conteúdos)?\s+L?(\d+)/i.exec(name || '');
        if (m) max = Math.max(max, Number(m[1]));
    }
    return String(max + 1).padStart(2, '0');
}

/** Nome do Lote: tag identificadora (Lnn) + data de geração — pedido do
 * founder 2026-08-17 pra achar o Lote certo rápido em meio a vários. */
function buildLoteName(loteNumber, date) {
    return `Lote L${loteNumber} - ${date}`;
}

/** Hash curto (6 hex) da URL — MESMO algoritmo usado por
 * run-creative-benchmark.js pro sufixo da pasta de benchmark
 * ({rank}-{slug}-{hash}). Usar aqui também faz o identificador da subtask
 * no ClickUp bater com o nome da pasta local do criativo. */
function urlHash(url) {
    return require('crypto').createHash('md5').update(url || '').digest('hex').substring(0, 6);
}

/** Nome da subtask (conteúdo): identificador único + @handle + descrição
 * pontual — pedido do founder 2026-08-17 porque "@handle · plataforma"
 * sozinho não dizia nada sobre QUAL criativo era, só de quem/onde. */
function buildSubtaskName(row) {
    const hash = urlHash(row.url);
    const desc = row.description ? row.description.slice(0, 45) : '(sem descrição capturada)';
    return `${hash} · ${row.identifier || '?'} · ${desc}`;
}

module.exports = {
    TASK_TYPE_IDS, parseCheckedRows, dedupeByUrl, inferTaskType, reconcileTaskType,
    nextLoteNumber, buildLoteName, buildSubtaskName, urlHash,
};
