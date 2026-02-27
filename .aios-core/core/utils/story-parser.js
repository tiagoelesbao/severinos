const path = require('path');
const matter = require('gray-matter');

/**
 * AIOS Story Parser & Generator
 * Centralized logic for interpreting and creating story files.
 */

const VALID_STATUS = ['backlog', 'in_progress', 'ai_review', 'human_review', 'pr_created', 'done', 'error'];
const VALID_COMPLEXITY = ['simple', 'standard', 'complex'];
const VALID_PRIORITY = ['low', 'medium', 'high', 'critical'];
const VALID_CATEGORY = ['feature', 'fix', 'refactor', 'docs'];
const VALID_AGENTS = ['dev', 'qa', 'architect', 'pm', 'po', 'analyst', 'devops', 'dalio', 'wickman', 'kaushik', 'hormozi-sys', 'walker-launch'];

const PRIORITY_MAP = {
  p0: 'critical',
  p1: 'high',
  p2: 'medium',
  p3: 'low',
};

const STATUS_MAP = {
  draft: 'backlog',
  ready: 'backlog',
  'in progress': 'in_progress',
  'in-progress': 'in_progress',
  review: 'ai_review',
  'ai review': 'ai_review',
  'ready for review': 'human_review',
  'human review': 'human_review',
  'pr created': 'pr_created',
  'pr ready': 'pr_created',
  done: 'done',
  complete: 'done',
  completed: 'done',
  implemented: 'done',
  error: 'error',
  blocked: 'error',
};

function parseMetadata(content) {
  const metadata = {};
  
  // 1. Parse Blockquote Format (> **Field:** Value)
  const blockquoteRegex = /^>\s*\*\*([^*]+)\*\*:\s*(.+)$/gm;
  let match;
  while ((match = blockquoteRegex.exec(content)) !== null) {
    metadata[match[1].trim().toLowerCase()] = match[2].trim();
  }

  // 2. Parse Table Format (| **Field** | Value |)
  const tableRegex = /^\|\s*\*\*([^*|]+)\*\*\s*\|\s*([^|]+)\s*\|/gm;
  while ((match = tableRegex.exec(content)) !== null) {
    metadata[match[1].trim().toLowerCase()] = match[2].trim();
  }

  // 3. Parse Inline Bold (**Field:** Value)
  const inlineRegex = /(?<!>.*)\*\*([^*:]+)\*\*:\s*([^
|]+)/g;
  while ((match = inlineRegex.exec(content)) !== null) {
    metadata[match[1].trim().toLowerCase()] = match[2].trim();
  }

  return metadata;
}

function parseStoryFromMarkdown(content, filePath, fileStats = {}) {
  try {
    const { data, content: markdownContent } = matter(content);
    const meta = parseMetadata(markdownContent);

    const title = data.title || (markdownContent.match(/^#\s+(.+)$/m)?.[1]) || path.basename(filePath, '.md');
    const id = data.id || path.basename(filePath, '.md');

    // Type detection
    let type = data.type || 'story';
    const filename = path.basename(filePath).toLowerCase();
    if (filename.startsWith('epic-') || filename.includes('-epic') || title.toLowerCase().startsWith('epic')) {
      type = 'epic';
    }

    // Normalization functions
    const normalizeStatus = (val) => (val && STATUS_MAP[val.toLowerCase().trim()]) || (VALID_STATUS.includes(val?.toLowerCase()) ? val.toLowerCase() : 'backlog');
    const normalizePriority = (val) => {
      const pMatch = val?.match(/^(p[0-3])/i);
      if (pMatch) return PRIORITY_MAP[pMatch[1].toLowerCase()];
      return VALID_PRIORITY.includes(val?.toLowerCase()) ? val.toLowerCase() : undefined;
    };

    const status = normalizeStatus(data.status || meta.status);
    const priority = normalizePriority(data.priority || meta.priority);
    const complexity = VALID_COMPLEXITY.includes(data.complexity?.toLowerCase()) ? data.complexity.toLowerCase() : (VALID_COMPLEXITY.includes(meta.complexity?.toLowerCase()) ? meta.complexity.toLowerCase() : undefined);
    
    // Acceptance Criteria
    const acMatch = markdownContent.match(/## Acceptance Criteria
([\s\S]*?)(?=
##|$)/i);
    const acceptanceCriteria = acMatch ? acMatch[1].split('
').filter(l => l.match(/^-\s*\[[ x]\]/i)).map(l => l.replace(/^-\s*\[[ x]\]\s*/i, '').trim()) : [];

    // Progress
    let progress = data.progress;
    if (progress === undefined && acceptanceCriteria.length > 0) {
      const completed = (markdownContent.match(/- \[x\]/gi) || []).length;
      progress = Math.round((completed / acceptanceCriteria.length) * 100);
    }

    return {
      id,
      title,
      description: data.description || markdownContent.split('

').filter(p => p.trim() && !p.startsWith('#') && !p.startsWith('>'))[0]?.slice(0, 200) || '',
      status,
      type,
      epicId: data.epicId || data.epic || path.basename(filePath).match(/^epic-(\d+)/i)?.[0],
      complexity,
      priority,
      category: data.category || meta.category,
      agentId: data.agent || meta.agent || meta.owner,
      progress,
      acceptanceCriteria,
      filePath,
      createdAt: data.createdAt || fileStats.birthtime?.toISOString(),
      updatedAt: data.updatedAt || fileStats.mtime?.toISOString(),
    };
  } catch (e) {
    console.error(`Error parsing story ${filePath}:`, e);
    return null;
  }
}

module.exports = {
  parseStoryFromMarkdown,
  VALID_STATUS,
  VALID_AGENTS
};
