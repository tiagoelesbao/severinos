const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Toolchain: manutenção automática do yt-dlp.
 *
 * O extractor do Instagram quebra sempre que a plataforma muda o layout interno —
 * um binário defasado falha com "empty media response" MESMO com sessão válida.
 * Foi o que degradou 100% do benchmark de 2026-07-11 (VEX-14).
 */

const DEFAULT_MAX_AGE_DAYS = 7;
const UPDATE_TIMEOUT_MS = 120000;
const STAMP_FILE = '.yt-dlp-update-stamp';

function stampPath(binPath) {
    return path.join(path.dirname(binPath), STAMP_FILE);
}

/**
 * Idade em dias do binário — o mais recente entre o mtime e o último update
 * bem-sucedido. O stamp existe porque um `-U` que conclui "already up to date"
 * não toca o mtime: sem ele, um binário velho porém atual seria reconferido a
 * cada execução.
 */
function toolAgeDays(binPath, now = Date.now()) {
    if (!fs.existsSync(binPath)) return Infinity;

    let newest = fs.statSync(binPath).mtimeMs;
    const stamp = stampPath(binPath);
    if (fs.existsSync(stamp)) {
        newest = Math.max(newest, fs.statSync(stamp).mtimeMs);
    }
    return (now - newest) / 86400000;
}

/**
 * Atualiza o yt-dlp se estiver velho. NÃO-FATAL por contrato: sem rede, sem
 * permissão de escrita ou com o GitHub fora do ar, o benchmark segue com o
 * binário atual — falhar aqui puniria o usuário por um problema de manutenção.
 *
 * @returns {{updated: boolean, reason: string, version?: string, warning?: string}}
 */
function ensureYtDlpFresh(binPath, opts = {}) {
    const maxAgeDays = opts.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
    const exec = opts.exec || execFileSync;
    const now = opts.now || Date.now();

    if (!fs.existsSync(binPath)) {
        return { updated: false, reason: 'binary-missing', warning: `yt-dlp não encontrado em ${binPath}` };
    }

    const age = toolAgeDays(binPath, now);
    if (age < maxAgeDays) {
        return { updated: false, reason: 'fresh' };
    }

    console.log(`[Toolchain] yt-dlp com ${age.toFixed(1)} dias (limite ${maxAgeDays}) — atualizando...`);

    // Backup antes do update: uma versão nova quebrada deixaria o pipeline pior
    // do que estava. restoreYtDlpBackup() reverte se o preflight falhar depois.
    const backup = `${binPath}.bak`;
    try {
        fs.copyFileSync(binPath, backup);
    } catch (e) {
        console.warn(`[Toolchain] Backup falhou (segue sem rede de segurança): ${e.message}`);
    }

    try {
        exec(binPath, ['-U'], { timeout: UPDATE_TIMEOUT_MS, windowsHide: true, stdio: 'pipe' });
    } catch (e) {
        return {
            updated: false,
            reason: 'update-failed',
            warning: `E1: update do yt-dlp falhou (${e.message.split('\n')[0]}) — seguindo com a versão atual`
        };
    }

    let version;
    try {
        version = exec(binPath, ['--version'], { timeout: 30000, windowsHide: true, stdio: 'pipe' })
            .toString().trim();
    } catch (_) {
        version = 'unknown';
    }

    try {
        fs.writeFileSync(stampPath(binPath), new Date(now).toISOString());
    } catch (_) { /* stamp é otimização, não requisito */ }

    console.log(`[Toolchain] yt-dlp atualizado → ${version}`);
    return { updated: true, reason: 'updated', version };
}

/**
 * Reverte para o backup pré-update. Chamado quando o preflight falha logo após
 * uma atualização — o suspeito óbvio é a versão nova.
 */
function restoreYtDlpBackup(binPath) {
    const backup = `${binPath}.bak`;
    if (!fs.existsSync(backup)) return false;
    try {
        fs.copyFileSync(backup, binPath);
        console.log(`[Toolchain] yt-dlp revertido para o backup pré-update`);
        return true;
    } catch (e) {
        console.warn(`[Toolchain] Não foi possível reverter: ${e.message}`);
        return false;
    }
}

module.exports = { ensureYtDlpFresh, toolAgeDays, restoreYtDlpBackup, DEFAULT_MAX_AGE_DAYS };
