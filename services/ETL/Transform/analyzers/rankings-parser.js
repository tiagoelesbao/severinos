const fs = require('fs');
const path = require('path');

/**
 * Parseia os arquivos de ranking gerados pelo *daily-monitor e extrai os top N URLs por plataforma.
 *
 * Formato esperado em cada ranking .md:
 *  | # | Criador | Viral Score | Likes | Comentários | Views | Link |
 *  | :- | :--- | ---: | ---: | ---: | ---: | :--- |
 *  | 1 | @user | **123** | 100 | 5 | 0 | [Ver Post](https://...) |
 */
function parseRankingFile(filePath, topN = 10) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');

    // Captura linhas de tabela com formato opcional [x] | n | criador | score | ... | [Ver Post](URL) |
    const rowRe = /\|\s*(?:\[([ x])\]\s*\|\s*)?(\d+)\s*\|\s*([^|]+?)\s*\|\s*\*\*([^*]+)\*\*\s*\|.*?\[Ver Post\]\((https?:\/\/[^)]+)\)\s*\|/g;
    const rows = [];
    let m;
    while ((m = rowRe.exec(content)) !== null) {
        const checked = m[1]; // 'x', ' ' ou undefined
        const rank = parseInt(m[2], 10);
        const creator = m[3].trim();
        const score = m[4].trim();
        const url = m[5].trim();
        
        // Se houver checkbox, só inclui se estiver marcado com 'x'.
        // Se não houver checkbox (legacy), inclui sempre.
        if (checked === undefined || checked === 'x') {
            rows.push({ rank, creator, score, url });
        }
        
        if (rows.length >= topN) break;
    }
    return rows;
}

function parseAllRankings(dailyMonitorDir, topN = 10) {
    const date = path.basename(dailyMonitorDir);
    const platforms = ['instagram', 'tiktok', 'youtube', 'linkedin'];
    const out = {};
    for (const plat of platforms) {
        const f = path.join(dailyMonitorDir, `${plat}-ranking-${date}.md`);
        const rows = parseRankingFile(f, topN);
        if (rows.length > 0) out[plat] = rows;
    }
    return out;
}

module.exports = { parseRankingFile, parseAllRankings };

if (require.main === module) {
    const dir = process.argv[2];
    const topN = parseInt(process.argv[3], 10) || 10;
    if (!dir) {
        console.error('Usage: node rankings-parser.js <daily-monitoring-dir> [topN]');
        process.exit(1);
    }
    const all = parseAllRankings(path.resolve(dir), topN);
    console.log(JSON.stringify(all, null, 2));
}
