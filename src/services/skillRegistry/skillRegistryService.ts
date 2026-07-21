import { SystemError, ValidationError } from '@/common/errors';
import { Logger } from '@/services/loggerService';
import { CATEGORY_LABELS, resolveSkillCategory } from './categoryMap';
import {
  loadProductionScriptModules,
  loadProductionSkillModules,
} from './loadSkillModules';
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

export function createSkillRegistry(deps: SkillRegistryDeps = {}): SkillRegistryApi {
  let initialized = false;
  const byId = new Map<string, Skill>();
  let parseFailures = 0;

  function ensureInitialized(): void {
    if (initialized) return;
    initialized = true;

    const skillModules = deps.skillModules ?? loadProductionSkillModules();
    const scriptModules = deps.scriptModules ?? loadProductionScriptModules();

    const dirsWithScripts = new Set<string>();
    for (const path of Object.keys(scriptModules)) {
      const dir = skillDirFromPath(path);
      if (dir) dirsWithScripts.add(dir);
    }

    const entries = Object.entries(skillModules);
    entries.sort(([a], [b]) => a.localeCompare(b));

    for (const [modulePath, raw] of entries) {
      const dir = skillDirFromPath(modulePath) ?? 'unknown';
      const parsed = parseSkillMd(raw);
      if (!parsed) {
        parseFailures += 1;
        Logger.warn('skillRegistry: failed to parse SKILL.md', {
          module: 'skillRegistry',
          path: modulePath,
        });
        continue;
      }

      const id = (parsed.name?.trim() || dir).trim();
      if (byId.has(id)) {
        Logger.warn('skillRegistry: duplicate skill id, keeping first', {
          module: 'skillRegistry',
          skillId: id,
          path: modulePath,
        });
        continue;
      }

      const resolved = resolveSkillCategory(id);
      const title = extractTitleFromBody(parsed.body, id);
      const skill: Skill = {
        id,
        title,
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
      byId.set(id, skill);
    }

    if (byId.size === 0) {
      Logger.error(
        'skillRegistry empty — ensure vendor/amazon-skills is present (or run git submodule update --init --recursive)',
        { module: 'skillRegistry', action: 'ensureInitialized' }
      );
    }
  }

  function listSkills(query: SkillSearchQuery = {}): SkillMeta[] {
    ensureInitialized();
    const keyword = query.keyword?.trim().toLowerCase() ?? '';
    return [...byId.values()]
      .filter(skill => {
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
        return (
          skill.id.toLowerCase().includes(keyword) ||
          skill.title.toLowerCase().includes(keyword) ||
          skill.description.toLowerCase().includes(keyword)
        );
      })
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
    const order: SkillCategoryId[] = [
      'product_research',
      'competitor',
      'pricing_profit',
      'advertising',
      'listing',
      'analytics',
      'growth',
      'other',
    ];
    return order
      .filter(id => (counts.get(id) ?? 0) > 0)
      .map(id => ({ id, label: CATEGORY_LABELS[id], count: counts.get(id) ?? 0 }));
  }

  function formatSkill(skill: Skill, options?: SkillLoadOptions): string {
    return options?.format === 'body' ? skill.body : skill.raw;
  }

  function loadSkillContext(id: string, options?: SkillLoadOptions): string {
    ensureInitialized();
    if (byId.size === 0) {
      throw new SystemError(
        'Skill registry is empty. Ensure vendor/amazon-skills is present.',
        'SKILL_REG_002',
        { module: 'skillRegistry', action: 'loadSkillContext' }
      );
    }
    const skill = byId.get(id);
    if (!skill) {
      throw new ValidationError(`Skill not found: ${id}`, 'SKILL_REG_001', 'skillId', id, {
        module: 'skillRegistry',
        action: 'loadSkillContext',
      });
    }
    return formatSkill(skill, options);
  }

  function loadSkillsContext(
    ids: string[],
    options?: SkillLoadOptions & { strict?: boolean }
  ): string {
    ensureInitialized();
    if (byId.size === 0) {
      throw new SystemError(
        'Skill registry is empty. Ensure vendor/amazon-skills is present.',
        'SKILL_REG_002',
        { module: 'skillRegistry', action: 'loadSkillsContext' }
      );
    }

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
        Logger.warn('skillRegistry: skipping missing skill id', {
          module: 'skillRegistry',
          skillId: id,
        });
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
    return {
      total: byId.size,
      parseFailures,
      byCategory,
      byStatus,
    };
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
