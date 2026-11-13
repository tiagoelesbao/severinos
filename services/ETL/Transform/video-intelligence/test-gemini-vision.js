/**
 * Quick smoke test — confirma que Gemini Vision API funciona com a chave do .env.
 * Uso: node services/ETL/Transform/video-intelligence/test-gemini-vision.js <imagePath>
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '..', '..', '.env') });
const LocalTranscriber = require('./local-transcriber');
const path = require('path');

(async () => {
    const imagePath = process.argv[2];
    if (!imagePath) {
        console.error('Usage: node test-gemini-vision.js <imagePath>');
        process.exit(1);
    }
    const t = new LocalTranscriber();
    console.log(`Gemini key loaded: ${t.geminiKey ? '✓ (' + t.geminiKey.length + ' chars)' : '✗ NÃO CARREGADA'}`);
    console.log(`Image: ${imagePath}\n`);

    const prompt = "Analise esta imagem de marketing: 1. Transcreva o texto visível. 2. Descreva elementos visuais, cores e mood. 3. Identifique gatilhos de design.";
    const result = await t.analyzeImageWithGemini(imagePath, prompt);
    console.log('--- RESULT (' + (result ? result.length : 0) + ' chars) ---');
    console.log(result || '(null — falhou)');
})();
