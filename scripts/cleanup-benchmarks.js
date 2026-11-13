// Script de Limpeza — Benchmarks Império Prêmios 10.04
// Remove arquivos brutos de vídeo/áudio após ETL completo
// Uso: node scripts/cleanup-benchmarks.js

const fs = require('fs');
const path = require('path');

const BENCHMARKS_DIR = path.resolve(__dirname, '..', 'workspaces', 'businesses', 'virals', 'marketing', 'imperio_premios', 'Benchmarks 10.04');

function cleanup() {
    console.log(`🧹 Limpando benchmarks em: ${BENCHMARKS_DIR}\n`);
    
    const folders = fs.readdirSync(BENCHMARKS_DIR).filter(f => 
        fs.statSync(path.join(BENCHMARKS_DIR, f)).isDirectory() && f.startsWith('Conteudo-Instagram-')
    );
    
    let cleanedAudio = 0;
    let cleanedVideo = 0;
    
    folders.forEach(folder => {
        const folderPath = path.join(BENCHMARKS_DIR, folder);
        const files = fs.readdirSync(folderPath);
        
        files.forEach(file => {
            const ext = path.extname(file).toLowerCase();
            const filePath = path.join(folderPath, file);
            
            if (ext === '.mp3' || ext === '.wav' || ext === '.m4a') {
                fs.unlinkSync(filePath);
                cleanedAudio++;
                console.log(`  🗑️  ${folder}/${file}`);
            } else if (ext === '.mp4' || ext === '.mov' || ext === '.avi' || ext === '.mkv') {
                fs.unlinkSync(filePath);
                cleanedVideo++;
                console.log(`  🗑️  ${folder}/${file}`);
            }
        });
    });
    
    console.log(`\n✅ Limpeza concluída!`);
    console.log(`   🎵 Áudio removidos: ${cleanedAudio}`);
    console.log(`   🎬 Vídeo removidos: ${cleanedVideo}`);
    console.log(`   📂 Pastas verificadas: ${folders.length}`);
}

cleanup();
