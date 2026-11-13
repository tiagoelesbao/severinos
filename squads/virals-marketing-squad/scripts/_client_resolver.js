#!/usr/bin/env node
/**
 * _client_resolver.js — mirror Node.js do _client_resolver.py.
 *
 * Lê data/clients/_registry.yaml e devolve os paths canônicos do cliente
 * (brand-identity, brand-config, monitoring, workspace, LUTs, output).
 * API espelhada do resolver Python — uma única fonte de verdade no registry.
 *
 * Default = "virals" (backward compat com pipelines que rodam sem --client).
 * Slug inválido = Error com lista dos slugs disponíveis.
 *
 * Uso CLI: node _client_resolver.js [slug]
 * Uso programático:
 *   const { resolveClient, extractClientArg, listActiveClients } = require('./_client_resolver.js');
 */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const REGISTRY_PATH = path.join(
    REPO_ROOT,
    'squads',
    'virals-marketing-squad',
    'data',
    'clients',
    '_registry.yaml'
);
const DEFAULT_CLIENT = 'virals';

function _loadRegistry() {
    if (!fs.existsSync(REGISTRY_PATH)) {
        throw new Error(
            `Registry de clientes ausente: ${REGISTRY_PATH}. ` +
            'Crie data/clients/_registry.yaml conforme MKT-MC-01.'
        );
    }
    return yaml.load(fs.readFileSync(REGISTRY_PATH, 'utf8')) || {};
}

function _abs(p) {
    if (!p) return p;
    return path.isAbsolute(p) ? p : path.join(REPO_ROOT, p);
}

function resolveClient(slug) {
    const reg = _loadRegistry();
    const clients = reg.clients || {};
    const defaultSlug = (reg.meta && reg.meta.default_client) || DEFAULT_CLIENT;
    const effectiveSlug = (slug || '').trim() || defaultSlug;

    if (!Object.prototype.hasOwnProperty.call(clients, effectiveSlug)) {
        const disponiveis = Object.keys(clients).sort().join(', ') || '(nenhum)';
        throw new Error(
            `Cliente '${effectiveSlug}' não existe no registry. Disponíveis: ${disponiveis}`
        );
    }

    const entry = clients[effectiveSlug];
    if (entry.status && entry.status !== 'active') {
        throw new Error(
            `Cliente '${effectiveSlug}' está com status=${entry.status} — ative-o no registry.`
        );
    }

    const brandIdentity = entry.brand_identity;
    const brandConfig = entry.brand_config;
    if (!brandIdentity || !fs.existsSync(_abs(brandIdentity))) {
        throw new Error(`brand_identity ausente para '${effectiveSlug}': ${brandIdentity}`);
    }
    if (!brandConfig || !fs.existsSync(_abs(brandConfig))) {
        throw new Error(`brand_config ausente para '${effectiveSlug}': ${brandConfig}`);
    }

    return {
        slug: effectiveSlug,
        nomeExibicao: entry.nome_exibicao || effectiveSlug,
        tipo: entry.tipo || 'marca',
        handleInstagram: entry.handle_instagram || '',
        brandIdentity,
        brandConfig,
        outputDir: entry.output_dir || `outputs/${effectiveSlug}/`,
        monitoringDir:
            entry.monitoring_dir ||
            `squads/virals-marketing-squad/data/clients/${effectiveSlug}/monitoring/`,
        workspaceDir:
            entry.workspace_dir || `workspaces/businesses/${effectiveSlug}/marketing/`,
        lutDir:
            entry.lut_dir ||
            `squads/virals-marketing-squad/data/clients/${effectiveSlug}/luts/`,
    };
}

/**
 * Extrai --client=<slug> de uma lista de argv.
 * Aceita também a forma `--client <slug>` (com espaço).
 * Retorna { slug, remaining } (slug = null se ausente).
 */
function extractClientArg(argv) {
    let slug = null;
    const remaining = [];
    for (let i = 0; i < argv.length; i += 1) {
        const a = argv[i];
        if (typeof a === 'string' && a.startsWith('--client=')) {
            slug = a.slice('--client='.length).trim() || null;
        } else if (a === '--client' && i + 1 < argv.length) {
            slug = String(argv[i + 1]).trim() || null;
            i += 1;
        } else {
            remaining.push(a);
        }
    }
    return { slug, remaining };
}

function listActiveClients() {
    const reg = _loadRegistry();
    const clients = reg.clients || {};
    const out = [];
    for (const slug of Object.keys(clients)) {
        if ((clients[slug].status || 'active') !== 'active') continue;
        try {
            out.push(resolveClient(slug));
        } catch (_) {
            // skip clients with missing artifacts
        }
    }
    return out;
}

module.exports = {
    resolveClient,
    extractClientArg,
    listActiveClients,
    REPO_ROOT,
    REGISTRY_PATH,
};

// CLI utilitário: `node _client_resolver.js [slug]`
if (require.main === module) {
    const arg = process.argv[2];
    try {
        const cp = resolveClient(arg);
        console.log(`slug:           ${cp.slug}`);
        console.log(`nomeExibicao:   ${cp.nomeExibicao}`);
        console.log(`brandIdentity:  ${cp.brandIdentity}`);
        console.log(`brandConfig:    ${cp.brandConfig}`);
        console.log(`outputDir:      ${cp.outputDir}`);
        console.log(`monitoringDir:  ${cp.monitoringDir}`);
        console.log(`workspaceDir:   ${cp.workspaceDir}`);
        console.log(`lutDir:         ${cp.lutDir}`);
        console.log(`handle:         ${cp.handleInstagram}`);
    } catch (e) {
        console.error(`ERRO: ${e.message}`);
        process.exit(1);
    }
}
