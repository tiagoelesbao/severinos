const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Universal Authenticated Scraper
 * Uses asset-based discovery to bypass class name obfuscation in logged-in sessions.
 */
class InstagramCarouselScraper {
    constructor(options = {}) {
        this.options = { headless: true, ...options };
    }

    async init() {
        this.browser = await chromium.launch({ headless: this.options.headless });
        const authPath = path.resolve(__dirname, '..', 'auth', 'instagram_session.json');
        
        const contextOptions = {
            viewport: { width: 1280, height: 1080 },
            deviceScaleFactor: 2
        };

        if (fs.existsSync(authPath)) {
            console.log(`[CarouselScraper] Running with Authenticated Session.`);
            this.context = await this.browser.newContext({ ...contextOptions, storageState: authPath });
        } else {
            this.context = await this.browser.newContext(contextOptions);
        }
    }

    async extract(url, downloadDir) {
        const page = await this.context.newPage();
        console.log(`[CarouselScraper] Targeting: ${url}`);

        const results = { 
            url, 
            title: 'Instagram Post',
            description: '', 
            author: 'Unknown',
            like_count: null,
            comment_count: null,
            images: [], 
            status: 'error' 
        };

        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(5000); 

            // BYPASS: Handle "Continue as..." or "Switch accounts" screen
            let continueBtn = page.locator('div[role="button"]:has-text("Continue"), button:has-text("Continue"), div[aria-label*="Continue"]').first();
            if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
                console.log(`[CarouselScraper] Detected "Continue" button, clicking to bypass...`);
                await continueBtn.click();
                await page.waitForTimeout(10000);
                
                // If redirected to home or still on login-like page, go back to the post URL
                const currentUrl = page.url();
                if (currentUrl.includes('/accounts/login') || currentUrl === 'https://www.instagram.com/' || currentUrl === 'https://www.instagram.com') {
                    console.log(`[CarouselScraper] Redirected or stuck, re-navigating to post URL...`);
                    await page.goto(url, { waitUntil: 'domcontentloaded' });
                    await page.waitForTimeout(5000);
                }
            }

            // Sometimes the "Continue" button appears again after navigation
            continueBtn = page.locator('div[role="button"]:has-text("Continue"), button:has-text("Continue"), div[aria-label*="Continue"]').first();
            if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await continueBtn.click();
                await page.waitForTimeout(5000);
            }

            await page.keyboard.press('Escape');
            await page.waitForTimeout(2000);

            // GUARD DE SESSÃO (VEX-14): sem isto, um login wall vira 15 prints
            // idênticos do modal "Sign up / Log in" — que o pipeline aceitava
            // como sucesso e mandava para auditoria como se fosse o criativo.
            // Falhar aqui é barato; falhar depois custa 15 chamadas de visão e
            // contamina a análise estratégica.
            const sessao = await page.evaluate(() => {
                const texto = document.body.innerText || '';
                return {
                    loginWall: (texto.includes('Sign up') && texto.includes('Log in')) ||
                               texto.includes('Continue as') ||
                               !!document.querySelector('input[name="username"]'),
                    temPost: !!document.querySelector('article img[src*="cdn"], article img[src*="fbcdn"]')
                };
            });

            if (sessao.loginWall && !sessao.temPost) {
                console.error(`[CarouselScraper] ❌ LOGIN WALL — a sessão do Instagram não está ativa no navegador.`);
                console.error(`[CarouselScraper]    O IG está servindo a tela de login em vez do post.`);
                console.error(`[CarouselScraper]    Renove a sessão: node services/ETL/Extract/scrapers/ig-login.js`);
                results.status = 'auth_required';
                results.error = 'login wall — sessão do Instagram inativa no navegador';
                await page.close();
                return results;
            }

            // EXPAND CAPTION (Click "more")
            let expandedCaption = false;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    const moreButton = page.locator('span:has-text("...more"), span:has-text("... mais"), button:has-text("more"), button:has-text("mais")').first();
                    if (await moreButton.isVisible({ timeout: 2000 })) {
                        await moreButton.click({ force: true });
                        await page.waitForTimeout(1500);
                        expandedCaption = true;
                        break;
                    }
                } catch (_) {
                    // Button not found or not visible — try next attempt
                    await page.waitForTimeout(1000);
                }
            }

            // METADATA EXTRACTION — Multi-strategy caption harvesting
            const metadata = await page.evaluate(() => {
                const getMeta = (name) => {
                    const el = document.querySelector(`meta[property="${name}"]`) || document.querySelector(`meta[name="${name}"]`);
                    return el ? el.content : '';
                };

                // === STRATEGY 1: Extract from og:description (usually full caption) ===
                let caption = getMeta('og:description') || getMeta('description');

                // Clean og:description — Instagram format: "X likes, Y comments - user: caption" or "user on DATE: caption"
                if (caption) {
                    // Remove "X likes, Y comments - username on Date: " or similar metadata prefix
                    caption = caption.replace(/^\d+[KMBkmb]?\s*likes?,?\s*\d+\s*comments?\s*[-–—]\s*/i, '');
                    caption = caption.replace(/^\w+\s+on\s+\w+\s+\d+,\s*\d+\s*:\s*/i, '');
                    // Remove leading/trailing quotes and trailing quote+period artifacts
                    caption = caption.replace(/^[""]|[""]\s*\.?\s*$/g, '').trim();
                }

                // === STRATEGY 2: Extract from specific caption containers ===
                if (!caption || caption.length < 30) {
                    const captionSelectors = [
                        'h1._ap3a',
                        'div._a9zs span._ap3a',
                        'article div span.x193iq5w',
                        'article div[class*="x193iq5w"] span',
                        'div[role="dialog"] span._ap3a',
                        'section main article span',
                    ];

                    for (const selector of captionSelectors) {
                        const spans = document.querySelectorAll(selector);
                        for (const span of spans) {
                            const text = span.innerText.trim();
                            // Caption is usually the longest text block that's not metadata
                            if (text.length > 30 &&
                                !text.startsWith('Liked by') &&
                                !text.startsWith('Curtido por') &&
                                !text.includes('comments') &&
                                !text.includes('comentários') &&
                                !/^\d+[KMBkmb]?\s*likes?/i.test(text) &&
                                text.length > (caption || '').length) {
                                caption = text;
                            }
                        }
                    }
                }

                // === STRATEGY 3: Fallback — parse article text intelligently ===
                if (!caption || caption.length < 30) {
                    const article = document.querySelector('article');
                    if (article) {
                        const allText = article.innerText;
                        const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 10);

                        // Skip metadata lines (likes, comments, username, date)
                        let captionStart = 0;
                        for (let i = 0; i < Math.min(lines.length, 8); i++) {
                            const line = lines[i].toLowerCase();
                            if (/^\d+[kmb]?\s*likes?/i.test(line) ||
                                /^\d+\s*comments?/i.test(line) ||
                                line.includes('liked by') || line.includes('curtido por') ||
                                line.includes('followers') || line.includes('seguidores') ||
                                line.includes('comment') || line.includes('comentário') ||
                                /^\w+\s+on\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i.test(line)) {
                                captionStart = i + 1;
                            }
                        }

                        // Take from captionStart onwards, join meaningful lines
                        const captionLines = lines.slice(captionStart).filter(l => l.length > 15);
                        if (captionLines.length > 0) {
                            caption = captionLines.join('\n\n');
                        }
                    }
                }

                // Autor
                let author = getMeta('article:author') || '';
                if (!author) {
                    const authorSelectors = [
                        'header a._a6hd',
                        'header a.x1i10hfl',
                        'a[role="link"] span._ap3a',
                        'article header a'
                    ];
                    for (const selector of authorSelectors) {
                        const el = document.querySelector(selector);
                        if (el && el.innerText.trim()) {
                            author = el.innerText.trim();
                            break;
                        }
                    }
                }

                // Like count
                let likeCount = null;
                const likeEl = document.querySelector('a[href*="liked_by"] span, span[class*="x1lliihq"]');
                if (likeEl) {
                    const match = likeEl.innerText.match(/^([\d,.]+[KMBkmb]?)/);
                    if (match) likeCount = match[1];
                }

                // Comment count
                let commentCount = null;
                const commentEl = document.querySelector('a[href*="comments"] span');
                if (commentEl) {
                    const match = commentEl.innerText.match(/^([\d,.]+[KMBkmb]?)/);
                    if (match) commentCount = match[1];
                }

                return {
                    description: caption || '',
                    author: author || 'Unknown',
                    like_count: likeCount,
                    comment_count: commentCount
                };
            });

            Object.assign(results, metadata);
            const descPreview = results.description ? results.description.substring(0, 80).replace(/\n/g, ' ') : '(empty)';
            console.log(`  📝 Legend Captured: ${descPreview}${results.description.length > 80 ? '...' : ''}`);

            // If caption still empty, try HTML fallback
            if (!results.description || results.description.length < 20) {
                console.log(`  ⚠️ Caption short, trying HTML fallback...`);
                try {
                    const response = await fetch(url, {
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                    });
                    const html = await response.text();
                    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["'](.*?)["']/i)?.[1];
                    if (ogDesc && ogDesc.length > 20) {
                        results.description = ogDesc.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
                        console.log(`  📝 HTML Fallback: ${results.description.substring(0, 80)}...`);
                    }
                } catch (_) {}
            }

            let slideIndex = 1;
            let hasNext = true;

            // Store original post URL to verify we're still in the same post
            const originalPostUrl = url;

            while (hasNext && slideIndex <= 15) {
                const savePath = path.join(downloadDir, `slide_${slideIndex}.png`);

                // DISCOVERY: Find images within the CURRENT carousel/modal only
                // Use multiple strategies to avoid capturing suggested posts
                const imgHandle = await page.evaluateHandle((expectedPostUrl) => {
                    // Strategy 1: Find images within the active modal/dialog
                    const modal = document.querySelector('div[role="dialog"], div[role="main"], article');
                    if (modal) {
                        const modalImgs = Array.from(modal.querySelectorAll('img[src*="cdn"], img[src*="fbcdn"]'));
                        // Filter to find the largest, most centered image (likely the carousel slide)
                        const validImgs = modalImgs.filter(img => {
                            const rect = img.getBoundingClientRect();
                            return rect.width > 200 && rect.height > 200 &&
                                   rect.top >= 0 && rect.bottom <= window.innerHeight;
                        });
                        if (validImgs.length > 0) {
                            // Return the largest image (most likely the carousel slide)
                            return validImgs.sort((a, b) =>
                                (b.width * b.height) - (a.width * a.height)
                            )[0];
                        }
                    }

                    // Strategy 2: Fallback to any large centered image on page
                    const allImgs = Array.from(document.querySelectorAll('img[src*="cdn"], img[src*="fbcdn"]'));
                    return allImgs.find(img => {
                        const rect = img.getBoundingClientRect();
                        return rect.width > 300 && rect.height > 300 &&
                               rect.left >= 0 && rect.right <= window.innerWidth &&
                               rect.top < window.innerHeight / 2; // Upper half of screen
                    });
                }, originalPostUrl);

                if (imgHandle.asElement()) {
                    await imgHandle.asElement().screenshot({ path: savePath });
                    results.images.push(savePath);
                    console.log(`  ✅ Captured Slide ${slideIndex}`);
                } else {
                    console.log(`  ⚠️ Could not isolate image for Slide ${slideIndex}, taking full-post fallback.`);
                    const article = page.locator('article').first();
                    if (await article.isVisible()) {
                        await article.screenshot({ path: savePath });
                        results.images.push(savePath);
                    } else {
                        // Extreme fallback: screenshot the whole page if article not found
                        await page.screenshot({ path: savePath });
                        results.images.push(savePath);
                    }
                }

                // NAVIGATION: Find the "Next" button
                const nextButton = page.locator('button[aria-label*="Next"], button[aria-label*="Avançar"], button:has(polyline[points="16.502 3 17.498 4.498 10.111 12 17.498 19.502 16.502 21 7.5 12 16.502 3"])').first();

                if (await nextButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                    console.log(`  ➡️ Clicking Next for Slide ${slideIndex+1}...`);
                    await nextButton.click({ force: true });
                    await page.waitForTimeout(3000); // Wait for transition to complete

                    // Verify we're still in the same post (URL shouldn't have changed to a different post)
                    const currentUrl = page.url();
                    if (!currentUrl.includes(originalPostUrl.split('/p/')[1]?.split('/')[0] || '')) {
                        console.log(`  ⚠️ Navigated away from original post, stopping carousel capture.`);
                        hasNext = false;
                    } else {
                        slideIndex++;
                    }
                } else {
                    console.log(`  🏁 Final slide reached.`);
                    hasNext = false;
                }
            }

            if (results.images.length === 0) {
                console.log(`  ⚠️ No images captured via navigation, attempting Asset Discovery Fallback...`);
                const discoveredImgs = await page.evaluate(() => {
                    const imgs = Array.from(document.querySelectorAll('img[src*="cdn"], img[src*="fbcdn"]'));
                    // Filter for carousel items or large post images
                    return imgs.filter(img => {
                        const src = img.src;
                        const isCarousel = src.includes('CAROUSEL_ITEM') || src.includes('ig_cache_key');
                        const isLarge = img.width > 300 && img.height > 300;
                        return isCarousel || isLarge;
                    }).map(img => img.src);
                });

                // Take unique images (Instagram often has multiple resolutions)
                const uniqueSrcs = [...new Set(discoveredImgs)].slice(0, 10);
                for (let i = 0; i < uniqueSrcs.length; i++) {
                    const savePath = path.join(downloadDir, `slide_${i + 1}.png`);
                    try {
                        const imgPage = await this.context.newPage();
                        const viewPort = { width: 1280, height: 1080 };
                        await imgPage.setViewportSize(viewPort);
                        await imgPage.goto(uniqueSrcs[i]);
                        await imgPage.screenshot({ path: savePath });
                        await imgPage.close();
                        results.images.push(savePath);
                        console.log(`  ✅ Discovered and Captured Slide ${i + 1}`);
                    } catch (e) {
                        console.warn(`  ⚠️ Failed to capture discovered asset ${i+1}: ${e.message}`);
                    }
                }
            }

            if (results.images.length > 0) results.status = 'success';
            return results;

        } catch (error) {
            console.error(`[CarouselScraper] Extraction Error:`, error.message);
            return results;
        } finally {
            await page.close();
        }
    }

    async close() {
        if (this.browser) await this.browser.close();
    }
}

module.exports = InstagramCarouselScraper;
