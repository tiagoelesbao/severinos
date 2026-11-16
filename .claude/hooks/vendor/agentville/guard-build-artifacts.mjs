#!/usr/bin/env node
/**
 * PreToolUse guard: block edits to generated build artifacts. Hand-editing a
 * generated file is always a mistake: the next build silently throws the edit away.
 *
 * MODIFIED FOR SEVERINOS (see CHANGES.md): the artifact list was replaced. Upstream
 * guarded a VS Code extension (dist/ + *.vsix). Here it guards this monorepo's real
 * generated trees: build output, Next.js caches, Storybook static, render assets,
 * Python bytecode and dependency trees.
 *
 * Wire in .claude/settings.local.json under PreToolUse with matcher "Edit|Write|MultiEdit".
 * Non-invasive: fails open on any I/O or parse error (exit 0).
 */
import fs from 'node:fs';

/** \/returns {string} */
function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/** \/type {any} */
let event = {};
try {
  event = JSON.parse(readStdin() || '{}');
} catch {
  process.exit(0);
}

const filePath = String(event?.tool_input?.file_path ?? '');
if (!filePath) process.exit(0);

// Normalise Windows separators so one pattern set covers both platforms.
// String.fromCharCode(92) is the path separator on Windows; spelled this way to
// keep this file free of escape-sensitive literals.
const normalised = filePath.split(String.fromCharCode(92)).join('/');

const ARTIFACT_PATTERNS = [
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)out\//,
  /(^|\/)\.next\//,
  /(^|\/)storybook-static\//,
  /(^|\/)node_modules\//,
  /(^|\/)__pycache__\//,
  /(^|\/)\.pytest_cache\//,
  /(^|\/)coverage\//,
  /(^|\/)outputs\//,
  /apps\/creative-design\/public\/render-assets\//,
  /\.vsix$/,
  /\.pyc$/,
];

const isArtifact = ARTIFACT_PATTERNS.some((re) => re.test(normalised));
if (!isArtifact) process.exit(0);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: [
        'guard-build-artifacts: refusing to edit generated artifact `' + filePath + '`.',
        'This path is build output, a framework cache, a dependency tree or a generated',
        'render asset — all of them are rebuilt and your edit would be thrown away.',
        'Edit the source that produces it instead (src/, the template, or the pipeline script).',
      ].join('\n'),
    },
  }),
);

process.exit(0);
