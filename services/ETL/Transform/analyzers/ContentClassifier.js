/**
 * ContentClassifier — decide qual Analyzer usar com base em URL + metadata + assets disponíveis.
 *
 * Tipos retornados:
 *  - 'video-short'    → IG Reel | TikTok video | YT Shorts | YT < 5min
 *  - 'video-long'     → YouTube > 5min (precisa segmentar)
 *  - 'image-single'   → IG post estático (1 imagem)
 *  - 'carousel'       → IG carrossel | TikTok carrossel (>= 2 imagens)
 *  - 'unknown'        → fallback (gera só metadata)
 */
class ContentClassifier {
    static classify({ url, platform, downloaderType, videoPath, images, metadata }) {
        const dur = Number((metadata && metadata.duration) || 0);

        const isYouTube = platform === 'youtube' || /youtube\.com/.test(url);
        const isYTShort = /youtube\.com\/shorts/.test(url);
        const isInstagram = platform === 'instagram' || /instagram\.com/.test(url);
        const isTikTok = platform === 'tiktok' || /tiktok\.com/.test(url);
        const isReel = /\/reel\//.test(url);
        const isPost = /instagram\.com\/[^/]+\/p\//.test(url);

        // Carousel: 2+ images extraídas pelo downloader
        if (Array.isArray(images) && images.length >= 2) {
            return { type: 'carousel', engine: 'ImageAnalyzer', subtype: isTikTok ? 'tiktok-carousel' : 'ig-carousel' };
        }

        // Single image
        if (Array.isArray(images) && images.length === 1) {
            return { type: 'image-single', engine: 'ImageAnalyzer', subtype: isTikTok ? 'tiktok-image' : 'ig-image' };
        }

        // Video paths
        if (videoPath) {
            if (isYouTube && !isYTShort && dur > 300) {
                return { type: 'video-long', engine: 'VideoAnalyzer', subtype: 'youtube-long' };
            }
            const subtype = isYTShort ? 'youtube-short'
                : isReel ? 'ig-reel'
                : isTikTok ? 'tiktok-video'
                : isYouTube ? 'youtube-short'
                : 'video';
            return { type: 'video-short', engine: 'VideoAnalyzer', subtype };
        }

        // Without video, without images — tenta inferir por URL
        if (downloaderType === 'video') {
            return { type: 'video-short', engine: 'VideoAnalyzer', subtype: isReel ? 'ig-reel' : (isTikTok ? 'tiktok-video' : 'video'), degraded: true };
        }
        if (isPost) {
            return { type: 'image-single', engine: 'ImageAnalyzer', subtype: 'ig-image', degraded: true };
        }

        return { type: 'unknown', engine: 'NoneAnalyzer', subtype: 'unknown', degraded: true };
    }
}

module.exports = ContentClassifier;
