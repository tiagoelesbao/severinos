import { NextResponse } from 'next/server';
export const revalidate = 0;
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
// Use the centralized parser from the AIOS Core
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parseStoryFromMarkdown } = require('../../../../../.aios-core/core/utils/story-parser');

import type {
  Story,
  StoryStatus,
  StoryComplexity,
  StoryPriority,
  StoryCategory,
  StoryType,
  AgentId,
} from '@/types';

// Get the project root path
function getProjectRoot(): string {
  if (process.env.AIOS_PROJECT_ROOT) {
    return process.env.AIOS_PROJECT_ROOT;
  }
  // Default: assume running from apps/dashboard/
  return path.resolve(process.cwd(), '..', '..');
}

// Recursively find all markdown files
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories, node_modules, and standard archive folders
        const skipDirs = ['node_modules', 'archive', 'obsolete', 'archived', 'deprecated', '.git'];
        if (!entry.name.startsWith('.') && !skipDirs.includes(entry.name.toLowerCase())) {
          files.push(...(await findMarkdownFiles(fullPath)));
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        // Skip common non-story markdown files
        if (!['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md'].includes(entry.name)) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return files;
}

// Generate story filename from title
function generateStoryFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  const timestamp = Date.now();
  return `${slug}-${timestamp}.md`;
}

// Generate frontmatter from story data (Simplified - logic to be moved to Core later)
function generateStoryContent(data: CreateStoryRequest): string {
  const frontmatter = [
    '---',
    `title: "${data.title.replace(/"/g, '\\"')}"`,
    `status: ${data.status || 'backlog'}`,
    `type: ${data.type || 'story'}`,
  ];

  if (data.priority) frontmatter.push(`priority: ${data.priority}`);
  if (data.complexity) frontmatter.push(`complexity: ${data.complexity}`);
  if (data.category) frontmatter.push(`category: ${data.category}`);
  if (data.agent) frontmatter.push(`agent: ${data.agent}`);
  if (data.epicId) frontmatter.push(`epicId: "${data.epicId}"`);

  frontmatter.push(`createdAt: "${new Date().toISOString()}"`);
  frontmatter.push('---');
  frontmatter.push('');
  frontmatter.push(`# ${data.title}`);
  frontmatter.push('');

  if (data.description) {
    frontmatter.push(data.description);
    frontmatter.push('');
  }

  if (data.acceptanceCriteria && data.acceptanceCriteria.length > 0) {
    frontmatter.push('## Acceptance Criteria');
    frontmatter.push('');
    for (const criterion of data.acceptanceCriteria) {
      frontmatter.push(`- [ ] ${criterion}`);
    }
    frontmatter.push('');
  }

  if (data.technicalNotes) {
    frontmatter.push('## Technical Notes');
    frontmatter.push('');
    frontmatter.push(data.technicalNotes);
    frontmatter.push('');
  }

  return frontmatter.join('\n');
}

interface CreateStoryRequest {
  title: string;
  description?: string;
  status?: StoryStatus;
  type?: StoryType;
  priority?: StoryPriority;
  complexity?: StoryComplexity;
  category?: StoryCategory;
  agent?: AgentId;
  epicId?: string;
  acceptanceCriteria?: string[];
  technicalNotes?: string;
}

export async function GET() {
  try {
    const projectRoot = getProjectRoot();
    const storiesDir = path.join(projectRoot, 'docs', 'stories');

    // Find all markdown files in the hierarchical docs/stories structure
    const markdownFiles = await findMarkdownFiles(storiesDir);

    if (markdownFiles.length === 0) {
      return NextResponse.json({
        stories: [],
        source: 'empty',
        message: 'No stories found in docs/stories/',
      });
    }

    // Parse all story files using the Centralized Core Parser
    const stories: Story[] = [];

    for (const filePath of markdownFiles) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        const relativePath = path.relative(projectRoot, filePath);

        const story = parseStoryFromMarkdown(content, relativePath, {
          mtime: stats.mtime,
          birthtime: stats.birthtime,
        });

        if (story) {
          stories.push(story);
        }
      } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
      }
    }

    return NextResponse.json({
      stories,
      source: 'filesystem',
      count: stories.length,
    });
  } catch (error) {
    console.error('Error in /api/stories:', error);
    return NextResponse.json({ stories: [], source: 'error', error: 'Failed to load stories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateStoryRequest;

    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const projectRoot = getProjectRoot();
    const storiesDir = path.join(projectRoot, 'docs', 'stories');

    try {
      await fs.mkdir(storiesDir, { recursive: true });
    } catch (error) {}

    const filename = generateStoryFilename(body.title);
    const filePath = path.join(storiesDir, filename);
    const content = generateStoryContent(body);

    await fs.writeFile(filePath, content, 'utf-8');

    const stats = await fs.stat(filePath);
    const relativePath = path.relative(projectRoot, filePath);
    
    // Parse back using the Core Parser to ensure consistency
    const story = parseStoryFromMarkdown(content, relativePath, {
      mtime: stats.mtime,
      birthtime: stats.birthtime,
    });

    return NextResponse.json({ story, filePath: relativePath, message: 'Story created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating story:', error);
    return NextResponse.json({ error: 'Failed to create story' }, { status: 500 });
  }
}
