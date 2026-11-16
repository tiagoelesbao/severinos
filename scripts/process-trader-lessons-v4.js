const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Downloader = require('../services/ETL/Extract/downloader');

/**
 * MASTER ETL: TRADER LESSONS ORCHESTRATOR V4 (CHIEF VALIDATED)
 * Resiliência máxima para caminhos com espaços e caracteres especiais.
 */

const WHISPER_PATH = 'C:\\Users\\Pichau\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\whisper.exe';
const BASE_OUTPUT = path.resolve('assets/Trader_Lessons');
const FRAME_INTERVAL = 10;

const LESSONS = [
    { id: 1, path: path.resolve('.aiox/tmp/downloads/ICT Mentorship Core Content - Month 1 - Elements Of A Trade Setup.mp4'), title: 'Aula_1', url: 'https://www.youtube.com/watch?v=0LhteuLVuDU' }
];

async function processLesson(lesson) {
    const lessonDir = path.join(BASE_OUTPUT, lesson.title);
    const screenDir = path.join(lessonDir, 'Screenshots');
    
    // Limpeza profunda para garantir Fresh Start
    if (fs.existsSync(lessonDir)) fs.rmSync(lessonDir, { recursive: true, force: true });
    fs.mkdirSync(screenDir, { recursive: true });

    console.log(`\n--- 🎓 OPERAÇÃO EXCLUSIVA: ${lesson.title} ---`);

    try {
        const videoPath = lesson.path;
        if (!fs.existsSync(videoPath)) throw new Error(`Vídeo não encontrado: ${videoPath}`);

        // 2. ÁUDIO (Foco em mono 16khz para o Whisper)
        const audioPath = path.join(lessonDir, 'audio.mp3');
        console.log(`[2/5] Extraindo áudio...`);
        execSync(`ffmpeg -i "${videoPath}" -b:a 64k -map a -ar 16000 -ac 1 "${audioPath}" -y`, { stdio: 'ignore' });

        // 3. SCREENSHOTS COM TIMESTAMPS
        console.log(`[3/5] Gerando visuais sincronizados...`);
        const tempPattern = path.join(screenDir, 'f_%04d.jpg');
        execSync(`ffmpeg -i "${videoPath}" -vf "fps=1/${FRAME_INTERVAL},scale=854:-1" "${tempPattern}" -y`, { stdio: 'ignore' });
        
        const files = fs.readdirSync(screenDir).filter(f => f.startsWith('f_')).sort();
        files.forEach((f, i) => {
            const s = i * FRAME_INTERVAL;
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;
            const ts = `${String(h).padStart(2, '0')}h-${String(m).padStart(2, '0')}m-${String(sec).padStart(2, '0')}s.jpg`;
            fs.renameSync(path.join(screenDir, f), path.join(screenDir, ts));
        });
        console.log(`✅ ${files.length} frames com timestamp.`);

        // 4. WHISPER (Inglês para ICT Mentorship)
        console.log(`[4/5] Transcrição técnica (Whisper)...`);
        execSync(`"${WHISPER_PATH}" "${audioPath}" --model tiny --language en --output_dir "${lessonDir}" --output_format json`, { stdio: 'inherit' });

        // 5. MARKDOWN FINAL
        const jsonPath = path.join(lessonDir, 'audio.json');
        if (fs.existsSync(jsonPath)) {
            console.log(`[5/5] Construindo README.md...`);
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            let md = `# Mentoria ICT: ${lesson.title}\n\n`;
            md += `> Link: ${lesson.url}\n\n`;
            
            data.segments.forEach(seg => {
                const start = seg.start;
                const h = Math.floor(start / 3600);
                const m = Math.floor((start % 3600) / 60);
                const s = Math.floor(start % 60);
                const timeStr = `**[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]**`;
                md += `### ${timeStr}\n${seg.text.trim()}\n\n---\n\n`;
            });
            fs.writeFileSync(path.join(lessonDir, `README_${lesson.title}.md`), md, 'utf8');
            console.log(`✨ SUCESSO TOTAL: ${lesson.title}`);
        }

    } catch (err) {
        console.error(`❌ FALHA NA MISSÃO (${lesson.title}):`, err.message);
    }
}

async function start() {
    if (!fs.existsSync(BASE_OUTPUT)) fs.mkdirSync(BASE_OUTPUT, { recursive: true });
    for (const l of LESSONS) await processLesson(l);
    console.log(`\n🏆 OPERAÇÃO CONCLUÍDA PELO CHIEF.`);
}

start();
