/**
 * _quota-ledger.js — Ledger de consumo de cota por provider.
 *
 * FONTE DE VERDADE do roteador de cascata. Os `daily_limit` de config/ai-providers.yaml
 * são defaults de configuração, não fatos verificados sobre a política de cada serviço:
 * um 429 antes do limite rebaixa o provider na hora, independente do palpite do YAML.
 *
 * Persistido em data/runs/.provider-quota-ledger.json, particionado por data (chave do
 * dia), não por relógio de processo.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SQUAD_ROOT = path.resolve(__dirname, '..');
const LEDGER_PATH = path.join(SQUAD_ROOT, 'data', 'runs', '.provider-quota-ledger.json');
const PROVIDERS_CONFIG = path.join(SQUAD_ROOT, 'config', 'ai-providers.yaml');

function today() {
    return new Date().toISOString().split('T')[0];
}

function loadLedger() {
    if (!fs.existsSync(LEDGER_PATH)) return {};
    try {
        return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    } catch (_) {
        return {};
    }
}

function saveLedger(ledger) {
    fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
    fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2));
}

function loadProvidersConfig() {
    return yaml.load(fs.readFileSync(PROVIDERS_CONFIG, 'utf8'));
}

/** Entrada do provider no dia corrente, criando se necessário. */
function entryFor(ledger, providerId, date = today()) {
    ledger[date] = ledger[date] || {};
    ledger[date][providerId] = ledger[date][providerId] || {
        used: 0,
        limit_hint: null,
        exhausted_at: null,
        last_error: null,
    };
    return ledger[date][providerId];
}

/** Registra uma geração bem-sucedida. */
function recordSuccess(providerId, limitHint = null) {
    const ledger = loadLedger();
    const e = entryFor(ledger, providerId);
    e.used += 1;
    if (limitHint !== null) e.limit_hint = limitHint;
    saveLedger(ledger);
    return e;
}

/**
 * Registra cota estourada. O provider sai da rotação por `cooldown_hours`.
 * Cota estourada NÃO é erro fatal — é rebaixamento de degrau.
 */
function recordExhausted(providerId, reason = null) {
    const ledger = loadLedger();
    const e = entryFor(ledger, providerId);
    e.exhausted_at = new Date().toISOString();
    if (reason) e.last_error = String(reason).slice(0, 300);
    saveLedger(ledger);
    return e;
}

/** Registra erro transitório, sem tirar o provider da rotação. */
function recordError(providerId, reason) {
    const ledger = loadLedger();
    const e = entryFor(ledger, providerId);
    e.last_error = String(reason).slice(0, 300);
    saveLedger(ledger);
    return e;
}

/**
 * Provider está disponível hoje?
 * Considera cooldown por esgotamento e o limit_hint como teto informativo.
 */
function isAvailable(providerId, cooldownHours = 24) {
    const ledger = loadLedger();
    const e = (ledger[today()] || {})[providerId];
    if (!e) return { available: true };

    if (e.exhausted_at) {
        const elapsedH = (Date.now() - new Date(e.exhausted_at).getTime()) / 3600000;
        if (elapsedH < cooldownHours) {
            return {
                available: false,
                reason: `cota esgotada há ${elapsedH.toFixed(1)}h (cooldown ${cooldownHours}h)`,
            };
        }
    }
    if (e.limit_hint && e.used >= e.limit_hint) {
        return { available: false, reason: `limite informativo atingido (${e.used}/${e.limit_hint})` };
    }
    return { available: true, used: e.used };
}

/**
 * Resolve a lista ORDENADA de providers a tentar, para um tipo e um tier de partida.
 * Ordem: tier resolvido → tiers seguintes. Providers sem credencial são pulados.
 *
 * @param {'image'|'video'} kind
 * @param {string|null} startTier  'A' | 'B' | 'C' | null (usa o primeiro tier)
 * @returns {Array<{id, tier, label, adapter, auth_env, daily_limit, ...}>}
 */
function resolveProviderChain(kind, startTier = null) {
    const cfg = loadProvidersConfig();
    const section = cfg[kind];
    if (!section || !section.tiers) return [];

    const tiers = section.tiers;
    const startIdx = startTier ? tiers.findIndex((t) => t.tier === startTier) : 0;
    const ordered = tiers.slice(startIdx >= 0 ? startIdx : 0);

    const chain = [];
    for (const tier of ordered) {
        for (const p of tier.providers || []) {
            // `enabled: false` é decisão editorial do dono (ex.: provider que passou a
            // exigir saldo). Fica DECLARADO no YAML com o motivo, em vez de apagado —
            // reativar é mudar uma linha, e o histórico do porquê não se perde.
            if (p.enabled === false) continue;
            if (p.auth_env && !String(process.env[p.auth_env] || '').trim()) continue; // sem credencial
            const avail = isAvailable(p.id, (cfg.strategy && cfg.strategy.cooldown_hours) || 24);
            chain.push({ ...p, tier: tier.tier, tierLabel: tier.label, _available: avail.available, _reason: avail.reason });
        }
    }
    return chain;
}

/** Tier preferido do nicho, quando declarado em niche_overrides. */
function preferredTierForNiche(kind, nicheId) {
    const cfg = loadProvidersConfig();
    const ov = (cfg.niche_overrides || {})[nicheId];
    if (!ov) return null;
    return ov[`${kind}_preferred_tier`] || null;
}

/** Resumo do dia, para o comando *quota. */
function summary(date = today()) {
    const ledger = loadLedger();
    const day = ledger[date] || {};
    return Object.entries(day).map(([id, e]) => ({
        provider: id,
        used: e.used,
        limit_hint: e.limit_hint,
        exhausted: !!e.exhausted_at,
        last_error: e.last_error,
    }));
}

function formatSummary(date = today()) {
    const rows = summary(date);
    if (rows.length === 0) return `Nenhum consumo registrado em ${date}.`;
    let out = `Consumo de cota · ${date}\n\n`;
    out += `| Provider | Usado | Teto (hint) | Estado |\n| :--- | ---: | ---: | :--- |\n`;
    for (const r of rows) {
        out += `| ${r.provider} | ${r.used} | ${r.limit_hint ?? '—'} | ${r.exhausted ? '🔴 esgotado' : '🟢 ativo'} |\n`;
    }
    return out;
}

module.exports = {
    LEDGER_PATH,
    today,
    loadLedger,
    saveLedger,
    loadProvidersConfig,
    recordSuccess,
    recordExhausted,
    recordError,
    isAvailable,
    resolveProviderChain,
    preferredTierForNiche,
    summary,
    formatSummary,
};
