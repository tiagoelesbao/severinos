const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * TRADER ANALYSIS ETL: Calls Diretas (24 e 27/04)
 * Orquestrado para extrair a lógica de entradas e observações.
 */

const WHISPER_PATH = 'C:\\Users\\Pichau\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\whisper.exe';
const BASE_OUTPUT = path.resolve('assets/Trader_Analysis');
const FRAME_INTERVAL = 10;

const CALLS = [
    { 
        id: 'Dia_24', 
        path: path.resolve('.aiox/tmp/downloads/Gravação de Tela 2026-04-24 182704.mp4'),
        title: 'Análise Trader - 24 de Abril'
    }
];

async function processCall(call) {
    const callDir = path.join(BASE_OUTPUT, call.id);
    const screenDir = path.join(callDir, 'Screenshots');
    
    if (!fs.existsSync(screenDir)) fs.mkdirSync(screenDir, { recursive: true });

    console.log(`\n--- 💹 PROCESSANDO ANALISE: ${call.title} ---`);

    try {
        if (!fs.existsSync(call.path)) {
            throw new Error(`Arquivo não encontrado: ${call.path}`);
        }

        // 1. ÁUDIO
        const audioPath = path.join(callDir, 'audio.mp3');
        console.log(`[1/4] Extraindo áudio...`);
        execSync(`ffmpeg -i "${call.path}" -b:a 64k -map a -ar 16000 -ac 1 "${audioPath}" -y`, { stdio: 'ignore' });

        // 2. SCREENSHOTS COM TIMESTAMPS
        console.log(`[2/4] Gerando frames da análise...`);
        const tempPattern = path.join(screenDir, 'f_%04d.jpg');
        execSync(`ffmpeg -i "${call.path}" -vf "fps=1/${FRAME_INTERVAL},scale=854:-1" "${tempPattern}" -y`, { stdio: 'ignore' });
        
        const files = fs.readdirSync(screenDir).filter(f => f.startsWith('f_')).sort();
        files.forEach((f, i) => {
            const s = i * FRAME_INTERVAL;
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;
            const ts = `${String(h).padStart(2, '0')}h-${String(m).padStart(2, '0')}m-${String(sec).padStart(2, '0')}s.jpg`;
            fs.renameSync(path.join(screenDir, f), path.join(screenDir, ts));
        });

        // 3. WHISPER (Português)
        console.log(`[3/4] Transcrevendo observações (PT)...`);
        execSync(`"${WHISPER_PATH}" "${audioPath}" --model tiny --language pt --output_dir "${callDir}" --output_format json`, { stdio: 'inherit' });

        // 4. MARKDOWN ESTRUTURADO
        const jsonPath = path.join(callDir, 'audio.json');
        if (fs.existsSync(jsonPath)) {
            console.log(`[4/4] Gerando README_${call.id}.md...`);
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            let md = `# Análise Técnica: ${call.title}\n\n`;
            md += `> Arquivo: ${path.basename(call.path)}\n\n`;
            md += `## Diálogo e Insights\n\n`;

            data.segments.forEach(seg => {
                const start = seg.start;
                const h = Math.floor(start / 3600);
                const m = Math.floor((start % 3600) / 60);
                const s = Math.floor(start % 60);
                const timeStr = `**[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]**`;
                md += `### ${timeStr}\n${seg.text.trim()}\n\n---\n\n`;
            });

            fs.writeFileSync(path.join(callDir, `README_${call.id}.md`), md, 'utf8');
            console.log(`✨ OK: Análise ${call.id} pronta.`);
        }

    } catch (err) {
        console.error(`❌ ERRO NO PROCESSAMENTO (${call.id}):`, err.message);
    }
}

async function run() {
    if (!fs.existsSync(BASE_OUTPUT)) fs.mkdirSync(BASE_OUTPUT, { recursive: true });
    for (const call of CALLS) await processCall(call);
    console.log(`\n🏆 OPERAÇÃO ANALISE CONCLUÍDA.`);
}

run();
