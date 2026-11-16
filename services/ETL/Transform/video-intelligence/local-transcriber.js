const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { discoverFreeVisionModels } = require('./vision-router');

/**
 * Local Transcriber: Viral ETL (Hybrid Local Whisper + OpenRouter Vision)
 * 
 * ENHANCED: Audio segmentation for large files (>25MB or >10min)
 * Based on Bot_transcritor segmentation logic
 *
 * PRIORIDADES DEFINIDAS PELO USUÁRIO:
 * 1. Transcrição: Local Whisper (Grátis/Infinito)
 * 2. Visão/Inteligência: Qwen 3.6 Plus (Primário) -> Step 3.5 Flash (Secundário)
 */
class LocalTranscriber {
    constructor() {
        // API keys do .env (com fallback para hardcoded)
        this.geminiKey = (process.env.GEMINI_API_KEY || '').trim();
        this.openRouterKey = (process.env.OPENROUTER_API_KEY || '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').trim();
        this.whisperExe = 'C:\\Users\\Pichau\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\whisper.exe';

        // Segmentação thresholds
        this.MAX_FILE_SIZE_MB = 25;     // Whisper local pode travar com arquivos grandes
        this.MAX_DURATION_SEC = 300;    // 5 min/segmento — tiny model é mais estável em chunks menores

        // Vision providers — chave atual só tem quota habilitada em gemini-2.5-flash.
        // 2.0-flash retorna "limit: 0" (não habilitado para esta chave).
        // Configuramos thinkingBudget=0 para desabilitar thinking e usar todo budget como output.
        this.geminiModelChain = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
        this.geminiModel = this.geminiModelChain[0];
        // VEX-14: os modelos de visão do OpenRouter são DESCOBERTOS em runtime
        // (vision-router). A lista que ficava aqui apodreceu inteira: os 4
        // modelos saíram do catálogo e a visão passou a falhar em silêncio.
    }

    /**
     * Análise visual via Google Gemini API (provider primário).
     * @param {string} imagePath
     * @param {string} prompt
     * @returns {Promise<string|null>}
     */
    async analyzeImageWithGemini(imagePath, prompt) {
        if (!this.geminiKey) return null;

        const base64 = fs.readFileSync(imagePath).toString('base64');
        const mime = (path.extname(imagePath).toLowerCase() === '.png') ? 'image/png' : 'image/jpeg';
        const body = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mime, data: base64 } }
                ]
            }],
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 4096,
                thinkingConfig: { thinkingBudget: 0 }  // Desabilita thinking → output completo
            }
        };

        for (const model of this.geminiModelChain) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiKey}`;
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await resp.json();
                if (resp.ok && data.candidates && data.candidates[0]) {
                    const text = data.candidates[0].content?.parts?.map(p => p.text).filter(Boolean).join('\n');
                    if (text) {
                        console.log(`[LocalTranscriber] Gemini vision OK (${model})`);
                        return text.trim();
                    }
                }
                console.warn(`[LocalTranscriber] Gemini ${model} falhou: ${data.error?.message || resp.statusText}`);
            } catch (e) {
                console.warn(`[LocalTranscriber] Gemini ${model} exception: ${e.message}`);
            }
        }
        return null;
    }

    /**
     * Detecta o idioma do áudio usando Whisper tiny SEM flag --language.
     * Whisper detecta automaticamente o idioma quando --language não é fornecido.
     * O arquivo de output contém o idioma detectado no nome: <base>.<lang>.txt
     */
    async detectLanguage(mediaPath) {
        console.log(`[LocalTranscriber] Detectando idioma do áudio...`);
        const whisperExe = 'C:\\Users\\Pichau\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\whisper.exe';
        const baseName = path.basename(mediaPath, path.extname(mediaPath));
        const outputDir = path.dirname(mediaPath);

        // Estratégia 1: Whisper tiny SEM --language → ele detecta sozinho e salva como .<lang>.txt
        try {
            console.log(`[LocalTranscriber] Rodando Whisper tiny para detecção automática...`);
            execSync(`"${whisperExe}" "${mediaPath}" --model tiny --output_dir "${outputDir}" --output_format txt`, {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 120000
            });

            // Whisper cria arquivo: <base>.<detected_lang>.txt
            // Idiomas suportados: en, pt, es, fr, de, it, ja, zh, ko, ru, ar, hi, nl, tr, pl, sv, etc.
            const supportedLangs = [
                'en', 'pt', 'es', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru',
                'ar', 'hi', 'nl', 'tr', 'pl', 'sv', 'da', 'fi', 'no', 'cs',
                'ro', 'el', 'hu', 'th', 'uk', 'vi', 'id', 'ms', 'ca', 'hr'
            ];

            for (const lang of supportedLangs) {
                const langFile = path.join(outputDir, `${baseName}.${lang}.txt`);
                if (fs.existsSync(langFile)) {
                    console.log(`[LocalTranscriber] Idioma detectado pelo Whisper: ${lang}`);
                    // Cleanup imediato
                    try { fs.unlinkSync(langFile); } catch (_) {}
                    return lang;
                }
            }

            // Se chegou aqui, Whisper não criou arquivo .lang.txt — pode ter criado .txt genérico
            // Tenta ler o .txt genérico e analisar por heurística
            const genericFile = path.join(outputDir, `${baseName}.txt`);
            if (fs.existsSync(genericFile)) {
                const content = fs.readFileSync(genericFile, 'utf8');
                const detected = this.heuristicLanguageDetect(content);
                try { fs.unlinkSync(genericFile); } catch (_) {}
                console.log(`[LocalTranscriber] Idioma detectado por heurística: ${detected}`);
                return detected;
            }
        } catch (e) {
            console.warn(`[LocalTranscriber] Whisper tiny falhou na detecção: ${e.message}`);
        }

        // Estratégia 2: Fallback heurístico com transcrição forçada
        // Se Whisper não detectou, tenta transcrever sem flag e analisa o resultado
        console.log(`[LocalTranscriber] Fallback: transcrição sem flag de idioma...`);
        try {
            const tempFile = path.join(outputDir, `${baseName}_langtemp.txt`);
            execSync(`"${whisperExe}" "${mediaPath}" --model tiny --output_dir "${outputDir}" --output_format txt --task transcribe`, {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 120000
            });

            // Verifica se criou arquivo com idioma detectado
            const supportedLangs = ['en', 'pt', 'es', 'fr', 'de', 'it', 'ja', 'zh', 'ko', 'ru'];
            for (const lang of supportedLangs) {
                const langFile = path.join(outputDir, `${baseName}.${lang}.txt`);
                if (fs.existsSync(langFile)) {
                    console.log(`[LocalTranscriber] Idioma detectado no fallback: ${lang}`);
                    try { fs.unlinkSync(langFile); } catch (_) {}
                    try { fs.unlinkSync(tempFile); } catch (_) {}
                    return lang;
                }
            }

            // Lê o arquivo genérico e usa heurística
            if (fs.existsSync(tempFile)) {
                const content = fs.readFileSync(tempFile, 'utf8');
                const detected = this.heuristicLanguageDetect(content);
                try { fs.unlinkSync(tempFile); } catch (_) {}
                console.log(`[LocalTranscriber] Idioma detectado por heurística fallback: ${detected}`);
                return detected;
            }
        } catch (e) {
            console.warn(`[LocalTranscriber] Fallback falhou: ${e.message}`);
        }

        // Estratégia 3: Último recurso — analisa metadados do vídeo
        console.log(`[LocalTranscriber] Último recurso: inferindo por metadados/contexto...`);
        console.warn(`[LocalTranscriber] Não foi possível detectar idioma via Whisper. Padrão: pt (português).`);
        return 'pt'; // Padrão mais seguro para o contexto brasileiro do usuário
    }

    /**
     * Detecção heurística baseada em scoring de palavras-chave por idioma.
     * Usa palavras distintas (não artigos curtos) para evitar falsos positivos.
     */
    heuristicLanguageDetect(text) {
        const lower = text.toLowerCase();
        const words = lower.match(/[a-zà-ú]+/g) || [];

        // Palavras distintivas por idioma — escolho palavras que NÃO existem nos outros idiomas
        const ptDistinctive = [
            'não', 'muito', 'como', 'esse', 'essa', 'isso', 'isto', 'aquilo',
            'você', 'vocês', 'estou', 'está', 'estamos', 'estão', 'estava',
            'fazer', 'faz', 'fiz', 'feito', 'porque', 'quando', 'onde',
            'qual', 'quais', 'quem', 'cada', 'entre', 'sobre', 'após',
            'ainda', 'já', 'mais', 'menos', 'sempre', 'também', 'antes',
            'primeiro', 'depois', 'agora', 'hoje', 'dia', 'noite', 'bom',
            'coisa', 'coisas', 'pessoas', 'gente', 'mundo', 'vida', 'parte',
            'trabalho', 'empresa', 'negócio', 'resultado', 'vendas', 'marketing',
            'para', 'pelo', 'pela', 'pelos', 'pelas', 'num', 'numa', 'nuns',
            'tá', 'tô', 'né', 'então', 'assim', 'será', 'pode', 'posso',
            'temos', 'tem', 'tiver', 'tiveram', 'fosse', 'foram', 'eram',
            'querer', 'quer', 'quero', 'queremos', 'precisa', 'precisar',
            'importante', 'diferente', 'grande', 'pequeno', 'novo', 'velho'
        ];

        const enDistinctive = [
            'the', 'this', 'that', 'these', 'those', 'what', 'when', 'where',
            'which', 'who', 'why', 'how', 'with', 'from', 'into', 'through',
            'about', 'would', 'could', 'should', 'will', 'can', 'must',
            'have', 'has', 'had', 'been', 'being', 'were', 'was', 'are',
            'they', 'their', 'them', 'there', 'here', 'very', 'just', 'only',
            'other', 'another', 'some', 'such', 'than', 'then', 'too', 'also',
            'because', 'before', 'after', 'between', 'during', 'without',
            'people', 'thing', 'things', 'world', 'work', 'way', 'make',
            'made', 'need', 'want', 'know', 'think', 'see', 'look', 'come',
            'take', 'give', 'good', 'great', 'little', 'right', 'new', 'old',
            'really', 'much', 'many', 'most', 'more', 'even', 'back', 'well',
            'still', 'already', 'always', 'never', 'often', 'sometimes',
            'important', 'different', 'business', 'company', 'result', 'sales'
        ];

        const esDistinctive = [
            'pero', 'porque', 'cuando', 'donde', 'puede', 'puedo', 'hacer',
            'mucho', 'muy', 'siempre', 'nunca', 'también', 'ahora', 'hoy',
            'día', 'noche', 'bueno', 'mundo', 'vida', 'parte', 'trabajo',
            'empresa', 'gente', 'personas', 'cosas', 'importante', 'diferente',
            'grande', 'pequeño', 'nuevo', 'viejo', 'para', 'sobre', 'entre',
            'después', 'antes', 'primero', 'este', 'esta', 'eso', 'esto',
            'nada', 'nadie', 'todos', 'todas', 'cada', 'más', 'menos', 'muy'
        ];

        // Scoring: conta ocorrências de palavras distintivas
        let ptScore = 0;
        let enScore = 0;
        let esScore = 0;

        for (const word of words) {
            if (ptDistinctive.includes(word)) ptScore++;
            if (enDistinctive.includes(word)) enScore++;
            if (esDistinctive.includes(word)) esScore++;
        }

        // Log para debug
        console.log(`[LocalTranscriber] Scores heurísticos — PT: ${ptScore}, EN: ${enScore}, ES: ${esScore}`);

        // Se nenhum score > 0, tenta por proporção de caracteres
        if (ptScore === 0 && enScore === 0 && esScore === 0) {
            // Fallback: proporção de caracteres acentuados (português/espanhol usam mais)
            const accented = (text.match(/[àáâãéêíóôõúüçÀÁÂÃÉÊÍÓÔÕÚÜÇ]/g) || []).length;
            const totalLetters = words.length;
            const accentedRatio = totalLetters > 0 ? accented / totalLetters : 0;

            if (accentedRatio > 0.05) return 'pt'; // >5% acentuados = provável PT
            return 'en'; // Baixa acentuação = provável EN
        }

        // Retorna o idioma com maior score
        if (ptScore > enScore && ptScore > esScore) return 'pt';
        if (enScore > ptScore && enScore > esScore) return 'en';
        if (esScore > ptScore && esScore > enScore) return 'es';

        // Empate: PT vs EN — usa acentuação como desempate
        if (ptScore === enScore) {
            const accented = (text.match(/[àáâãéêíóôõúüçÀÁÂÃÉÊÍÓÔÕÚÜÇ]/g) || []).length;
            return accented > 2 ? 'pt' : 'en';
        }

        return 'pt'; // Fallback seguro
    }

    /**
     * Get audio duration in seconds using ffprobe
     * @param {string} audioPath 
     * @returns {number|null} Duration in seconds
     */
    getAudioDuration(audioPath) {
        try {
            const cmd = `ffprobe -v quiet -print_format json -show_format "${audioPath}"`;
            const output = execSync(cmd, { stdio: 'pipe', timeout: 10000 }).toString();
            const data = JSON.parse(output);
            return parseFloat(data.format.duration);
        } catch (e) {
            console.warn(`[LocalTranscriber] Duration check failed: ${e.message}`);
            return null;
        }
    }

    /**
     * Get file size in MB
     * @param {string} filePath 
     * @returns {number} Size in MB
     */
    getFileSizeMB(filePath) {
        try {
            return fs.statSync(filePath).size / (1024 * 1024);
        } catch (_) {
            return 0;
        }
    }

    /**
     * Split audio into segments using FFmpeg
     * @param {string} audioPath 
     * @param {string} outputDir 
     * @param {number} segmentDuration - Duration in seconds (default: 600 = 10min)
     * @returns {string[]} Array of segment paths
     */
    splitAudio(audioPath, outputDir, segmentDuration = 600) {
        try {
            const segmentsDir = path.join(outputDir, 'segments');
            if (!fs.existsSync(segmentsDir)) {
                fs.mkdirSync(segmentsDir, { recursive: true });
            }

            const baseName = path.basename(audioPath, path.extname(audioPath));
            const segmentTemplate = path.join(segmentsDir, `${baseName}_parte_%03d.mp3`);

            const cmd = `ffmpeg -i "${audioPath}" -f segment -segment_time ${segmentDuration} -c:a libmp3lame -q:a 4 -map a -y "${segmentTemplate}"`;
            
            console.log(`[LocalTranscriber] Dividindo áudio em segmentos de ${(segmentDuration/60).toFixed(1)}min...`);
            execSync(cmd, { stdio: 'pipe', timeout: 120000 });

            const segments = fs.readdirSync(segmentsDir)
                .filter(f => f.startsWith(`${baseName}_parte_`) && f.endsWith('.mp3'))
                .map(f => path.join(segmentsDir, f))
                .sort();

            console.log(`[LocalTranscriber] Áudio dividido em ${segments.length} segmentos`);
            return segments;
        } catch (e) {
            console.error(`[LocalTranscriber] Split failed: ${e.message}`);
            return [];
        }
    }

    /**
     * Combine transcribed segments into final output
     * @param {Array<{text: string, segmentNumber: number}>} transcriptions 
     * @param {string} outputDir 
     * @param {string} baseName 
     * @returns {{fullText: string, segments: Array, outputPath: string}}
     */
    combineTranscriptions(transcriptions, outputDir, baseName) {
        const fullText = [];
        const allSegments = [];

        for (const t of transcriptions) {
            const segNum = t.segmentNumber;
            const header = `\n\n--- SEGMENTO ${segNum} ---\n\n`;
            
            fullText.push((segNum === 1 ? '' : header) + t.text.trim());
        }

        const combinedText = fullText.join('');
        const outputPath = path.join(outputDir, `${baseName}_combined.txt`);
        fs.writeFileSync(outputPath, combinedText, 'utf8');

        console.log(`[LocalTranscriber] Transcrição combinada: ${transcriptions.length} segmentos → ${path.basename(outputPath)}`);
        return { fullText: combinedText, outputPath, segmentsCount: transcriptions.length };
    }

    /**
     * Cleanup segment files
     * @param {string[]} segments 
     */
    cleanupSegments(segments) {
        for (const seg of segments) {
            try {
                if (fs.existsSync(seg)) fs.unlinkSync(seg);
            } catch (_) {}
        }
        
        // Remove segments dir if empty
        if (segments.length > 0) {
            const segmentsDir = path.dirname(segments[0]);
            try {
                if (fs.existsSync(segmentsDir) && fs.readdirSync(segmentsDir).length === 0) {
                    fs.rmdirSync(segmentsDir);
                }
            } catch (_) {}
        }
    }

    async transcribeLocally(mediaPath, detectedLanguage = null) {
        console.log(`[LocalTranscriber] Transcrição Local (Whisper)...`);

        // Se nenhum idioma foi detectado, detecta primeiro
        if (!detectedLanguage) {
            detectedLanguage = await this.detectLanguage(mediaPath);
        }

        // CHECK: Precisa segmentar?
        const fileSizeMB = this.getFileSizeMB(mediaPath);
        const durationSec = this.getAudioDuration(mediaPath);
        const needsSegmentation = fileSizeMB > this.MAX_FILE_SIZE_MB || (durationSec && durationSec > this.MAX_DURATION_SEC * 1.5);

        if (needsSegmentation) {
            console.log(`[LocalTranscriber] Áudio grande detectado: ${fileSizeMB.toFixed(1)}MB, ${durationSec ? (durationSec/60).toFixed(1) + 'min' : 'unknown duration'}. Usando segmentação.`);
            return await this.transcribeWithSegmentation(mediaPath, detectedLanguage);
        }

        // Transcrição direta (arquivo pequeno)
        return await this.transcribeDirect(mediaPath, detectedLanguage);
    }

    /**
     * Transcribe large audio by splitting into segments
     */
    async transcribeWithSegmentation(mediaPath, detectedLanguage) {
        const outputDir = path.dirname(mediaPath);
        const baseName = path.basename(mediaPath, path.extname(mediaPath));
        
        // Split audio
        const segments = this.splitAudio(mediaPath, outputDir, this.MAX_DURATION_SEC);
        if (segments.length === 0) {
            console.warn(`[LocalTranscriber] Falha ao segmentar. Tentando transcrição direta...`);
            return await this.transcribeDirect(mediaPath, detectedLanguage);
        }

        // Transcribe each segment
        const transcriptions = [];
        for (let i = 0; i < segments.length; i++) {
            const originalSegment = segments[i];
            const segNum = i + 1;
            
            // Renomear para nome simples (evita problemas com espaços no Windows)
            const simpleName = `segment_${String(segNum).padStart(3, '0')}.mp3`;
            const simplePath = path.join(outputDir, 'segments', simpleName);
            
            try {
                fs.copyFileSync(originalSegment, simplePath);
            } catch (e) {
                console.warn(`[LocalTranscriber] Falha ao copiar segmento ${segNum}: ${e.message}`);
                continue;
            }
            
            console.log(`[LocalTranscriber] Transcrevendo segmento ${segNum}/${segments.length}...`);
            const text = await this.transcribeDirect(simplePath, detectedLanguage);
            
            // Cleanup copied file
            try { fs.unlinkSync(simplePath); } catch (_) {}
            
            if (text && text.length > 10) {
                transcriptions.push({ text, segmentNumber: segNum });
                console.log(`[LocalTranscriber] Segmento ${segNum}: ${text.length} caracteres`);
            } else {
                console.warn(`[LocalTranscriber] Segmento ${segNum} falhou ou vazio.`);
            }
        }

        // Cleanup segment audio files
        this.cleanupSegments(segments);

        // Combine transcriptions
        if (transcriptions.length > 0) {
            const combined = this.combineTranscriptions(transcriptions, outputDir, baseName);
            console.log(`[LocalTranscriber] Transcrição segmentada concluída: ${combined.segmentsCount} segmentos, ${combined.fullText.length} chars`);
            return combined.fullText;
        }

        console.error(`[LocalTranscriber] Todos os segmentos falharam.`);
        return null;
    }

    /**
     * Direct transcription of a single audio file
     */
    async transcribeDirect(mediaPath, detectedLanguage) {
        const baseName = path.basename(mediaPath, path.extname(mediaPath));
        const outputDir = path.dirname(mediaPath);
        const expectedTxt = path.join(outputDir, `${baseName}.txt`);
        const expectedTxtLang = path.join(outputDir, `${baseName}.${detectedLanguage}.txt`);

        // Clean previous outputs
        try { if (fs.existsSync(expectedTxt)) fs.unlinkSync(expectedTxt); } catch (_) {}
        try { if (fs.existsSync(expectedTxtLang)) fs.unlinkSync(expectedTxtLang); } catch (_) {}

        try {
            // Usar aspas duplas e escape para caminhos com espaços
            const cmd = `"${this.whisperExe}" "${mediaPath}" --model base --language ${detectedLanguage} --output_dir "${outputDir}" --output_format txt`;
            execSync(cmd, {
                stdio: 'pipe',
                timeout: 600000,
                maxBuffer: 50 * 1024 * 1024 // 50MB buffer
            });

            // Find output file
            if (fs.existsSync(expectedTxtLang)) {
                const content = fs.readFileSync(expectedTxtLang, 'utf8').trim();
                try { fs.unlinkSync(expectedTxtLang); } catch (_) {}
                return content;
            }
            if (fs.existsSync(expectedTxt)) {
                const content = fs.readFileSync(expectedTxt, 'utf8').trim();
                try { fs.unlinkSync(expectedTxt); } catch (_) {}
                return content;
            }
        } catch (e) {
            console.warn(`[LocalTranscriber] Whisper base falhou: ${e.message.substring(0, 150)}`);
        }

        // Fallback: tiny model
        try {
            const cmd = `"${this.whisperExe}" "${mediaPath}" --model tiny --language ${detectedLanguage} --output_dir "${outputDir}" --output_format txt`;
            execSync(cmd, {
                stdio: 'pipe',
                timeout: 600000,
                maxBuffer: 50 * 1024 * 1024
            });

            if (fs.existsSync(expectedTxtLang)) {
                const content = fs.readFileSync(expectedTxtLang, 'utf8').trim();
                try { fs.unlinkSync(expectedTxtLang); } catch (_) {}
                return content;
            }
            if (fs.existsSync(expectedTxt)) {
                const content = fs.readFileSync(expectedTxt, 'utf8').trim();
                try { fs.unlinkSync(expectedTxt); } catch (_) {}
                return content;
            }
        } catch (e2) {
            console.warn(`[LocalTranscriber] Whisper tiny também falhou: ${e2.message.substring(0, 150)}`);
        }

        return null;
    }

    /**
     * Transcrição estruturada com timestamps → retorna .md formatado por minuto.
     * Cascata: Gemini Audio API (primário, free tier) → Whisper local (fallback).
     *
     * @returns {Promise<{md: string, segments: Array<{start: number, end: number, text: string}>}>}
     */
    async transcribeWithTimestamps(mediaPath, detectedLanguage = null) {
        // Tier 1: Gemini Audio API (rápido, alta qualidade, free tier 1500 req/dia)
        if (this.geminiKey) {
            try {
                const gemini = await this.transcribeWithGemini(mediaPath);
                if (gemini && gemini.segments.length > 0) {
                    console.log(`[LocalTranscriber] Gemini transcription OK (${gemini.segments.length} segments)`);
                    return gemini;
                }
                console.warn(`[LocalTranscriber] Gemini retornou 0 segments — fallback para Whisper local.`);
            } catch (e) {
                console.warn(`[LocalTranscriber] Gemini transcription exception: ${e.message} — fallback para Whisper.`);
            }
        }

        // Tier 2: Whisper local (CPU, mais lento, fallback)
        if (!detectedLanguage) detectedLanguage = await this.detectLanguage(mediaPath);
        const fileSizeMB = this.getFileSizeMB(mediaPath);
        const durationSec = this.getAudioDuration(mediaPath);
        const needsSegmentation = fileSizeMB > this.MAX_FILE_SIZE_MB || (durationSec && durationSec > this.MAX_DURATION_SEC * 1.5);

        if (needsSegmentation) {
            console.log(`[LocalTranscriber] Whisper SRT segmentado: ${fileSizeMB.toFixed(1)}MB, ${durationSec ? (durationSec/60).toFixed(1)+'min' : '?'}`);
            return await this._transcribeSrtSegmented(mediaPath, detectedLanguage);
        }
        return await this._transcribeSrtDirect(mediaPath, detectedLanguage);
    }

    /**
     * Transcrição via Gemini Audio API. Usa inline_data para áudios <= 18MB,
     * ou chunking para áudios maiores (5min de audio em 16kHz mono mp3 ≈ 600KB).
     *
     * @returns {Promise<{md: string, segments: Array<{start: number, end: number, text: string}>}>}
     */
    async transcribeWithGemini(mediaPath) {
        const fileSizeMB = this.getFileSizeMB(mediaPath);
        const durationSec = this.getAudioDuration(mediaPath);

        // Chunking decision: por DURAÇÃO (não tamanho).
        // Output de 5min = ~50-80 entries JSON ≈ 5-10k chars (cabe em 32k tokens).
        // Output de 30min = ~300+ entries ≈ 50k+ chars (explode 32k tokens).
        const INLINE_DURATION_LIMIT = this.MAX_DURATION_SEC; // 5 min
        const INLINE_FILE_LIMIT_MB = 18;

        const tooLongForInline = (durationSec && durationSec > INLINE_DURATION_LIMIT * 1.2) || fileSizeMB > INLINE_FILE_LIMIT_MB;

        if (!tooLongForInline) {
            return await this._transcribeGeminiInline(mediaPath, 0);
        }

        console.log(`[LocalTranscriber] Gemini chunking: ${fileSizeMB.toFixed(1)}MB / ${durationSec ? (durationSec/60).toFixed(1)+'min' : '?'} → chunks de ${INLINE_DURATION_LIMIT/60}min`);
        const outputDir = path.dirname(mediaPath);
        const segFiles = this.splitAudio(mediaPath, outputDir, INLINE_DURATION_LIMIT);
        if (segFiles.length === 0) {
            console.warn(`[LocalTranscriber] Falha ao chunkar áudio para Gemini.`);
            return { md: '', segments: [] };
        }

        const allSegments = [];
        for (let i = 0; i < segFiles.length; i++) {
            const offset = i * INLINE_DURATION_LIMIT;
            console.log(`[LocalTranscriber] Gemini chunk ${i + 1}/${segFiles.length} (offset ${offset}s)...`);
            const partial = await this._transcribeGeminiInline(segFiles[i], offset);
            if (partial.segments.length === 0) {
                console.warn(`[LocalTranscriber] Gemini chunk ${i + 1}: 0 segments.`);
                continue;
            }
            allSegments.push(...partial.segments);

            // Cooldown 1.5s entre chunks para respeitar rate limit free tier
            if (i < segFiles.length - 1) await new Promise(r => setTimeout(r, 1500));
        }
        this.cleanupSegments(segFiles);

        if (allSegments.length === 0) return { md: '', segments: [] };
        return { md: this.segmentsToMd(allSegments), segments: allSegments };
    }

    async _transcribeGeminiInline(audioPath, offsetSec = 0) {
        if (!fs.existsSync(audioPath)) return { md: '', segments: [] };

        const audioBuf = fs.readFileSync(audioPath);
        const base64 = audioBuf.toString('base64');
        const ext = path.extname(audioPath).toLowerCase();
        const mime = ext === '.mp3' ? 'audio/mp3' :
                     ext === '.wav' ? 'audio/wav' :
                     ext === '.m4a' ? 'audio/mp4' :
                     ext === '.ogg' ? 'audio/ogg' :
                     ext === '.flac' ? 'audio/flac' : 'audio/mpeg';

        const prompt = `You are a verbatim audio transcriber. Auto-detect the spoken language and transcribe word-for-word in THAT EXACT LANGUAGE.

ABSOLUTE RULES — DO NOT BREAK:
- DO NOT TRANSLATE. Ever. Not partially, not "for clarity", never.
- If audio is in English → every "t" field must be English text.
- If audio is in Portuguese → every "t" field must be Portuguese text.
- If audio is in Spanish → every "t" field must be Spanish text.
- NEVER mix languages within a sentence (no "Se você wanting" or "Stickie é o mais importante").
- If a word is in English in the audio (proper noun, brand, jargon), keep it in English.
- Transcribe filler words ("uh", "um", "you know", "tipo", "né") when audible.

OUTPUT FORMAT (return ONLY this — no markdown, no \`\`\`json fences, no commentary):
[
  {"s": "MM:SS", "e": "MM:SS", "t": "exact words as spoken"},
  ...
]

ITEM RULES:
- Each item = 1 complete sentence or natural phrase (~5-15 words).
- Do NOT merge multiple sentences into one item.
- Preserve natural punctuation (. , ! ?).
- "s" = start time, "e" = end time, both in MM:SS format (minutes:seconds of audio).
- If audio is silent, music-only, or unintelligible → return [].

CORRECT EXAMPLES:
- Audio in English: {"s":"00:00","e":"00:03","t":"How can I keep my daughter safe"}
- Audio in Portuguese: {"s":"00:00","e":"00:04","t":"Então eu achei esse relatório sensacional"}
- Audio in Spanish: {"s":"00:00","e":"00:03","t":"Vamos a empezar con el primero"}

WRONG EXAMPLES (NEVER do this):
- Mixed: {"t":"Se você wanting começar"}  ← WRONG, audio was English
- Translated: {"t":"Número um é o mais importante"}  ← WRONG if audio said "Number one is the most important"`;

        const body = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inline_data: { mime_type: mime, data: base64 } }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 32768,
                responseMimeType: 'application/json',
                thinkingConfig: { thinkingBudget: 0 }  // Sem thinking → todo budget para output
            }
        };

        for (const model of this.geminiModelChain) {
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiKey}`;
                    const resp = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    const data = await resp.json();
                    if (!resp.ok || !data.candidates || !data.candidates[0]) {
                        const msg = data.error?.message || resp.statusText;
                        const isTransient = /high demand|rate|quota|temporarily|503|429/i.test(msg);
                        console.warn(`[LocalTranscriber] Gemini ${model} (audio) attempt ${attempt} falhou: ${msg.substring(0, 120)}`);
                        if (isTransient && attempt === 1) {
                            await new Promise(r => setTimeout(r, 8000));
                            continue;
                        }
                        break; // próximo modelo
                    }
                    const raw = data.candidates[0].content?.parts?.map(p => p.text).filter(Boolean).join('') || '';
                    const segments = this._parseGeminiTranscript(raw, offsetSec);
                    if (segments.length > 0) {
                        return { md: this.segmentsToMd(segments), segments };
                    }
                    console.warn(`[LocalTranscriber] Gemini ${model} (audio): JSON parseado mas 0 segments.`);
                    break;
                } catch (e) {
                    console.warn(`[LocalTranscriber] Gemini ${model} (audio) exception: ${e.message}`);
                    break;
                }
            }
        }
        return { md: '', segments: [] };
    }

    _parseGeminiTranscript(raw, offsetSec = 0) {
        if (!raw) return [];
        // Remove ```json fences se vierem (mesmo com responseMimeType)
        let cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        // Tenta extrair array JSON se vier com texto antes
        const arrMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrMatch) cleaned = arrMatch[0];

        let arr;
        try { arr = JSON.parse(cleaned); } catch (e) {
            console.warn(`[LocalTranscriber] Falha ao parsear JSON do Gemini: ${e.message}`);
            return [];
        }
        if (!Array.isArray(arr)) return [];

        const tsToSec = (ts) => {
            if (typeof ts === 'number') return ts;
            const m = String(ts).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
            if (!m) return 0;
            return m[3] ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : (+m[1]) * 60 + (+m[2]);
        };

        return arr
            .filter(it => it && (it.t || it.text) && (it.s != null || it.start != null))
            .map(it => ({
                start: tsToSec(it.s ?? it.start) + offsetSec,
                end: tsToSec(it.e ?? it.end ?? it.s ?? it.start) + offsetSec,
                text: String(it.t ?? it.text).trim()
            }))
            .filter(s => s.text.length > 0);
    }

    async _transcribeSrtDirect(mediaPath, detectedLanguage, modelOrder = ['tiny', 'base']) {
        const baseName = path.basename(mediaPath, path.extname(mediaPath));
        const outputDir = path.dirname(mediaPath);
        const expectedSrt = path.join(outputDir, `${baseName}.srt`);
        const expectedSrtLang = path.join(outputDir, `${baseName}.${detectedLanguage}.srt`);

        try { if (fs.existsSync(expectedSrt)) fs.unlinkSync(expectedSrt); } catch (_) {}
        try { if (fs.existsSync(expectedSrtLang)) fs.unlinkSync(expectedSrtLang); } catch (_) {}

        let srtPath = null;
        for (const model of modelOrder) {
            try {
                const cmd = `"${this.whisperExe}" "${mediaPath}" --model ${model} --language ${detectedLanguage} --output_dir "${outputDir}" --output_format srt`;
                // 30min timeout — Whisper em CPU é lento; segmentos de 10min podem levar 15-20min com 'base'
                execSync(cmd, { stdio: 'pipe', timeout: 1800000, maxBuffer: 100 * 1024 * 1024 });
                if (fs.existsSync(expectedSrtLang)) { srtPath = expectedSrtLang; break; }
                if (fs.existsSync(expectedSrt)) { srtPath = expectedSrt; break; }
            } catch (e) {
                console.warn(`[LocalTranscriber] SRT (${model}) falhou: ${e.message.substring(0, 150)}`);
            }
        }
        if (!srtPath) return { md: '', segments: [] };

        const srtContent = fs.readFileSync(srtPath, 'utf8');
        try { fs.unlinkSync(srtPath); } catch (_) {}

        const segments = this.parseSrt(srtContent);
        const md = this.segmentsToMd(segments);
        return { md, segments };
    }

    async _transcribeSrtSegmented(mediaPath, detectedLanguage) {
        const outputDir = path.dirname(mediaPath);
        const baseName = path.basename(mediaPath, path.extname(mediaPath));

        const segFiles = this.splitAudio(mediaPath, outputDir, this.MAX_DURATION_SEC);
        if (segFiles.length === 0) {
            console.warn(`[LocalTranscriber] Falha ao segmentar — tentando transcrição direta.`);
            return await this._transcribeSrtDirect(mediaPath, detectedLanguage);
        }

        const allSegments = [];
        for (let i = 0; i < segFiles.length; i++) {
            const segPath = segFiles[i];
            const offsetSec = i * this.MAX_DURATION_SEC;
            console.log(`[LocalTranscriber] SRT segmento ${i + 1}/${segFiles.length} (offset ${offsetSec}s)...`);

            // Renomear pra path simples (evita problemas de espaço)
            const simpleName = `srtseg_${String(i + 1).padStart(3, '0')}.mp3`;
            const simplePath = path.join(outputDir, 'segments', simpleName);
            try { fs.copyFileSync(segPath, simplePath); } catch (e) {
                console.warn(`[LocalTranscriber] Cópia segmento ${i + 1} falhou: ${e.message}`);
                continue;
            }

            // Em segmentação tenta tiny primeiro; se falhar (0 sentenças), tenta base como fallback
            let partial = await this._transcribeSrtDirect(simplePath, detectedLanguage, ['tiny']);
            if (partial.segments.length === 0) {
                console.warn(`[LocalTranscriber] tiny retornou 0 sentenças no segmento ${i + 1}. Fallback para base...`);
                partial = await this._transcribeSrtDirect(simplePath, detectedLanguage, ['base']);
            }
            try { fs.unlinkSync(simplePath); } catch (_) {}

            if (partial.segments.length === 0) {
                console.warn(`[LocalTranscriber] Segmento ${i + 1}: 0 sentenças.`);
                continue;
            }
            for (const s of partial.segments) {
                allSegments.push({ start: s.start + offsetSec, end: s.end + offsetSec, text: s.text });
            }
        }

        this.cleanupSegments(segFiles);

        if (allSegments.length === 0) return { md: '', segments: [] };
        const md = this.segmentsToMd(allSegments);
        return { md, segments: allSegments };
    }

    /**
     * Parse SRT format → array of { start, end, text } in seconds.
     */
    parseSrt(srt) {
        const blocks = srt.replace(/\r\n/g, '\n').trim().split(/\n\n+/);
        const out = [];
        const tsRe = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;
        for (const block of blocks) {
            const lines = block.split('\n').filter(Boolean);
            if (lines.length < 2) continue;
            const tsLine = lines.find(l => tsRe.test(l));
            if (!tsLine) continue;
            const m = tsLine.match(tsRe);
            const start = (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
            const end = (+m[5]) * 3600 + (+m[6]) * 60 + (+m[7]) + (+m[8]) / 1000;
            const text = lines.filter(l => !/^\d+$/.test(l) && !tsRe.test(l)).join(' ').trim();
            if (text) out.push({ start, end, text });
        }
        return out;
    }

    /**
     * Render segments as Markdown grouped by minute, with [mm:ss] markers per sentence.
     */
    segmentsToMd(segments) {
        if (!segments.length) return '_Transcrição vazia._';
        const fmt = (s) => {
            const mm = String(Math.floor(s / 60)).padStart(2, '0');
            const ss = String(Math.floor(s % 60)).padStart(2, '0');
            return `${mm}:${ss}`;
        };
        const groups = new Map();
        for (const seg of segments) {
            const minute = Math.floor(seg.start / 60);
            if (!groups.has(minute)) groups.set(minute, []);
            groups.get(minute).push(seg);
        }
        const out = [];
        for (const [minute, segs] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
            out.push(`## ⏱️ Minuto ${String(minute).padStart(2, '0')}:00 — ${String(minute).padStart(2, '0')}:59\n`);
            const paragraph = segs.map(s => `**[${fmt(s.start)}]** ${s.text}`).join('  \n');
            out.push(paragraph + '\n');
        }
        return out.join('\n');
    }

    async analyze(mediaPath, mediaType = 'audio', clientContext = null) {
        const isImage = mediaType === 'image';
        console.log(`[LocalTranscriber] Analisando ${isImage ? 'Visual' : 'Áudio'}...`);

        if (!fs.existsSync(mediaPath)) return `_Arquivo ausente._`;

        // LÓGICA DE ÁUDIO (Local Whisper)
        if (!isImage) {
            const localText = await this.transcribeLocally(mediaPath);
            if (localText) return localText;
            
            // Fallback para Visão se Áudio falhar totalmente
            console.log(`[LocalTranscriber] Áudio falhou. Recorrendo à análise visual de frames via OpenRouter...`);
            const screenshotsDir = path.join(path.dirname(mediaPath), 'Screenshots');
            if (fs.existsSync(screenshotsDir)) {
                const files = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.jpg')).sort();
                if (files.length > 0) return await this.analyze(path.join(screenshotsDir, files[0]), 'image');
            }
            return `_Erro: Falha na transcrição e no fallback visual._`;
        }

        // LÓGICA VISUAL — Gemini primário, OpenRouter fallback.
        // Prompt estruturado em PT-BR: seção de TEXTO com rótulo explícito (o
        // parser downstream extrai daqui — sem preâmbulo em inglês que virava
        // ruído) + leitura visual + gatilhos. Opcionalmente, uma leitura de
        // modelagem para o cliente (o benchmark já sai client-aware).
        const blocoCliente = clientContext ? `

## 💡 Ângulo de modelagem para ${clientContext.nome || 'o cliente'}
Considerando os pilares do cliente (${(clientContext.pilares || []).join(', ') || 'n/d'}) e a regra de HOOK por benefício simples: em 1-2 frases, qual é o ângulo/gancho DESTE criativo que vale modelar — e o que adaptar para caber na voz do cliente (sem jargão, direto ao benefício)?` : '';

        const prompt = `Você é um analista de criativos. Responda SEMPRE em português do Brasil, no formato EXATO abaixo (mantenha os títulos com ##):

## Texto no slide
Transcreva AQUI, verbatim, TODO o texto visível na imagem — uma linha por frase, sem comentar. Se não houver texto, escreva "(sem texto)".

## Leitura visual
Cores, composição, mood e elementos em 1-2 frases.

## Gatilhos de design
Liste os gatilhos de atenção/retenção usados (ex.: contraste, pergunta, número, prova).${blocoCliente}`;

        // Tier 1: Gemini (chave válida no .env)
        const geminiResult = await this.analyzeImageWithGemini(mediaPath, prompt);
        if (geminiResult) return geminiResult;

        // Tier 2: OpenRouter com roteamento DINÂMICO (VEX-14).
        // A lista fixa daqui apodreceu inteira — os 4 modelos sumiram do
        // catálogo e a visão passou a falhar em silêncio. Agora perguntamos ao
        // catálogo quais modelos free existem AGORA.
        const base64Data = fs.readFileSync(mediaPath).toString('base64');
        let lastError = null;

        const modelos = await discoverFreeVisionModels();
        for (const model of modelos) {
            try {
                console.log(`[LocalTranscriber] OpenRouter Vision: Tentando ${model}...`);
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${this.openRouterKey}`,
                        "HTTP-Referer": "https://github.com/google/gemini-cli",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": [{
                            "role": "user",
                            "content": [
                                { "type": "text", "text": prompt },
                                { "type": "image_url", "image_url": { "url": `data:image/jpeg;base64,${base64Data}` } }
                            ]
                        }]
                    })
                });

                const data = await response.json();
                if (response.ok && data.choices && data.choices[0]) {
                    console.log(`[LocalTranscriber] Sucesso visual com ${model}!`);
                    return data.choices[0].message.content.trim();
                }
                lastError = new Error(data.error?.message || response.statusText);
                console.warn(`[LocalTranscriber] Modelo ${model} falhou: ${lastError.message}`);
            } catch (e) {
                lastError = e;
            }
        }

        return `_Erro Final na Visão: ${lastError ? lastError.message : 'Falha total de modelos'}_`;
    }
}

module.exports = LocalTranscriber;
