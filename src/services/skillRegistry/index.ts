export type {
  Skill,
  SkillMeta,
  SkillCategoryId,
  SkillLoadOptions,
  SkillSearchQuery,
  SkillRegistryStats,
  SkillCategoryInfo,
} from './types';
export { skillRegistry, createSkillRegistry } from './skillRegistryService';
export type { SkillRegistryApi, SkillRegistryDeps } from './skillRegistryService';
export { CATEGORY_LABELS, resolveSkillCategory } from './categoryMap';
