/**
 * Re-ETL para os 3 links que capturaram tela de erro
 * Usa o scraper atualizado com sessão autenticada
 */

const path = require('path');
const fs = require('fs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ETL_SERVICE = path.join(PROJECT_ROOT, 'services', 'ETL');
const OUTPUT_BASE = path.join(ETL_SERVICE, 'outputs');

const PROBLEM_LINKS = [
    {
        url: 'https://www.instagram.com/heldersorteios/reel/DW6heWxk3Qu/',
        index: 1,
        folder: 'Conteudo-Instagram-133ef0-o-que-voce-faria-com-essa-grana',
        type: 'reel'
    },
    {
        url: 'https://www.instagram.com/brayambraz/reel/DW7RwRFEexB/',
        index: 6,
        folder: 'Conteudo-Instagram-11082d-mais-um-lancamento-e-dessa-vez-ranger-raptor-na-cor-laranja',
        type: 'reel'
    },
    {
        url: 'https://www.instagram.com/iflavinh0/reel/DW7AJvUCbtS/',
        index: 11,
        folder: 'Conteudo-Instagram-a792cc-liberei-poucos-numeros-resultado-sabado-domingo-te-entreg',
        type: 'reel'
    }
];

async function reEtlLink(linkInfo) {
    const { url, index, folder, type } = linkInfo;
    const contentDir = path.join(OUTPUT_BASE, folder);

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🔄 Re-ETL [${index}/3] ${url}`);
    console.log(`📂 Pasta: ${folder}`);
    console.log(`${'═'.repeat(60)}`);

    const InstagramScraper = require(path.join(PROJECT_ROOT, 'services', 'ETL', 'Extract', 'scrapers', 'instagram'));
    const scraper = new InstagramScraper();
    await scraper.init();

    try {
        const result = await scraper.extract(url, path.join(PROJECT_ROOT, '.aiox', 'tmp', 'downloads'));

        if (result.status === 'success' && result.images && result.images.length > 0) {
            console.log(`✅ Conteúdo capturado com sucesso!`);
            console.log(`   📸 Imagens: ${result.images.length}`);
            console.log(`   📝 Descrição: ${(result.description || '').substring(0, 80)}...`);

            // Limpar pasta de erro anterior
            if (fs.existsSync(contentDir)) {
                const oldFiles = fs.readdirSync(contentDir);
                oldFiles.forEach(f => {
                    if (f === 'Screenshots' || f === 'Transcrição.md') {
                        const p = path.join(contentDir, f);
                        if (fs.statSync(p).isDirectory()) {
                            fs.rmSync(p, { recursive: true, force: true });
                        } else {
                            fs.unlinkSync(p);
                        }
                    }
                });
            }

            // Criar pasta de screenshots
            const screenshotsDir = path.join(contentDir, 'Screenshots');
            if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

            // Mover screenshots
            for (const img of result.images) {
                const dest = path.join(screenshotsDir, `screenshot_${Date.now()}.jpg`);
                if (fs.existsSync(img)) {
                    fs.renameSync(img, dest);
                    console.log(`   🖼️  Screenshot: ${path.basename(dest)}`);
                }
            }

            // Salvar conteúdo
            const transcriptPath = path.join(contentDir, 'Transcrição.md');
            const transcript = `# Transcrição — ${folder}\n\n## Conteúdo Visual\n\n${result.description || 'Sem descrição'}\n\n## Análise Visual\n\n_Conteúdo capturado via sessão autenticada._`;
            fs.writeFileSync(transcriptPath, transcript);

            // Atualizar Benchmark.json
            const benchPath = path.join(contentDir, 'Benchmark.json');
            const bench = fs.existsSync(benchPath) ? JSON.parse(fs.readFileSync(benchPath, 'utf8')) : {};
            Object.assign(bench, {
                status: 'full_assets_retried',
                title: result.title || folder,
                description: result.description || '',
                author: result.author || 'Unknown',
                retry_date: new Date().toISOString(),
                retry_session: 'authenticated'
            });
            fs.writeFileSync(benchPath, JSON.stringify(bench, null, 2));

            console.log(`✅ ${folder} atualizado com sucesso!`);
            return { success: true, folder };
        } else {
            console.log(`⚠️ Conteúdo ainda indisponível: ${result.status}`);
            return { success: false, folder, error: result.status };
        }
    } catch (err) {
        console.error(`❌ Erro no re-ETL: ${err.message}`);
        return { success: false, folder, error: err.message };
    } finally {
        await scraper.close();
    }
}

async function run() {
    console.log(`\n🔧 [Re-ETL] Reprocessando 3 links com sessão autenticada...`);

    const results = { total: 3, success: 0, failed: 0, details: [] };

    for (const link of PROBLEM_LINKS) {
        const result = await reEtlLink(link);
        if (result.success) {
            results.success++;
        } else {
            results.failed++;
        }
        results.details.push(result);

        // Cooldown
        if (link !== PROBLEM_LINKS[PROBLEM_LINKS.length - 1]) {
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🏁 Re-ETL Concluído!`);
    console.log(`   ✅ Sucesso: ${results.success}/${results.total}`);
    console.log(`   ❌ Falhas: ${results.failed}/${results.total}`);
    console.log(`${'═'.repeat(60)}`);

    return results;
}

if (require.main === module) {
    run().catch(err => {
        console.error(`❌ Re-ETL crashed: ${err.message}`);
        process.exit(1);
    });
}

module.exports = { run };
