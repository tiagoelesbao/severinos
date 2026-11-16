const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { resolveCookies, looksLikeAuthFailure, SESSION_FILES } = require('./auth/session-bridge');
const { ensureYtDlpFresh } = require('./toolchain');

/**
 * Downloader Module: Viral ETL
 * Usa yt-dlp local para baixar vídeos de IG, TT, YT, LI.
 */
class Downloader {
    constructor(outputDir = '.aiox/tmp/downloads') {
        this.outputDir = path.resolve(outputDir);
        // Caminho para o binário local baixado
        this.binPath = path.resolve(__dirname, '..', 'bin', 'yt-dlp.exe');

        if (!fs.existsSync(this.outputDir)) fs.mkdirSync(this.outputDir, { recursive: true });
    }

    /**
     * Diretório isolado por execução (VEX-14).
     * Substitui o filtro por prefixo de timestamp truncado, que descartava
     * downloads longos, e o `files[0]` por mtime, que podia adotar o vídeo de
     * outra execução.
     */
    createRunDir() {
        this.sweepStaleRunDirs();
        const runDir = path.join(this.outputDir, `run_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`);
        fs.mkdirSync(runDir, { recursive: true });
        return runDir;
    }

    /**
     * Remove runDirs de execuções passadas. Sem isto, isolar por execução apenas
     * trocaria a colisão de arquivos por um vazamento de disco — o outputDir já
     * acumulava GBs de downloads órfãos.
     * Não-fatal e conservador: só mexe em `run_*` mais velhos que maxAgeHours.
     */
    sweepStaleRunDirs(maxAgeHours = 6) {
        try {
            const cutoff = Date.now() - maxAgeHours * 3600000;
            for (const entry of fs.readdirSync(this.outputDir)) {
                if (!entry.startsWith('run_')) continue;
                const full = path.join(this.outputDir, entry);
                const stat = fs.statSync(full);
                if (stat.isDirectory() && stat.mtimeMs < cutoff) {
                    fs.rmSync(full, { recursive: true, force: true });
                }
            }
        } catch (_) { /* limpeza é higiene, não requisito */ }
    }

    /** Coleta os arquivos de UMA execução — sem ambiguidade, o diretório é só dela. */
    collectRunFiles(runDir) {
        if (!fs.existsSync(runDir)) return { videoFile: null, imageFiles: [], infoJsonFile: null };

        const files = fs.readdirSync(runDir);
        return {
            infoJsonFile: files.find(f => f.endsWith('.info.json')) || null,
            videoFile: files.find(f => /\.(mp4|webm|mkv|mov|avi|flv)$/i.test(f)) || null,
            imageFiles: files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        };
    }

    /** Monta o resultado a partir dos arquivos coletados, lendo o info.json. */
    buildResult({ videoFile, imageFiles, infoJsonFile }, runDir) {
        let metadata = {};
        if (infoJsonFile) {
            const fullPath = path.join(runDir, infoJsonFile);
            try {
                const fullInfo = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                metadata = {
                    title: fullInfo.title || "Unknown Title",
                    description: fullInfo.description || "",
                    author: fullInfo.uploader || fullInfo.channel || "Unknown",
                    duration: fullInfo.duration,
                    view_count: fullInfo.view_count,
                    like_count: fullInfo.like_count,
                    thumbnail: fullInfo.thumbnail
                };
                fs.unlinkSync(fullPath);
            } catch (e) {
                console.error("[Downloader] Failed to parse info JSON", e.message);
            }
        }

        return {
            videoPath: videoFile ? path.join(runDir, videoFile) : null,
            images: imageFiles.map(img => path.join(runDir, img)),
            metadata,
            status: 'success'
        };
    }

    /** Mantém o yt-dlp atualizado (não-fatal). Idempotente via stamp. */
    ensureToolchain(maxAgeDays) {
        const result = ensureYtDlpFresh(this.binPath, maxAgeDays !== undefined ? { maxAgeDays } : {});
        if (result.warning) console.warn(`[Downloader] ${result.warning}`);
        return result;
    }

    async probe(url) {
        const platform = url.includes('instagram') ? 'instagram' :
                        url.includes('tiktok') ? 'tiktok' :
                        url.includes('youtube') ? 'youtube' :
                        url.includes('linkedin') ? 'linkedin' : 'unknown';

        const isVideoLink = ['reel', 'video', 'watch', 'shorts'].some(p => url.includes(p)) || 
                           (platform === 'tiktok') || 
                           (platform === 'linkedin' && url.includes('activity-'));

        return {
            platform,
            type: isVideoLink ? 'video' : 'post'
        };
    }

    async downloadMetadata(url) {
        console.log(`[Downloader] Fetching metadata via HTML fallback: ${url}`);
        try {
            const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' } });
            const html = await response.text();
            
            // Helper to clean entities
            const clean = (str) => str ? str.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim() : "";

            const title = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["'](.*?)["']/i)?.[1] || 
                          html.match(/<title>(.*?)<\/title>/i)?.[1] || "";
            
            let description = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["'](.*?)["']/i)?.[1] || 
                              html.match(/<meta[^>]+name=["']description["'][^>]+content=["'](.*?)["']/i)?.[1] || "";
            
            const image = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["'](.*?)["']/i)?.[1] || "";
            
            return {
                title: clean(title),
                description: clean(description),
                thumbnail: image,
                author: clean(title).split(' on ')[1] || ""
            };
        } catch (e) {
            console.error(`[Downloader] HTML metadata extraction failed: ${e.message}`);
            return { title: "", description: "", author: "" };
        }
    }

    /**
     * Download using yt-dlp with browser cookies (--cookies-from-browser chrome).
     * This is the simplest method - no manual cookie export needed.
     */
    async downloadWithBrowserCookies(url) {
        console.log(`[Downloader] Downloading via Chrome browser cookies...`);

        const bin = fs.existsSync(this.binPath) ? `"${this.binPath}"` : 'yt-dlp';
        // VEX-14: diretório por execução aqui também — o `files[0]` por mtime do
        // outputDir inteiro podia adotar o vídeo de outra execução.
        const runDir = this.createRunDir();
        const outputTemplate = path.join(runDir, `content_%(id)s.%(ext)s`);

        // Step 1: Download video using yt-dlp with browser cookies
        console.log(`[Downloader] Running: yt-dlp --cookies-from-browser chrome ...`);
        const downloadCmd = `${bin} --cookies-from-browser chrome --no-check-certificates -f "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[ext=mp4]/best" -o "${outputTemplate}" "${url}"`;

        try {
            execSync(downloadCmd, {
                stdio: 'inherit',
                timeout: 300000, // 5 minutes
                windowsHide: true
            });
        } catch (e) {
            throw new Error(`yt-dlp download with browser cookies failed: ${e.message}`);
        }

        // Step 2: Find downloaded video (só arquivos DESTA execução)
        const { videoFile: foundVideo } = this.collectRunFiles(runDir);
        if (!foundVideo) {
            throw new Error('No video file found after download');
        }

        const videoFile = path.join(runDir, foundVideo);
        const videoName = foundVideo;
        const size = fs.statSync(videoFile).size;
        console.log(`[Downloader] Video downloaded via Chrome: ${videoName} (${(size / 1024 / 1024).toFixed(1)} MB)`);

        // Step 3: Extract metadata
        let metadata = {};
        try {
            const infoCmd = `${bin} --cookies-from-browser chrome --dump-json --no-check-certificates "${url}"`;
            const jsonStr = execSync(infoCmd, {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 60000
            }).toString();
            const info = JSON.parse(jsonStr);
            metadata = {
                title: info.title || videoName.replace(/\.[^.]+$/, ''),
                description: info.description || "",
                author: info.uploader || info.channel || "Unknown",
                duration: info.duration,
                view_count: info.view_count,
                like_count: info.like_count,
                thumbnail: info.thumbnail
            };
        } catch (e) {
            console.warn(`[Downloader] Metadata extraction failed: ${e.message}`);
            metadata = { title: videoName.replace(/\.[^.]+$/, ''), description: "" };
        }

        return {
            videoPath: videoFile,
            images: [],
            metadata,
            status: 'success'
        };
    }

    /**
     * Usa o bot Python do YouTube para download mais confiável
     * @param {string} url - URL do vídeo
     * @param {string|null} cookiesPath - Caminho dos cookies (null = sem cookies)
     */
    async downloadWithPythonBot(url, cookiesPath = null, maxDuration = 600) {
        const botDir = 'C:\\Users\\Pichau\\Desktop\\Sistemas\\SaAS\\Bot_youtube';
        const cookiesFile = path.join(botDir, 'youtube.com_cookies.txt');
        const ffmpegPath = path.join(botDir, 'ffmpeg-7.1.1-essentials_build', 'bin');

        if (!fs.existsSync(path.join(botDir, 'boyt_yt.py'))) {
            throw new Error('Python bot not found');
        }

        console.log(`[Downloader] Using Python YouTube bot...`);

        // Create a temp Python script that downloads a single video
        // VEX-14: runDir isolado — o `files[0]` por mtime do outputDir inteiro
        // podia adotar o vídeo de outra execução.
        const runDir = this.createRunDir();
        const tempScript = path.join(runDir, `temp_dl_${Date.now()}.py`);
        const outputDir = runDir;

        const effectiveCookies = cookiesPath || (fs.existsSync(cookiesFile) ? cookiesFile : null);
        // Sem isto, `effectiveCookies.replace(...)` abaixo lança TypeError quando
        // não há cookie algum — o template literal avalia as duas ramificações.
        const cookiesLiteral = effectiveCookies ? effectiveCookies.replace(/\\/g, '/') : '';

        const pythonScript = `
import sys
import os
import json
sys.path.insert(0, '${botDir.replace(/\\/g, '/')}')
os.environ['PATH'] = r'${ffmpegPath.replace(/\\/g, '/')};' + os.environ.get('PATH', '')

from boyt_yt import check_ffmpeg_installed
import yt_dlp

url = '${url}'
output = r'${outputDir}'
cookies = r'${cookiesLiteral}' if ${effectiveCookies ? 'True' : 'False'} and os.path.isfile(r'${cookiesLiteral}') else None
ffmpeg = check_ffmpeg_installed()

print(f"[Python Bot] Downloading: {url}")
print(f"[Python Bot] FFmpeg: {ffmpeg}, Cookies: {bool(cookies)}")

# Use lower quality for faster processing (480p max)
ydl_opts = {
    'format': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[ext=mp4]/best',
    'outtmpl': os.path.join(output, '%(title)s.%(ext)s'),
    'quiet': False,
    'no_warnings': False,
    'no_check_certificate': True,
    'geo_bypass': True,
    'retries': 3,
    'fragment_retries': 3,
    'merge_output_format': 'mp4' if ffmpeg else None,
    # JS runtime for solving YouTube n-challenges (requires yt-dlp >= 2026.3 + EJS 0.8.0)
    'js_runtimes': {'node': {}},
    'remote_components': ['ejs:github'],
}

if cookies:
    ydl_opts['cookiefile'] = cookies

print(f"[Python Bot] Quality: 480p max (optimized for benchmark)")
print(f"[Python Bot] JS Runtime: Node.js + EJS remote component")

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        if info is None:
            print(f"[Python Bot] Error: Could not get video info")
            sys.exit(1)
        downloaded_file = ydl.prepare_filename(info)
        title = info.get('title', 'unknown')
        duration = info.get('duration', 0)
        format_count = len(info.get('formats', []))
        print(f"[Python Bot] Result: success")
        print(f"[Python Bot] File: {downloaded_file}")
        print(f"[Python Bot] Title: {title}")
        print(f"[Python Bot] Duration: {duration}s")
        print(f"[Python Bot] Formats: {format_count}")
        # Write info JSON for metadata extraction
        info_json = json.dumps({
            'title': title,
            'description': info.get('description', ''),
            'uploader': info.get('uploader', 'Unknown'),
            'channel': info.get('channel', ''),
            'duration': duration,
            'view_count': info.get('view_count'),
            'like_count': info.get('like_count'),
            'thumbnail': info.get('thumbnail')
        })
        info_file = downloaded_file + '.info.json'
        with open(info_file, 'w', encoding='utf-8') as f:
            f.write(info_json)
        print(f"[Python Bot] Info JSON written to: {info_file}")
except Exception as e:
    print(f"[Python Bot] Error: {str(e)}")
    sys.exit(1)
`;

        fs.writeFileSync(tempScript, pythonScript);

        try {
            const { execSync } = require('child_process');
            console.log(`[Downloader] Running Python bot script...`);
            execSync(`python "${tempScript}"`, {
                stdio: 'inherit',
                timeout: 300000, // 5 minutes
                windowsHide: true
            });

            // Find downloaded video file (só arquivos DESTA execução)
            const { videoFile: foundVideo } = this.collectRunFiles(runDir);
            const files = foundVideo ? [{ name: foundVideo, path: path.join(runDir, foundVideo) }] : [];
            const infoJsonFile = foundVideo ? path.join(runDir, foundVideo) + '.info.json' : null;

            if (files.length > 0) {
                const videoFile = files[0].path;
                const size = fs.statSync(videoFile).size;
                const videoName = files[0].name;
                console.log(`[Downloader] Video downloaded: ${videoName} (${(size / 1024 / 1024).toFixed(1)} MB)`);

                // Extract metadata from info JSON or yt-dlp
                let metadata = {};
                if (infoJsonFile && fs.existsSync(infoJsonFile)) {
                    try {
                        const infoData = JSON.parse(fs.readFileSync(infoJsonFile, 'utf8'));
                        metadata = {
                            title: infoData.title || videoName.replace(/\.[^.]+$/, ''),
                            description: infoData.description || "",
                            author: infoData.uploader || infoData.channel || "Unknown",
                            duration: infoData.duration,
                            view_count: infoData.view_count,
                            like_count: infoData.like_count,
                            thumbnail: infoData.thumbnail
                        };
                    } catch (e) {
                        console.warn(`[Downloader] Failed to read info JSON: ${e.message}`);
                        metadata = { title: videoName.replace(/\.[^.]+$/, ''), description: "" };
                    }
                } else {
                    // Fallback to yt-dlp --dump-json
                    try {
                        const bin = fs.existsSync(this.binPath) ? `"${this.binPath}"` : 'yt-dlp';
                        const cookiesFlag = fs.existsSync(cookiesFile) ? `--cookies "${cookiesFile}"` : '';
                        const jsonStr = execSync(`${bin} --dump-json --no-check-certificates ${cookiesFlag} "${url}"`, {
                            stdio: ['pipe', 'pipe', 'pipe'],
                            timeout: 60000
                        }).toString();
                        const info = JSON.parse(jsonStr);
                        metadata = {
                            title: info.title || videoName.replace(/\.[^.]+$/, ''),
                            description: info.description || "",
                            author: info.uploader || info.channel || "Unknown",
                            duration: info.duration,
                            view_count: info.view_count,
                            like_count: info.like_count,
                            thumbnail: info.thumbnail
                        };
                    } catch (e) {
                        metadata = { title: videoName.replace(/\.[^.]+$/, ''), description: "" };
                    }
                }

                return {
                    videoPath: videoFile,
                    images: [],
                    metadata,
                    status: 'success'
                };
            }

            throw new Error('No video file found after Python bot execution');
        } finally {
            // Cleanup temp script
            try { fs.unlinkSync(tempScript); } catch (_) {}
        }
    }

    async download(url) {
        const { platform, type } = await this.probe(url);

        // Segmentação: Post/Carrossel de Instagram (/p/)
        if (platform === 'instagram' && type === 'post' && url.includes('/p/')) {
            console.log(`[Downloader] Instagram Post/Carousel: ${url}`);

            // VEX-14 — via EMBED, sem sessão. O caminho antigo (CarouselScraper)
            // dependia de login no Playwright, e o IG derruba sessão de
            // automação: o resultado eram 15 prints do modal "Sign up / Log in".
            // O embed é público por design e entrega os slides do CDN em
            // resolução original — baixar > fotografar a tela.
            try {
                const EmbedScraper = require('./scrapers/instagram-embed');
                const embed = new EmbedScraper();
                await embed.init();
                const dados = await embed.extract(url, this.createRunDir());
                await embed.close();

                if (dados.status === 'success' && dados.images.length > 0) {
                    return {
                        videoPath: null,
                        images: dados.images,
                        metadata: {
                            title: dados.title || 'Instagram Post',
                            description: dados.description || "",
                            author: dados.author || "Unknown",
                            thumbnail: dados.images[0] || null,
                            like_count: dados.like_count,
                            comment_count: dados.comment_count
                        },
                        status: 'success'
                    };
                }
                console.warn(`[Downloader] Embed sem assets (${dados.status}: ${dados.error || '—'}) — tentando scraper autenticado...`);
            } catch (embedErr) {
                console.warn(`[Downloader] EmbedScraper falhou: ${embedErr.message} — tentando scraper autenticado...`);
            }

            // Fallback: scraper com sessão. Só vale a pena se houver sessão viva;
            // ele agora aborta com auth_required em vez de fotografar o modal.
            try {
                const CarouselScraper = require('./scrapers/instagram-carousel');
                const scraper = new CarouselScraper();
                await scraper.init();
                const scrapedData = await scraper.extract(url, this.outputDir);
                await scraper.close();

                if (scrapedData.status === 'success' && scrapedData.images && scrapedData.images.length > 0) {
                    return {
                        videoPath: null,
                        images: scrapedData.images,
                        metadata: {
                            title: scrapedData.title || 'Instagram Post',
                            description: scrapedData.description || "",
                            author: scrapedData.author || "Unknown",
                            thumbnail: scrapedData.images[0] || null,
                            raw_meta: scrapedData.raw_meta || ""
                        },
                        status: 'success'
                    };
                }
                if (scrapedData.status === 'auth_required') {
                    console.warn(`[Downloader] Sessão do IG inativa — o embed já era a aposta principal.`);
                }
            } catch (scErr) {
                console.error(`[Downloader] InstagramCarouselScraper failed:`, scErr.message);
            }
        }

        // Segmentação: LinkedIn posts com sessão autenticada
        if (platform === 'linkedin' && (url.includes('/feed/update/') || url.includes('/posts/'))) {
            console.log(`[Downloader] Specialized LinkedIn Post detected: ${url}`);
            try {
                const LinkedInScraper = require('./scrapers/linkedin');
                const scraper = new LinkedInScraper();
                await scraper.init();
                const scrapedData = await scraper.extract(url);
                await scraper.close();

                if (scrapedData.status === 'success' || scrapedData.description) {
                    return {
                        videoPath: null,
                        images: [],
                        metadata: {
                            title: scrapedData.title || 'LinkedIn Post',
                            description: scrapedData.description || "",
                            author: scrapedData.author || "Unknown",
                            thumbnail: scrapedData.imageUrl || null,
                            like_count: scrapedData.likes || null,
                            comment_count: scrapedData.comments || null
                        },
                        status: scrapedData.status || 'metadata_only'
                    };
                }
            } catch (liErr) {
                console.error(`[Downloader] LinkedInScraper failed:`, liErr.message);
            }
        }

        // Fluxo de Vídeo — tenta yt-dlp local OU Python bot do YouTube
        // VEX-14: diretório POR EXECUÇÃO. O filtro antigo era por prefixo de
        // timestamp truncado (muda a cada ~100s), então download demorado era
        // baixado e descartado. Isolar a execução mata a classe inteira do bug.
        const runDir = this.createRunDir();
        const outputPath = path.join(runDir, `content_%(id)s_%(n)s.%(ext)s`);

        console.log(`[Downloader] Attempting extraction via yt-dlp: ${url}`);

        try {
            // VEX-14: cookie POR PLATAFORMA. Antes, o cookie do Bot_youtube era
            // usado para tudo (inclusive Instagram) porque o `if` não olhava a
            // plataforma — e o path do cookie local apontava para um diretório
            // vazio.
            const cookiesPath = resolveCookies(platform);
            const cookiesFlag = cookiesPath ? `--cookies "${cookiesPath}"` : '';
            if (cookiesPath) console.log(`[Downloader] Cookies de ${platform}: ${path.basename(cookiesPath)}`);

            const bin = fs.existsSync(this.binPath) ? `"${this.binPath}"` : 'yt-dlp';

            // Important: we try to force mp4 for better compatibility, but fallback to any format if needed.
            const cmd = `${bin} --write-info-json --no-check-certificates ${cookiesFlag} -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "${outputPath}" "${url}"`;
            
            try {
                execSync(cmd, { stdio: 'pipe' });
            } catch (dlError) {
                console.warn(`[Downloader] yt-dlp failed for ${url}. Trying without forced mp4...`);
                // Retry without forcing mp4 if it failed (some old videos might not have it)
                try {
                    const fallbackCmd = `${bin} --write-info-json --no-check-certificates ${cookiesFlag} -o "${outputPath}" "${url}"`;
                    execSync(fallbackCmd, { stdio: 'pipe' });
                } catch (retryError) {
                    const errText = (retryError.stderr && retryError.stderr.toString()) || retryError.message || '';
                    console.warn(`[Downloader] yt-dlp final failure for ${url}.`);

                    // VEX-14: só AGORA tentamos autenticar, e só se o erro cheirar
                    // a auth. Com o yt-dlp atual o conteúdo público baixa sem
                    // cookie — cookie era o suspeito errado.
                    if (looksLikeAuthFailure(errText) && SESSION_FILES[platform]) {
                        const bridged = resolveCookies(platform, { preferSession: true });
                        if (bridged && bridged !== cookiesPath) {
                            console.log(`[Downloader] Erro parece de autenticação — repetindo com sessão do ${platform}...`);
                            try {
                                execSync(`${bin} --write-info-json --no-check-certificates --cookies "${bridged}" -o "${outputPath}" "${url}"`,
                                         { stdio: 'pipe', windowsHide: true });
                                const retried = this.collectRunFiles(runDir);
                                if (retried.videoFile || retried.imageFiles.length > 0) {
                                    console.log(`[Downloader] Sessão resolveu o download.`);
                                    return this.buildResult(retried, runDir);
                                }
                            } catch (bridgeErr) {
                                console.warn(`[Downloader] Retry com sessão também falhou.`);
                            }
                        }
                    }

                    // YouTube: browser-cookies por ÚLTIMO. Falha sempre com o
                    // Chrome aberto (lock do DPAPI), então liderar com ele era
                    // custo fixo desperdiçado por criativo.
                    if (platform === 'youtube') {
                        try {
                            const result = await this.downloadWithPythonBot(url, null);
                            if (result && result.status === 'success') return result;
                        } catch (pyErr) {
                            console.log(`[Downloader] Python bot falhou: ${pyErr.message}`);
                        }
                        try {
                            const result = await this.downloadWithBrowserCookies(url);
                            if (result && result.status === 'success') return result;
                        } catch (browserErr) {
                            console.log(`[Downloader] Browser cookies falhou: ${browserErr.message}`);
                        }
                    }

                    // Fallback do Instagram: resgata a THUMBNAIL. Devolve
                    // status 'metadata_only' mesmo com imagem — chamar isso de
                    // 'success' foi o que fez 5 reels virarem "posts estáticos"
                    // em 2026-07-11. Uma capa não é o criativo.
                    if (platform === 'instagram') {
                        console.log(`[Downloader] Trying InstagramScraper fallback after yt-dlp failure...`);
                        try {
                            const InstagramScraper = require('./scrapers/instagram');
                            const scraper = new InstagramScraper();
                            await scraper.init();
                            const scrapedData = await scraper.extract(url, runDir);
                            await scraper.close();

                            if (scrapedData.status === 'success' || (scrapedData.images && scrapedData.images.length > 0)) {
                                const isVideoUrl = type === 'video';
                                return {
                                    videoPath: null,
                                    images: scrapedData.images || [],
                                    metadata: {
                                        title: scrapedData.title,
                                        description: scrapedData.description,
                                        author: scrapedData.author,
                                        thumbnail: scrapedData.imageUrl
                                    },
                                    status: (scrapedData.images.length > 0 && !isVideoUrl) ? 'success' : 'metadata_only'
                                };
                            }
                        } catch (scErr) {
                            console.error(`[Downloader] InstagramScraper fallback failed:`, scErr.message);
                        }
                    }

                    console.log(`[Downloader] Falling back to metadata only HTML.`);
                    const metadata = await this.downloadMetadata(url);
                    return { videoPath: null, images: [], metadata, status: 'metadata_only' };
                }
            }

            const collected = this.collectRunFiles(runDir);
            if (collected.videoFile || collected.imageFiles.length > 0) {
                return this.buildResult(collected, runDir);
            }
            
            const metadataFallback = await this.downloadMetadata(url);
            return { videoPath: null, images: [], metadata: metadataFallback, status: 'metadata_only' };
        } catch (error) {
            console.error(`[Downloader] Error in download process:`, error.message);
            throw error;
        }
    }

    cleanup(filePath) {
        if (filePath && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch(e) {}
        }
    }
}

module.exports = Downloader;
