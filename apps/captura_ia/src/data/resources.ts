import { Resource, CategoryType } from '../types';
import { LEAD_GENERATION_RESOURCES } from './vault/lead-generation';
import { CLAUDE_RESOURCES } from './vault/claude';
import { AI_ADS_RESOURCES } from './vault/ai-ads';
import { TOOLS_AND_SKILLS_RESOURCES } from './vault/tools-and-skills';
import { AI_CONTENT_RESOURCES } from './vault/ai-content';
import { AUTOMATION_RESOURCES } from './vault/automation';
import { PROMPTS_RESOURCES } from './vault/prompts';

export interface CategoryInfo {
  value: CategoryType;
  label: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'LEAD GENERATION', label: 'Geração de Leads' },
  { value: 'CLAUDE', label: 'Claude' },
  { value: 'AI ADS', label: 'Anúncios com IA' },
  { value: 'TOOLS AND SKILLS', label: 'Ferramentas e Habilidades' },
  { value: 'AI CONTENT', label: 'Conteúdo com IA' },
  { value: 'AUTOMATION', label: 'Automação' },
  { value: 'PROMPTS', label: 'Prompts' },
];

export const CATEGORY_LABELS: Record<CategoryType, string> = {
  'ALL': 'Todos',
  'LEAD GENERATION': 'GERAÇÃO DE LEADS',
  'CLAUDE': 'CLAUDE',
  'AI ADS': 'ANÚNCIOS COM IA',
  'TOOLS AND SKILLS': 'FERRAMENTAS E HABILIDADES',
  'AI CONTENT': 'CONTEÚDO COM IA',
  'AUTOMATION': 'AUTOMAÇÃO',
  'PROMPTS': 'PROMPTS',
};

/** Índice por slug — a ordem abaixo é a ordem de exibição na grade do cofre. */
const BY_SLUG: Record<string, Resource> = Object.fromEntries(
  [
    ...LEAD_GENERATION_RESOURCES,
    ...CLAUDE_RESOURCES,
    ...AI_ADS_RESOURCES,
    ...TOOLS_AND_SKILLS_RESOURCES,
    ...AI_CONTENT_RESOURCES,
    ...AUTOMATION_RESOURCES,
    ...PROMPTS_RESOURCES,
  ].map((resource) => [resource.slug, resource]),
);

/**
 * Ordem de exibição do cofre. Os primeiros 20 alimentam também o carrossel
 * da landing (duas fileiras de 10), então os mais fortes ficam no topo.
 */
const DISPLAY_ORDER: string[] = [
  'ai-sales-team',
  'claude-client-agreement-system',
  'claude-cowork-setup-guide',
  'claude-higgsfield-video-ads',
  'claude-arcads-ugc-ads',
  'claude-website-design',
  'free-claude-code-course',
  'claude-code-plugins',
  'claude-chrome-lead-list',
  'ai-content-team-blueprint',
  'claude-competitor-research-machine',
  'spy-on-competitor-meta-ads',
  '5-open-source-claude-tools',
  '5-secret-claude-code-commands',
  'build-manychat-flows-with-claude',
  'connect-claude-to-gohighlevel',
  'make-claude-write-undetectable',
  'connect-claude-to-your-ad-account',
  'create-videos-in-claude-code-with-remotion',
  'best-way-to-set-up-claude-code',
  'meta-just-dropped-an-ads-mcp',
  'routines-changed-claude-code-forever',
  'auto-post-to-6-social-platforms-daily',
  '5-secret-claude-prompts',
  'alex-hormozi-business-coach',
  'stop-claude-from-glazing-you',
];

export const RESOURCES_DATA: Resource[] = DISPLAY_ORDER.map((slug) => {
  const resource = BY_SLUG[slug];
  if (!resource) {
    throw new Error(`DISPLAY_ORDER referencia um slug inexistente: ${slug}`);
  }
  return resource;
});
