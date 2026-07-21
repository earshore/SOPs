export type SkillCategoryId =
  | 'product_research'
  | 'competitor'
  | 'pricing_profit'
  | 'advertising'
  | 'listing'
  | 'analytics'
  | 'growth'
  | 'other';

export type SkillStatus = 'available' | 'beta' | 'unknown';

export type SkillLoadFormat = 'raw' | 'body';

export interface SkillMeta {
  id: string;
  title: string;
  description: string;
  category: SkillCategoryId;
  categoryLabel: string;
  emoji?: string;
  status: SkillStatus;
  hasScripts: boolean;
  source: 'amazon-skills';
  repoPath: string;
}

export interface Skill extends SkillMeta {
  body: string;
  raw: string;
  frontmatter: Record<string, unknown>;
}

export interface SkillLoadOptions {
  format?: SkillLoadFormat;
}

export interface SkillSearchQuery {
  keyword?: string;
  category?: SkillCategoryId | 'all';
  status?: SkillStatus | 'all';
  hasScripts?: boolean;
}

export interface SkillCategoryInfo {
  id: SkillCategoryId;
  label: string;
  count: number;
}

export interface SkillRegistryStats {
  total: number;
  parseFailures: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface ParseSkillMdResult {
  name?: string;
  description: string;
  body: string;
  frontmatter: Record<string, unknown>;
  emoji?: string;
}
