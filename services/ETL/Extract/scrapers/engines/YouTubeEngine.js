const BaseEngine = require('./BaseEngine');
const { execSync } = require('child_process');

class YouTubeEngine extends BaseEngine {
    async discover(profileUrl, identifier) {
        const results = [];
        this.logDiagnostic(`   🚀 YouTube: Iniciando Discovery via Metadata Sniper (yt-dlp)...`);

        try {
            // Normalizar URL para garantir que pegamos os vídeos mais recentes
            const targetUrl = profileUrl.includes('/videos') ? profileUrl : profileUrl.replace(/\/$/, '') + '/videos';
            const command = `"${this.parent.binPath}" --flat-playlist --print-json --playlist-items 1-15 ${targetUrl}`;

            const output = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            const lines = output.trim().split('\n');

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    let pubDate = data.timestamp ? new Date(data.timestamp * 1000) : null;

                    if (!pubDate && data.upload_date) {
                        const y = data.upload_date.substring(0, 4);
                        const m = data.upload_date.substring(4, 6);
                        const d = data.upload_date.substring(6, 8);
                        pubDate = new Date(y, parseInt(m) - 1, d);
                    }

                    // DEEP DISCOVERY FALLBACK: Se data ainda for NULA, faz inspeção profunda
                    if (!pubDate) {
                        this.logDiagnostic(`      🔍 YouTube: Data NULA para [${data.id}]. Iniciando Inspeção Profunda...`);
                        try {
                            const deepCmd = `"${this.parent.binPath}" --print upload_date --playlist-items 1 https://www.youtube.com/watch?v=${data.id}`;
                            const deepDateRaw = execSync(deepCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
                            if (deepDateRaw && deepDateRaw.length === 8) {
                                const y = deepDateRaw.substring(0, 4);
                                const m = deepDateRaw.substring(4, 6);
                                const d = deepDateRaw.substring(6, 8);
                                pubDate = new Date(y, parseInt(m) - 1, d);
                            }
                        } catch (e) {
                            this.logDiagnostic(`         ❌ Falha na inspeção profunda: ${e.message}`);
                        }
                    }

                    const isNew = this.isWithinWindow(pubDate);
                    const dateLog = pubDate ? pubDate.toISOString().split('T')[0] : 'NULA';
                    this.logDiagnostic(`      📄 Vídeo [${data.id}]: Data="${dateLog}" -> (${isNew ? 'NOVO' : 'ANTIGO'})`);

                    if (isNew) {
                        // ENRICHMENT PASS: --flat-playlist não retorna like_count/comment_count.
                        // Para vídeos qualificados, fazemos uma chamada single-video sem flat-playlist.
                        let likes = 0;
                        let comments = 0;
                        let views = data.view_count || 0;

                        try {
                            const enrichCmd = `"${this.parent.binPath}" --print "%(view_count)s|%(like_count)s|%(comment_count)s" --skip-download https://www.youtube.com/watch?v=${data.id}`;
                            const enriched = execSync(enrichCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
                            const [vRaw, lRaw, cRaw] = enriched.split('|');
                            const v = parseInt(vRaw, 10);
                            const l = parseInt(lRaw, 10);
                            const c = parseInt(cRaw, 10);
                            if (!isNaN(v)) views = v;
                            if (!isNaN(l)) likes = l;
                            if (!isNaN(c)) comments = c;
                            this.logDiagnostic(`         💎 Enriquecido [${data.id}]: views=${views} likes=${likes} comments=${comments}`);
                        } catch (e) {
                            this.logDiagnostic(`         ⚠️ Enrichment falhou para [${data.id}]: ${e.message}`);
                        }

                        const metrics = { likes, comments, views };
                        const score = this.calculateScore(metrics);
                        results.push({
                            url: `https://www.youtube.com/watch?v=${data.id}`,
                            platform: 'youtube',
                            identifier,
                            metrics,
                            score,
                            pubDate,
                            title: data.title,
                            text: data.title || ''  // VEX-14: título é o sinal textual do YT para o fit-scorer
                        });
                    }
                } catch (e) {
                    this.logDiagnostic(`      ❌ YouTube: Erro ao processar linha de metadados: ${e.message}`);
                }
            }
        } catch (e) {
            this.logDiagnostic(`   ❌ YouTube ERRO no Discovery: ${e.message}`);
        }

        this.logDiagnostic(`   ✨ YouTube: ${results.length} vídeos qualificados via Metadata Sniper.`);
        return results;
    }
}

module.exports = YouTubeEngine;
