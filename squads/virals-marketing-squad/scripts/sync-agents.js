#!/usr/bin/env node
/**
 * sync-agents.js — Deriva as cópias dos agentes Virals Marketing a partir
 * da FONTE CANÔNICA `.claude/commands/VIRALS/agents/marketing-*.md`.
 *
 * Entrega de RTC-02 (EPIC-MKT-Runtime-Conformity). Reproduz o conteúdo
 * canônico para 5 locações derivadas (3 runtimes):
 *
 *   L1 .claude/commands/VIRALS/agents/marketing-{name}.md  ← FONTE
 *   L2 squads/virals-marketing-squad/agents/<naming>.md
 *   L3 .antigravity/agents/marketing-{name}.md
 *   L4 .antigravity/rules/agents/marketing-{name}.md
 *   L5 .gemini/commands/virals-marketing-{name}.toml       (shim)
 *   L6 .gemini/rules/AIOX/agents/virals-marketing-{name}.md
 *
 * Usage:
 *   node squads/virals-marketing-squad/scripts/sync-agents.js [--check] [--dry-run] [--only=<name>]
 *
 *   --check     Apenas reporta divergências (exit 1 se houver). NÃO escreve.
 *   --dry-run   Mostra o que seria escrito sem gravar.
 *   --only=<n>  Limita a um agente (ex.: --only=chief).
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const CANONICAL_DIR = path.join(
  ROOT, '.claude', 'commands', 'VIRALS', 'agents'
);

// Naming dos arquivos no squad copy (L2). Padrão histórico:
//   chief = mantém prefixo "marketing-"
//   demais = sem prefixo "marketing-"
const SQUAD_FILENAME = (name) =>
  name === 'chief' ? 'marketing-chief.md' : `${name}.md`;

const TARGETS = (name) => ({
  squad: path.join(
    ROOT, 'squads', 'virals-marketing-squad', 'agents', SQUAD_FILENAME(name)
  ),
  antigravityAgents: path.join(
    ROOT, '.antigravity', 'agents', `marketing-${name}.md`
  ),
  antigravityRules: path.join(
    ROOT, '.antigravity', 'rules', 'agents', `marketing-${name}.md`
  ),
  geminiRules: path.join(
    ROOT, '.gemini', 'rules', 'AIOX', 'agents', `virals-marketing-${name}.md`
  ),
  geminiShim: path.join(
    ROOT, '.gemini', 'commands', `virals-marketing-${name}.toml`
  ),
});

const args = process.argv.slice(2);
const flag = (k) => args.includes(k);
const opt = (k) => {
  const a = args.find((x) => x.startsWith(`${k}=`));
  return a ? a.split('=', 2)[1] : null;
};

const CHECK = flag('--check');
const DRY = flag('--dry-run') || CHECK;
const ONLY = opt('--only');

function listCanonical() {
  return fs.readdirSync(CANONICAL_DIR)
    .filter((f) => f.startsWith('marketing-') && f.endsWith('.md'))
    .map((f) => ({
      file: f,
      name: f.replace(/^marketing-/, '').replace(/\.md$/, ''),
      path: path.join(CANONICAL_DIR, f),
    }))
    .filter((a) => !ONLY || a.name === ONLY);
}

function readFile(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

// Extrai descrição curta da primeira linha "# X" do .md canônico.
function shortDescription(content) {
  const m = content.match(/^#\s*@?[\w-]+\s*[—-]\s*(.+?)\s*$/m);
  if (m) return m[1].trim();
  const t = content.match(/title:\s*['"]?(.+?)['"]?\s*$/m);
  return t ? t[1].trim() : 'Virals Marketing Agent';
}

function buildShim(name, description, squadFile) {
  return [
    `description = "${description.replace(/"/g, '\\"')}"`,
    'prompt = """',
    `Ative o agente virals-marketing-${name}:`,
    `1. Leia a definição da matriz em squads/virals-marketing-squad/agents/${squadFile}`,
    `2. Leia a rule operacional em .gemini/rules/AIOX/agents/virals-marketing-${name}.md`,
    '3. Siga as activation-instructions do bloco YAML da rule operacional',
    `4. Renderize o greeting via: node .aiox-core/development/scripts/generate-greeting.js virals-marketing-${name}`,
    '   Se shell nao disponivel, exiba o greeting de persona_profile.communication.greeting_levels.named',
    '5. Mostre Quick Commands e aguarde input do usuário',
    'Mantenha a persona até *exit.',
    '"""',
    '',
  ].join('\n');
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function writeFileSafe(p, content) {
  if (DRY) {
    console.log(`  [dry] ${path.relative(ROOT, p)}`);
    return;
  }
  ensureDir(p);
  fs.writeFileSync(p, content, 'utf8');
  console.log(`  [write] ${path.relative(ROOT, p)}`);
}

function diff(label, p, expected) {
  const actual = readFile(p);
  if (actual === null) {
    console.log(`  ⚠  MISSING  ${label}  ${path.relative(ROOT, p)}`);
    return false;
  }
  if (actual !== expected) {
    console.log(`  ⚠  DIVERGED ${label}  ${path.relative(ROOT, p)}`);
    return false;
  }
  console.log(`  ✓  OK       ${label}  ${path.relative(ROOT, p)}`);
  return true;
}

function syncOne(agent) {
  const canon = readFile(agent.path);
  if (!canon) throw new Error(`Canonical missing: ${agent.path}`);
  const t = TARGETS(agent.name);
  const description = shortDescription(canon);
  const shim = buildShim(agent.name, description, SQUAD_FILENAME(agent.name));

  console.log(`\n→ ${agent.name}`);

  if (CHECK) {
    let ok = true;
    ok = diff('L2 squad      ', t.squad,             canon) && ok;
    ok = diff('L3 antigravity', t.antigravityAgents, canon) && ok;
    ok = diff('L4 ant-rules  ', t.antigravityRules,  canon) && ok;
    ok = diff('L5 gemini-shim', t.geminiShim,        shim ) && ok;
    ok = diff('L6 gemini-rule', t.geminiRules,       canon) && ok;
    return ok;
  }

  writeFileSafe(t.squad,             canon);
  writeFileSafe(t.antigravityAgents, canon);
  writeFileSafe(t.antigravityRules,  canon);
  writeFileSafe(t.geminiShim,        shim);
  writeFileSafe(t.geminiRules,       canon);
  return true;
}

function main() {
  if (!fs.existsSync(CANONICAL_DIR)) {
    console.error(`ERRO: ${CANONICAL_DIR} não existe.`);
    process.exit(1);
  }
  const agents = listCanonical();
  if (agents.length === 0) {
    console.error('ERRO: nenhum agente canônico encontrado.');
    process.exit(1);
  }
  console.log(
    `sync-agents — ${agents.length} agente(s) ${
      CHECK ? '[CHECK]' : DRY ? '[DRY-RUN]' : '[WRITE]'
    }`
  );

  let allOk = true;
  for (const a of agents) {
    const ok = syncOne(a);
    allOk = allOk && ok;
  }
  if (CHECK && !allOk) {
    console.log('\n⚠  Divergências detectadas — rode sem --check para sincronizar.');
    process.exit(1);
  }
  console.log('\nOK.');
}

main();
