const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Downloader = require('../services/ETL/Extract/downloader');

/**
 * MASTER ETL: TRADER LESSONS ORCHESTRATOR V2
 * Foco em resiliência de caminhos e logs.
 */

const WHISPER_PATH = 'C:\\Users\\Pichau\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\whisper.exe';
const BASE_OUTPUT = path.resolve('assets/Trader_Lessons');
const FRAME_INTERVAL = 10;

const LESSONS = [
    { id: 1, url: 'https://www.youtube.com/watch?v=0LhteuLVuDU', title: 'Aula_1' },
    { id: 2, url: 'https://www.youtube.com/watch?v=XwYYWBttWro', title: 'Aula_2' },
    { id: 3, url: 'https://www.youtube.com/watch?v=B7_cjybYQ0g', title: 'Aula_3' }
];

async function processLesson(lesson) {
    const lessonDir = path.join(BASE_OUTPUT, lesson.title);
    const screenDir = path.join(lessonDir, 'Screenshots');
    
    if (!fs.existsSync(screenDir)) fs.mkdirSync(screenDir, { recursive: true });

    console.log(`\n--- 🎓 INICIANDO: ${lesson.title} ---`);

    try {
        const downloader = new Downloader();
        console.log(`[1/5] Verificando/Baixando vídeo...`);
        const videoPathRaw = await downloader.download(lesson.url);
        const videoPath = path.resolve(videoPathRaw); // Forçar caminho absoluto
        
        if (!fs.existsSync(videoPath)) {
            throw new Error(`Arquivo de vídeo não encontrado em: ${videoPath}`);
        }
        console.log(`✅ Vídeo localizado: ${videoPath}`);

        // 2. ÁUDIO
        const audioPath = path.join(lessonDir, 'audio.mp3');
        console.log(`[2/5] Extraindo áudio...`);
        // Usando aspas duplas escapadas para Windows
        execSync(`ffmpeg -i "${videoPath}" -b:a 64k -map a -ar 16000 -ac 1 "${audioPath}" -y`, { stdio: 'inherit' });

        // 3. SCREENSHOTS
        console.log(`[3/5] Gerando screenshots...`);
        const tempPattern = path.join(screenDir, 'f_%04d.jpg');
        execSync(`ffmpeg -i "${videoPath}" -vf "fps=1/${FRAME_INTERVAL},scale=854:-1" "${tempPattern}" -y`, { stdio: 'ignore' });
        
        const frames = fs.readdirSync(screenDir).filter(f => f.startsWith('f_')).sort();
        frames.forEach((file, index) => {
            const s = index * FRAME_INTERVAL;
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;
            const tsName = `${String(h).padStart(2, '0')}h-${String(m).padStart(2, '0')}m-${String(sec).padStart(2, '0')}s.jpg`;
            fs.renameSync(path.join(screenDir, file), path.join(screenDir, tsName));
        });
        console.log(`✅ ${frames.length} frames sincronizados.`);

        // 4. WHISPER
        console.log(`[4/5] Transcrevendo (Whisper tiny)...`);
        execSync(`"${WHISPER_PATH}" "${audioPath}" --model tiny --language pt --output_dir "${lessonDir}" --output_format json`, { stdio: 'inherit' });

        // 5. MARKDOWN
        const jsonPath = path.join(lessonDir, 'audio.json');
        if (fs.existsSync(jsonPath)) {
            console.log(`[5/5] Criando README.md...`);
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            let md = `# Relatório: ${lesson.title}\n\n`;
            data.segments.forEach(seg => {
                const start = seg.start;
                const h = Math.floor(start / 3600);
                const m = Math.floor((start % 3600) / 60);
                const s = Math.floor(start % 60);
                const timeStr = `[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]`;
                md += `### ${timeStr}\n${seg.text.trim()}\n\n---\n\n`;
            });
            fs.writeFileSync(path.join(lessonDir, `README_${lesson.title}.md`), md, 'utf8');
            console.log(`✨ OK: ${lesson.title} finalizada.`);
        }

    } catch (err) {
        console.error(`\n❌ ERRO CRÍTICO NA ${lesson.title}:`);
        console.error(err.message);
    }
}

async function runAll() {
    if (!fs.existsSync(BASE_OUTPUT)) fs.mkdirSync(BASE_OUTPUT, { recursive: true });
    for (const lesson of LESSONS) {
        await processLesson(lesson);
    }
}

runAll().catch(console.error);
