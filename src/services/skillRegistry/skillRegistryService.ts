import { SystemError, ValidationError } from '@/common/errors';

import { CATEGORY_LABELS, resolveSkillCategory } from './categoryMap';
import { loadProductionScriptModules, loadProductionSkillModules } from './loadSkillModules';
import { extractTitleFromBody, parseSkillMd } from './parseSkillMd';

import type {
  Skill,
  SkillCategoryId,
  SkillCategoryInfo,
  SkillLoadOptions,
  SkillMeta,
  SkillRegistryStats,
  SkillSearchQuery,
} from './types';

export interface SkillRegistryDeps {
  skillModules?: Record<string, string>;
  scriptModules?: Record<string, string>;
}

export interface SkillRegistryApi {
  ensureInitialized(): void;
  listSkills(query?: SkillSearchQuery): SkillMeta[];
  getSkill(id: string): Skill | undefined;
  hasSkill(id: string): boolean;
  getCategories(): SkillCategoryInfo[];
  loadSkillContext(id: string, options?: SkillLoadOptions): string;
  loadSkillsContext(ids: string[], options?: SkillLoadOptions & { strict?: boolean }): string;
  getStats(): SkillRegistryStats;
}

const CATEGORY_ORDER: SkillCategoryId[] = [
  'product_research',
  'competitor',
  'pricing_profit',
  'advertising',
  'listing',
  'analytics',
  'growth',
  'other',
];

function skillDirFromPath(modulePath: string): string | null {
  const normalized = modulePath.replace(/\\/g, '/');
  const skillMd = normalized.match(/([^/]+)\/SKILL\.md$/i);
  if (skillMd?.[1]) return skillMd[1];
  const scripts = normalized.match(/([^/]+)\/scripts\//i);
  if (scripts?.[1]) return scripts[1];
  return null;
}

function toMeta(skill: Skill): SkillMeta {
  return {
    id: skill.id,
    title: skill.title,
    description: skill.description,
    category: skill.category,
    categoryLabel: skill.categoryLabel,
    emoji: skill.emoji,
    status: skill.status,
    hasScripts: skill.hasScripts,
    source: skill.source,
    repoPath: skill.repoPath,
  };
}

function collectScriptDirs(scriptModules: Record<string, string>): Set<string> {
  const dirs = new Set<string>();
  for (const path of Object.keys(scriptModules)) {
    const dir = skillDirFromPath(path);
    if (dir) dirs.add(dir);
  }
  return dirs;
}

function buildSkillFromModule(
  modulePath: string,
  raw: string,
  dirsWithScripts: Set<string>
): { skill: Skill } | { parseFailed: true } {
  const dir = skillDirFromPath(modulePath) ?? 'unknown';
  const parsed = parseSkillMd(raw);
  if (!parsed) {
    console.warn('[skillRegistry] failed to parse SKILL.md', modulePath);
    return { parseFailed: true };
  }

  const id = (parsed.name?.trim() || dir).trim();
  const resolved = resolveSkillCategory(id);
  const skill: Skill = {
    id,
    title: extractTitleFromBody(parsed.body, id),
    description: parsed.description,
    category: resolved.category,
    categoryLabel: resolved.categoryLabel,
    emoji: parsed.emoji,
    status: resolved.status,
    hasScripts: dirsWithScripts.has(dir),
    source: 'amazon-skills',
    repoPath: `${dir}/SKILL.md`,
    body: parsed.body,
    raw,
    frontmatter: parsed.frontmatter,
  };
  return { skill };
}

function indexSkillModules(
  skillModules: Record<string, string>,
  scriptModules: Record<string, string>
): { byId: Map<string, Skill>; parseFailures: number } {
  const byId = new Map<string, Skill>();
  let parseFailures = 0;
  const dirsWithScripts = collectScriptDirs(scriptModules);
  const entries = Object.entries(skillModules).sort(([a], [b]) => a.localeCompare(b));

  for (const [modulePath, raw] of entries) {
    const result = buildSkillFromModule(modulePath, raw, dirsWithScripts);
    if (!result) continue;
    if ('parseFailed' in result) {
      parseFailures += 1;
      continue;
    }
    if (byId.has(result.skill.id)) {
      console.warn(
        '[skillRegistry] duplicate skill id, keeping first',
        result.skill.id,
        modulePath
      );
      continue;
    }
    byId.set(result.skill.id, result.skill);
  }

  if (byId.size === 0) {
    console.error(
      '[skillRegistry] empty — ensure vendor/amazon-skills is present (or git submodule update --init --recursive)'
    );
  }

  return { byId, parseFailures };
}

function matchesSkillQuery(skill: Skill, query: SkillSearchQuery, keyword: string): boolean {
  if (query.category && query.category !== 'all' && skill.category !== query.category) {
    return false;
  }
  if (query.status && query.status !== 'all' && skill.status !== query.status) {
    return false;
  }
  if (typeof query.hasScripts === 'boolean' && skill.hasScripts !== query.hasScripts) {
    return false;
  }
  if (!keyword) return true;
  const haystack = `${skill.id} ${skill.title} ${skill.description}`.toLowerCase();
  return haystack.includes(keyword);
}

function assertRegistryReady(byId: Map<string, Skill>, action: string): void {
  if (byId.size === 0) {
    throw new SystemError(
      'Skill registry is empty. Ensure vendor/amazon-skills is present.',
      'SKILL_REG_002',
      { module: 'skillRegistry', action }
    );
  }
}

function requireSkill(byId: Map<string, Skill>, id: string, action: string): Skill {
  const skill = byId.get(id);
  if (!skill) {
    throw new ValidationError(`Skill not found: ${id}`, 'SKILL_REG_001', 'skillId', id, {
      module: 'skillRegistry',
      action,
    });
  }
  return skill;
}

function formatSkill(skill: Skill, options?: SkillLoadOptions): string {
  return options?.format === 'body' ? skill.body : skill.raw;
}

export function createSkillRegistry(deps: SkillRegistryDeps = {}): SkillRegistryApi {
  let initialized = false;
  let byId = new Map<string, Skill>();
  let parseFailures = 0;

  function ensureInitialized(): void {
    if (initialized) return;
    initialized = true;
    const skillModules = deps.skillModules ?? loadProductionSkillModules();
    const scriptModules = deps.scriptModules ?? loadProductionScriptModules();
    const indexed = indexSkillModules(skillModules, scriptModules);
    byId = indexed.byId;
    parseFailures = indexed.parseFailures;
  }

  function listSkills(query: SkillSearchQuery = {}): SkillMeta[] {
    ensureInitialized();
    const keyword = query.keyword?.trim().toLowerCase() ?? '';
    return [...byId.values()]
      .filter(skill => matchesSkillQuery(skill, query, keyword))
      .map(toMeta)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  function getSkill(id: string): Skill | undefined {
    ensureInitialized();
    return byId.get(id);
  }

  function hasSkill(id: string): boolean {
    return Boolean(getSkill(id));
  }

  function getCategories(): SkillCategoryInfo[] {
    ensureInitialized();
    const counts = new Map<SkillCategoryId, number>();
    for (const skill of byId.values()) {
      counts.set(skill.category, (counts.get(skill.category) ?? 0) + 1);
    }
    return CATEGORY_ORDER.filter(id => (counts.get(id) ?? 0) > 0).map(id => ({
      id,
      label: CATEGORY_LABELS[id],
      count: counts.get(id) ?? 0,
    }));
  }

  function loadSkillContext(id: string, options?: SkillLoadOptions): string {
    ensureInitialized();
    assertRegistryReady(byId, 'loadSkillContext');
    return formatSkill(requireSkill(byId, id, 'loadSkillContext'), options);
  }

  function loadSkillsContext(
    ids: string[],
    options?: SkillLoadOptions & { strict?: boolean }
  ): string {
    ensureInitialized();
    assertRegistryReady(byId, 'loadSkillsContext');
    const blocks: string[] = [];
    for (const id of ids) {
      const skill = byId.get(id);
      if (!skill) {
        if (options?.strict) {
          throw new ValidationError(`Skill not found: ${id}`, 'SKILL_REG_001', 'skillId', id, {
            module: 'skillRegistry',
            action: 'loadSkillsContext',
          });
        }
        console.warn('[skillRegistry] skipping missing skill id', id);
        continue;
      }
      blocks.push(`---\n# Skill: ${id}\n${formatSkill(skill, options)}\n---`);
    }
    return blocks.join('\n\n');
  }

  function getStats(): SkillRegistryStats {
    ensureInitialized();
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const skill of byId.values()) {
      byCategory[skill.category] = (byCategory[skill.category] ?? 0) + 1;
      byStatus[skill.status] = (byStatus[skill.status] ?? 0) + 1;
    }
    return { total: byId.size, parseFailures, byCategory, byStatus };
  }

  return {
    ensureInitialized,
    listSkills,
    getSkill,
    hasSkill,
    getCategories,
    loadSkillContext,
    loadSkillsContext,
    getStats,
  };
}

export const skillRegistry: SkillRegistryApi = createSkillRegistry();
