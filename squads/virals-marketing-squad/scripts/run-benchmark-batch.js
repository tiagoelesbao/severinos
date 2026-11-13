/**
 * Run Benchmark Batch — Robust Version
 *
 * Processa links sequencialmente com timeout individual por link.
 * Se um link falhar ou timeout, continua para o próximo.
 *
 * Usage: node scripts/run-benchmark-batch.js [links_file_path]
 * Default: services/ETL/Extract/Links/links-23.03.26.md
 *
 * Output: services/ETL/outputs/Conteudo-{platform}-{hash}-{slug}/ for each link
 */

const fs = require('fs');
const path = require('path');
const { runSingle } = require('./run-benchmark-single');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_LINKS = path.join(PROJECT_ROOT, 'services', 'ETL', 'Extract', 'Links', 'links-23.03.26.md');
const LOGS_DIR = path.join(PROJECT_ROOT, '.aiox', 'logs');

// Timeout configuration per platform (in milliseconds)
const TIMEOUT_CONFIG = {
  youtube: 2700000,    // 45 min — videos can be 20-30min + extraction + transcription on CPU
  tiktok: 300000,      // 5 min — shorter videos
  instagram: 300000,   // 5 min — posts/reels
  linkedin: 120000,    // 2 min — metadata only usually
  default: 300000      // 5 min fallback
};

function getTimeoutForUrl(url) {
  if (url.includes('youtube.com')) return TIMEOUT_CONFIG.youtube;
  if (url.includes('tiktok.com')) return TIMEOUT_CONFIG.tiktok;
  if (url.includes('instagram.com')) return TIMEOUT_CONFIG.instagram;
  if (url.includes('linkedin.com')) return TIMEOUT_CONFIG.linkedin;
  return TIMEOUT_CONFIG.default;
}

function detectPlatform(url) {
  if (url.includes('youtube.com')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('linkedin.com')) return 'linkedin';
  return 'unknown';
}

function timeoutPromise(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms/1000}s`)), ms)
    )
  ]);
}

async function processLinkWithRetry(link, contentIndex, maxRetries = 1) {
  const platform = detectPlatform(link);
  const timeout = getTimeoutForUrl(link);
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`  🔄 Retry attempt ${attempt}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, 5000)); // 5s cooldown between retries
      }

      console.log(`  ⏱️ Timeout: ${timeout/1000}s for ${platform}`);

      const result = await timeoutPromise(
        runSingle(link, contentIndex),
        timeout
      );

      if (result.status === 'success') {
        return { success: true, result, platform };
      } else {
        lastError = result.error || 'Unknown error';
        console.log(`  ⚠️ Link ${contentIndex} returned error: ${lastError}`);
      }
    } catch (err) {
      lastError = err.message;
      if (err.message.includes('Timeout')) {
        console.log(`  ⏱️ Link ${contentIndex} timed out after ${timeout/1000}s`);
      } else {
        console.log(`  ❌ Link ${contentIndex} error: ${err.message}`);
      }
    }
  }

  return { success: false, error: lastError, platform };
}

async function runBatch(linksFilePath) {
  const linksFile = linksFilePath || DEFAULT_LINKS;
  const startTime = Date.now();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🏗️ [virals-marketing-squad] Benchmark Batch Processor v2`);
  console.log(`📄 Links file: ${linksFile}`);
  console.log(`${'═'.repeat(60)}`);

  if (!fs.existsSync(linksFile)) {
    console.error(`❌ Links file not found: ${linksFile}`);
    process.exit(1);
  }

  // Parse links
  const content = fs.readFileSync(linksFile, 'utf8');
  const allLinks = content.match(/https?:\/\/[^\s)]+/g) || [];

  // Regex-based validation matching run-benchmark-single.js
  const validPlatformRegex = [
    /instagram\.com.*\/reel/,
    /instagram\.com.*\/p\//,
    /tiktok\.com/,
    /youtube\.com\/watch/,
    /youtube\.com\/shorts/,
    /linkedin\.com\/posts/,
    /linkedin\.com\/feed\/update/
  ];

  const validLinks = allLinks.filter(l =>
    validPlatformRegex.some(r => r.test(l))
  );

  // Deduplicate links
  const uniqueLinks = [...new Set(validLinks)];
  if (uniqueLinks.length < validLinks.length) {
    console.log(`⚠️ Removed ${validLinks.length - uniqueLinks.length} duplicate links`);
  }

  console.log(`\n📊 Total links found: ${allLinks.length}`);
  console.log(`✅ Valid links: ${uniqueLinks.length}`);
  console.log(`📋 Platforms: ${[...new Set(uniqueLinks.map(detectPlatform))].join(', ')}`);
  console.log(`${'─'.repeat(60)}\n`);

  const results = {
    started_at: new Date().toISOString(),
    links_file: linksFile,
    total: uniqueLinks.length,
    completed: 0,
    failed: 0,
    timed_out: 0,
    skipped: 0,
    contents: [],
    errors: []
  };

  // Sequential processing with individual timeouts
  for (let i = 0; i < uniqueLinks.length; i++) {
    const link = uniqueLinks[i];
    const contentIndex = i + 1;
    const platform = detectPlatform(link);

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📌 [${contentIndex}/${uniqueLinks.length}] ${platform.toUpperCase()}: ${link}`);
    console.log(`${'─'.repeat(60)}`);

    const processResult = await processLinkWithRetry(link, contentIndex, 1);

    if (processResult.success) {
      results.completed++;
      results.contents.push({
        index: contentIndex,
        url: link,
        platform: processResult.platform,
        folder: processResult.result.folderName,
        dossier: processResult.result.dossierPath,
        status: 'success'
      });
      console.log(`  ✅ COMPLETED`);
    } else {
      results.failed++;
      if (processResult.error && processResult.error.includes('Timeout')) {
        results.timed_out++;
        console.log(`  ⏱️ TIMED OUT`);
      }
      results.errors.push({
        index: contentIndex,
        url: link,
        platform: processResult.platform,
        error: processResult.error,
        status: processResult.error && processResult.error.includes('Timeout') ? 'timeout' : 'error'
      });
    }

    // Progress report
    const progress = ((contentIndex / uniqueLinks.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log(`\n📊 Progress: ${progress}% | ⏱️ Elapsed: ${elapsed}s | ✅ ${results.completed} | ❌ ${results.failed} | ⏱️ ${results.timed_out}`);

    // Cooldown between links (respect rate limits)
    if (i < uniqueLinks.length - 1) {
      const cooldown = 3000; // 3 seconds
      console.log(`⏳ Cooldown ${cooldown/1000}s...`);
      await new Promise(r => setTimeout(r, cooldown));
    }
  }

  // Final summary
  const totalTime = Date.now() - startTime;
  results.finished_at = new Date().toISOString();
  results.duration_ms = totalTime;
  results.duration_formatted = `${Math.floor(totalTime/60000)}m ${Math.floor((totalTime%60000)/1000)}s`;

  // Save summary
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
  const summaryPath = path.join(LOGS_DIR, `batch-summary-${Date.now()}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));

  // Console summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🏁 BATCH PROCESSING COMPLETE!`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`📊 Total links:      ${results.total}`);
  console.log(`✅ Completed:        ${results.completed}`);
  console.log(`❌ Failed:           ${results.failed}`);
  console.log(`⏱️ Timed out:        ${results.timed_out}`);
  console.log(`⏱️ Total duration:   ${results.duration_formatted}`);
  console.log(`📝 Summary log:     ${summaryPath}`);

  // Platform breakdown
  if (results.contents.length > 0) {
    console.log(`\n📋 Platform breakdown:`);
    const byPlatform = {};
    results.contents.forEach(c => {
      byPlatform[c.platform] = (byPlatform[c.platform] || 0) + 1;
    });
    Object.entries(byPlatform).forEach(([plat, count]) => {
      console.log(`   ${plat}: ${count} ✅`);
    });
  }

  console.log(`\n💡 Next: Run agent audits on each completed content`);
  console.log(`${'═'.repeat(60)}`);

  return results;
}

// CLI
if (require.main === module) {
  const linksFile = process.argv[2] || null;
  runBatch(linksFile).catch(err => {
    console.error(`❌ Batch processor crashed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}

module.exports = { runBatch };
