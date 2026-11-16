const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Downloader = require('../services/ETL/Extract/downloader');

/**
 * MASTER ETL: TRADER LESSONS ORCHESTRATOR
 * Processamento de Aulas 1, 2 e 3.
 */

const WHISPER_PATH = 'C:\\Users\\Pichau\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\whisper.exe';
const BASE_OUTPUT = path.resolve('assets/Trader_Lessons');
const FRAME_INTERVAL = 10; // Segundos entre screenshots

const LESSONS = [
    { id: 1, url: 'https://www.youtube.com/watch?v=0LhteuLVuDU', title: 'Aula_1' },
    { id: 2, url: 'https://www.youtube.com/watch?v=XwYYWBttWro', title: 'Aula_2' },
    { id: 3, url: 'https://www.youtube.com/watch?v=B7_cjybYQ0g', title: 'Aula_3' }
];

async function processLesson(lesson) {
    const lessonDir = path.join(BASE_OUTPUT, lesson.title);
    const screenDir = path.join(lessonDir, 'Screenshots');
    
    if (!fs.existsSync(screenDir)) fs.mkdirSync(screenDir, { recursive: true });

    console.log(`\n--- 🎓 PROCESSANDO: ${lesson.title} ---`);

    try {
        // 1. DOWNLOAD
        console.log(`[1/5] Baixando vídeo...`);
        const downloader = new Downloader();
        const videoPath = await downloader.download(lesson.url);
        console.log(`✅ Download concluído: ${path.basename(videoPath)}`);

        // 2. ÁUDIO
        const audioPath = path.join(lessonDir, 'audio.mp3');
        console.log(`[2/5] Extraindo áudio...`);
        execSync(`ffmpeg -i "${videoPath}" -b:a 64k -map a -ar 16000 -ac 1 "${audioPath}" -y`, { stdio: 'ignore' });

        // 3. SCREENSHOTS COM TIMESTAMPS
        console.log(`[3/5] Gerando screenshots sincronizados...`);
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

        // 4. WHISPER (Usando tiny para velocidade e memória)
        console.log(`[4/5] Transcrevendo (Whisper tiny)...`);
        execSync(`"${WHISPER_PATH}" "${audioPath}" --model tiny --language pt --output_dir "${lessonDir}" --output_format json`, { stdio: 'inherit' });

        // 5. GERAR MARKDOWN ESTRUTURADO
        const jsonPath = path.join(lessonDir, 'audio.json');
        if (fs.existsSync(jsonPath)) {
            console.log(`[5/5] Formatando relatório Markdown...`);
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            let md = `# Relatório de Estudo: ${lesson.title}\n\n`;
            md += `> Link Original: ${lesson.url}\n\n`;
            md += `## Transcrição Estruturada\n\n`;

            data.segments.forEach(seg => {
                const start = seg.start;
                const h = Math.floor(start / 3600);
                const m = Math.floor((start % 3600) / 60);
                const s = Math.floor(start % 60);
                const timeStr = `**[${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}]**`;
                
                md += `### ${timeStr}\n${seg.text.trim()}\n\n---\n\n`;
            });

            fs.writeFileSync(path.join(lessonDir, `README_${lesson.title}.md`), md, 'utf8');
            console.log(`✨ Aula ${lesson.id} Finalizada!`);
        }

        // Cleanup vídeo original para economizar espaço se necessário
        // fs.unlinkSync(videoPath);

    } catch (err) {
        console.error(`❌ Erro na Aula ${lesson.id}:`, err.message);
    }
}

async function runAll() {
    if (!fs.existsSync(BASE_OUTPUT)) fs.mkdirSync(BASE_OUTPUT, { recursive: true });
    for (const lesson of LESSONS) {
        await processLesson(lesson);
    }
    console.log(`\n🏆 TODAS AS AULAS FORAM PROCESSADAS!`);
}

runAll().catch(console.error);
