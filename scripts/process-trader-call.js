const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VIDEO_PATH = path.resolve('assets/Gravando 2026-04-21 182127.mp4');
const OUTPUT_DIR = path.resolve('assets/ETL_TraderCall');
const WHISPER_EXE = 'C:\\Users\\Pichau\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\whisper.exe';
const FFMPEG_EXE = 'ffmpeg'; // Assumed in PATH

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, 'Screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function run() {
    console.log(`[ETL] Iniciando processamento de: ${VIDEO_PATH}`);

    const audioPath = path.join(OUTPUT_DIR, 'audio_call.mp3');
    if (!fs.existsSync(audioPath)) {
        console.log(`[ETL] Extraindo áudio...`);
        execSync(`ffmpeg -i "${VIDEO_PATH}" -b:a 64k -map a -ar 16000 -ac 1 "${audioPath}" -y`, { stdio: 'inherit' });
    } else {
        console.log(`[ETL] Áudio já existe, pulando extração.`);
    }

    console.log(`[ETL] Extraindo frames a cada 10 segundos...`);
    // Usamos um padrão temporário para renomear depois
    const tempPattern = path.join(SCREENSHOTS_DIR, 'frame_%04d.jpg');
    execSync(`ffmpeg -i "${VIDEO_PATH}" -vf "fps=1/10,scale=854:-1" "${tempPattern}" -y`, { stdio: 'inherit' });

    console.log(`[ETL] Renomeando frames para timestamps...`);
    const frames = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.startsWith('frame_')).sort();
    frames.forEach((file, index) => {
        const totalSeconds = index * 10;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const timestamp = `${String(hours).padStart(2, '0')}h-${String(minutes).padStart(2, '0')}m-${String(seconds).padStart(2, '0')}s`;
        const newName = `${timestamp}.jpg`;
        fs.renameSync(path.join(SCREENSHOTS_DIR, file), path.join(SCREENSHOTS_DIR, newName));
    });

    console.log(`[ETL] Rodando Whisper para transcrição (pode demorar)...`);
    // --output_format json para pegar os timestamps
    execSync(`"${WHISPER_EXE}" "${audioPath}" --model base --language pt --output_dir "${OUTPUT_DIR}" --output_format json`, { stdio: 'inherit' });

    const jsonPath = path.join(OUTPUT_DIR, 'audio_call.json');
    if (fs.existsSync(jsonPath)) {
        console.log(`[ETL] Gerando diálogo estruturado...`);
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        let dialogueText = "# Transcrição da Call com Trader\n\n";
        
        data.segments.forEach(seg => {
            const start = seg.start;
            const h = Math.floor(start / 3600);
            const m = Math.floor((start % 3600) / 60);
            const s = Math.floor(start % 60);
            const timeStr = `[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`;
            
            // Whisper base não faz diarização (quem fala o que), então apenas listamos as falas.
            // O usuário pode usar a IA depois para separar.
            dialogueText += `${timeStr} ${seg.text.trim()}\n`;
        });

        fs.writeFileSync(path.join(OUTPUT_DIR, 'transcript_dialogue.txt'), dialogueText, 'utf8');
        console.log(`[ETL] Transcrição concluída: ${path.join(OUTPUT_DIR, 'transcript_dialogue.txt')}`);
    }

    console.log(`\n✅ PROCESSO CONCLUÍDO COM SUCESSO!`);
    console.log(`Pasta de saída: ${OUTPUT_DIR}`);
}

run().catch(console.error);
