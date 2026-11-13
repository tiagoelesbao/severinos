const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * YouTube ETL: IFR Video Processor
 * Orquestrado pelo @marketing-chief.
 */

const VIDEO_PATH = path.resolve('.aiox/tmp/downloads/Índice Força Relativa (IFR) no Gráfico - Indicador Programação Profitchart.mp4');
const OUTPUT_DIR = path.resolve('assets/ETL_Youtube_IFR');
const WHISPER_PATH = 'C:\\Users\\Pichau\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\whisper.exe';
const FRAME_INTERVAL = 10;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
    console.log(`\n🚀 PROCESSANDO VÍDEO YOUTUBE: IFR NO GRÁFICO`);

    // 1. ÁUDIO
    const audioPath = path.join(OUTPUT_DIR, 'audio.mp3');
    console.log(`[1/3] Extraindo áudio...`);
    execSync(`ffmpeg -i "${VIDEO_PATH}" -b:a 64k -map a -ar 16000 -ac 1 "${audioPath}" -y`, { stdio: 'ignore' });

    // 2. SCREENSHOTS
    const screenDir = path.join(OUTPUT_DIR, 'Screenshots');
    if (!fs.existsSync(screenDir)) fs.mkdirSync(screenDir, { recursive: true });
    console.log(`[2/3] Gerando frames sincronizados...`);
    const tempPattern = path.join(screenDir, 'f_%04d.jpg');
    execSync(`ffmpeg -i "${VIDEO_PATH}" -vf "fps=1/${FRAME_INTERVAL},scale=854:-1" "${tempPattern}" -y`, { stdio: 'ignore' });
    
    const frames = fs.readdirSync(screenDir).filter(f => f.startsWith('f_')).sort();
    frames.forEach((file, index) => {
        const s = index * FRAME_INTERVAL;
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        const tsName = `${String(h).padStart(2, '0')}h-${String(m).padStart(2, '0')}m-${String(sec).padStart(2, '0')}s.jpg`;
        fs.renameSync(path.join(screenDir, file), path.join(screenDir, tsName));
    });

    // 3. WHISPER
    console.log(`[3/3] Transcrevendo via Whisper Base...`);
    execSync(`"${WHISPER_PATH}" "${audioPath}" --model base --language pt --output_dir "${OUTPUT_DIR}" --output_format json`, { stdio: 'inherit' });

    const jsonPath = path.join(OUTPUT_DIR, 'audio.json');
    if (fs.existsSync(jsonPath)) {
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        let dialogue = "# Transcrição: IFR no Gráfico - Profitchart\n\n";
        data.segments.forEach(seg => {
            const start = seg.start;
            const h = Math.floor(start / 3600);
            const m = Math.floor((start % 3600) / 60);
            const s = Math.floor(start % 60);
            const timeStr = `[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`;
            dialogue += `${timeStr} ${seg.text.trim()}\n`;
        });
        fs.writeFileSync(path.join(OUTPUT_DIR, 'CONTEUDO_ESTRUTURADO.txt'), dialogue, 'utf8');
        console.log(`\n✅ SUCESSO! Resultados em: ${OUTPUT_DIR}`);
    }
}

main().catch(err => console.error(err));
