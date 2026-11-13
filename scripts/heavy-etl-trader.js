const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * HEAVY ETL: Trader Call Processor
 * Desenvolvido pelo @marketing-chief para escala local.
 * 
 * Requisitos: FFmpeg e Whisper instalados no PATH.
 */

const VIDEO_PATH = path.resolve('assets/Gravando 2026-04-21 182127.mp4');
const OUTPUT_DIR = path.resolve('assets/ETL_TraderCall');
const WHISPER_PATH = 'C:\\Users\\Pichau\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\whisper.exe';
const FRAME_INTERVAL = 10; // Segundos entre cada print

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
    console.log(`\n🚀 INICIANDO MÁQUINA DE PROCESSAMENTO: ${path.basename(VIDEO_PATH)}`);

    // 1. EXTRAÇÃO DE ÁUDIO (Se não existir)
    const audioPath = path.join(OUTPUT_DIR, 'audio_call.mp3');
    if (!fs.existsSync(audioPath)) {
        console.log(`[1/4] Extraindo áudio otimizado...`);
        execSync(`ffmpeg -i "${VIDEO_PATH}" -b:a 64k -map a -ar 16000 -ac 1 "${audioPath}" -y`, { stdio: 'inherit' });
    } else {
        console.log(`[1/4] Áudio já presente. Pulando.`);
    }

    // 2. EXTRAÇÃO DE SCREENSHOTS COM TIMESTAMPS
    const screenDir = path.join(OUTPUT_DIR, 'Screenshots');
    if (!fs.existsSync(screenDir)) fs.mkdirSync(screenDir, { recursive: true });
    
    console.log(`[2/4] Extraindo screenshots a cada ${FRAME_INTERVAL}s (Nomeando com timestamps)...`);
    const tempPattern = path.join(screenDir, 'f_%04d.jpg');
    execSync(`ffmpeg -i "${VIDEO_PATH}" -vf "fps=1/${FRAME_INTERVAL},scale=854:-1" "${tempPattern}" -y`, { stdio: 'ignore' });
    
    const frames = fs.readdirSync(screenDir).filter(f => f.startsWith('f_')).sort();
    frames.forEach((file, index) => {
        const totalSeconds = index * FRAME_INTERVAL;
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        const tsName = `${String(h).padStart(2, '0')}h-${String(m).padStart(2, '0')}m-${String(s).padStart(2, '0')}s.jpg`;
        fs.renameSync(path.join(screenDir, file), path.join(screenDir, tsName));
    });
    console.log(`✅ ${frames.length} frames sincronizados.`);

    // 3. TRANSCRIÇÃO PESADA (WHISPER)
    console.log(`[3/4] Rodando Whisper Local (Pode demorar cerca de 20-40 min)...`);
    // Usamos --output_format all para você ter JSON, TXT e SRT
    execSync(`"${WHISPER_PATH}" "${audioPath}" --model base --language pt --output_dir "${OUTPUT_DIR}" --output_format all`, { stdio: 'inherit' });

    // 4. FORMATAÇÃO DE DIÁLOGO
    const jsonPath = path.join(OUTPUT_DIR, 'audio_call.json');
    if (fs.existsSync(jsonPath)) {
        console.log(`[4/4] Gerando transcrição final estruturada...`);
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        let dialogue = "# Transcrição Estruturada: Call Trader Robo\n\n";
        
        data.segments.forEach(seg => {
            const start = seg.start;
            const h = Math.floor(start / 3600);
            const m = Math.floor((start % 3600) / 60);
            const s = Math.floor(start % 60);
            const timeStr = `[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`;
            dialogue += `${timeStr} ${seg.text.trim()}\n`;
        });

        fs.writeFileSync(path.join(OUTPUT_DIR, 'TRANSCRICAO_FINAL.txt'), dialogue, 'utf8');
        console.log(`\n✨ TUDO PRONTO! Confira a pasta: ${OUTPUT_DIR}`);
    } else {
        console.error(`❌ Erro: Arquivo JSON do Whisper não encontrado.`);
    }
}

main().catch(err => console.error(`\n💥 Falha na Missão:`, err));
