/**
 * 商品名称合规程序化校验服务（Amazon Product Title Rules 2026）。
 *
 * P2 阶段落地：纯函数校验器，确定性、零幻觉、可单元测试。
 * 只做"检测 + 建议"，不拦截存量数据、不改变既有业务流程。
 *
 * 设计要点：
 * - 主入口 checkTitleCompliance 为纯函数，无任何副作用（无 DOM / 无异步 / 无 import.meta / 无 configCenter 读写）
 * - 规则引擎采用注册表模式：新增规则只需向 RULES 追加一条，不改动主逻辑
 * - 硬规则（长度 / 重复词 / 禁用字符 / 促销语）定级 error，由程序确定性判定；
 *   软规则（信息顺序 / 大小写 / 末尾标点）定级 warning/info，为启发式，仅"建议复核"
 * - 版本分流：v1 经典版（180 字符 + 促销语 + 末尾标点）为 v2 子集，通过规则的 versions 字段自然分流
 * - 类目差异化：媒体类（books/music/video/dvd）字符上限 50；沙特/埃及/土耳其/阿联酋站点豁免新规
 * - 脏输入不抛错：null / undefined 返回降级报告，超长输入（>10000）返回输入异常报告
 *
 * 与 promptlabService 的版本归一化行为一致：非法版本 fallback 至 v1。
 * 注意边界规则：services 层不得依赖模块层，因此校验规则不直接 import promptlabService，
 * 而是内联同样的归一化逻辑（v1/v2 双值枚举），保持跨模块一致。
 */

export type ComplianceSeverity = 'error' | 'warning' | 'info';

export interface TitleComplianceIssue {
  /** 规则编码，如 'max-length' */
  rule: string;
  /** 严重级别 */
  severity: ComplianceSeverity;
  /** 面向用户的人类可读描述（中文，可直接展示在复核 UI） */
  message: string;
  /** 问题片段或触发内容（可选） */
  detail?: string;
  /** 修正建议（可选） */
  suggestion?: string;
}

export type ListingComplianceVersion = 'v1' | 'v2';

export interface TitleComplianceInput {
  /** 待校验标题 */
  title: string;
  /**
   * 规则集版本：'v1' 经典版（兼容旧口径），'v2' 2026 新规版。
   * 默认 v2；非法值 fallback 至 v1（与 promptlab 归一化行为一致）。
   */
  version?: string;
  /** 类目（用于类目差异化：媒体类上限 50 字符） */
  category?: string;
  /** 商城站点（用于豁免站点判断） */
  marketplaceId?: string;
  /** 可选：输入携带变体标题列表时启用变体一致性校验 */
  variants?: string[];
}

export interface TitleComplianceReport {
  /** 是否全部通过（仅 error 级计为不通过） */
  passed: boolean;
  /** 命中的问题列表 */
  issues: TitleComplianceIssue[];
  /** 各规则命中数量统计 */
  summary: Record<string, number>;
  /** 合规得分 0-100（供 keyword_hunter rubric 复用） */
  score: number;
  /** 实际应用的规则集版本（回显，便于调试） */
  appliedVersion: ListingComplianceVersion;
}

// ============================================================
// 常量与阈值（默认值，全部可被调用方覆盖）
// ============================================================

/** v2（2026 新规）默认字符上限 */
const V2_MAX_LENGTH = 75;
/** v1（经典版）字符上限 */
const V1_MAX_LENGTH = 180;
/** 媒体类（books / music / video / dvd 等）字符上限 */
const MEDIA_MAX_LENGTH = 50;
/** 字词重复上限：任一词出现次数不得高于此值 */
const DEFAULT_MAX_WORD_REPEAT = 2;
/** 商品亮点字段总字符上限（超标时建议信息移入亮点字段） */
const BULLET_HIGHLIGHTS_MAX = 125;
/** 超大输入防御阈值：超过此长度直接返回输入异常报告 */
const MAX_INPUT_LENGTH = 10000;

/** 豁免计数的介词 / 冠词 / 连词（大小写不敏感） */
const WORD_REPEAT_EXEMPT = new Set(['in', 'on', 'with', 'for', 'the', 'a', 'an', 'and', 'or']);

/** 编码 / 测量上下文中豁免的特殊字符（~ # < > *） */
const MEASUREMENT_ALLOWED_CHARS = new Set(['~', '#', '<', '>', '*']);

/** 无条件禁用的特殊字符 */
const BANNED_CHARS = new Set(['!', '$', '?', '_', '{', '}', '^', '¬', '¦', '；']);

/**
 * 2026 新规促销 / 受限用语词库（大小写不敏感匹配）。
 * 覆盖：促销语（free shipping / best seller / sale / guarantee 等）
 * 与主观宣称（amazing / fantastic / 100% 等）。
 * 后续可经由 ConfigCenter 扩展，本文件内置默认清单。
 */
export const PROMO_PHRASES: ReadonlyArray<string> = [
  'free shipping',
  'free gift',
  'best seller',
  'bestseller',
  'top seller',
  'top rated',
  'hot item',
  'hot deal',
  'sale',
  'discount',
  'clearance',
  'limited time',
  'guarantee',
  'guaranteed',
  'lowest price',
  'cheapest',
  'best quality',
  'premium quality',
  '100% quality',
  'amazing',
  'fantastic',
  'incredible',
  'superior',
  'number one',
  'no.1',
  'cheap',
  'wholesale',
  'on sale',
  'buy one get one',
  'as seen on tv',
];

/** 媒体类类目标识（小写匹配） */
const MEDIA_CATEGORIES = new Set([
  'books',
  'book',
  'music',
  'video',
  'dvd',
  'movies',
  'cd',
  'vinyl',
]);

/** 豁免新规的商城站点（沙特/埃及/土耳其/阿联酋，小写匹配） */
const EXEMPT_MARKETPLACES = new Set(['sa', 'eg', 'tr', 'ae']);

// ============================================================
// 版本归一化
// ============================================================

/**
 * 校验并规范化合规版本偏好。
 * 任何非 'v2' 的值（含 undefined / null / 旧值）均 fallback 到 v1，
 * 与 promptlabService.normalizeListingPromptVersion 行为完全一致。
 */
export function normalizeComplianceVersion(value: unknown): ListingComplianceVersion {
  return value === 'v2' ? 'v2' : 'v1';
}

// ============================================================
// 规则引擎
// ============================================================

interface RuleContext {
  version: ListingComplianceVersion;
  maxTitleLength: number;
  maxWordRepeat: number;
  skipRules: ReadonlySet<string>;
}

type RuleChecker = (
  title: string,
  ctx: RuleContext,
  input: TitleComplianceInput
) => TitleComplianceIssue | null;

interface RuleEntry {
  rule: string;
  severity: ComplianceSeverity;
  versions: ReadonlyArray<ListingComplianceVersion>;
  check: RuleChecker;
}

/** 分词：按 Unicode 词边界提取，保留词与位置，过滤豁免词 */
function tokenize(title: string): { word: string; lower: string; index: number }[] {
  const tokens: { word: string; lower: string; index: number }[] = [];
  const regex = /[\p{L}\p{N}]+/gu;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(title)) !== null) {
    const word = match[0];

    tokens.push({ word, lower: word.toLowerCase(), index: match.index });
  }
  return tokens;
}

/** 标题式分词（保留分隔符位置，用于信息顺序 / 大小写检查） */
function splitTokens(title: string): string[] {
  return title.split(/[\s\-–—|/,]+/).filter(t => t.length > 0);
}

/** 上下文特殊字符（编码 / 测量）判定：字符前后紧邻数字或单位 */
function isMeasurementContext(title: string, pos: number, char: string): boolean {
  if (!MEASUREMENT_ALLOWED_CHARS.has(char)) {
    return false;
  }
  const before = title.slice(Math.max(0, pos - 3), pos);
  const after = title.slice(pos + 1, pos + 4);
  const adjacentDigit = /\d/.test(before.slice(-1)) || /\d/.test(after.slice(0, 1));
  const adjacentUnit =
    /(cm|mm|kg|lb|oz|in|ft|ml|l\b)/i.test(after) || /(cm|mm|kg|lb|oz|in|ft|ml)/i.test(before);
  return adjacentDigit || adjacentUnit;
}

const RULES: readonly RuleEntry[] = [
  {
    rule: 'max-length',
    severity: 'error',
    versions: ['v1', 'v2'],
    check: (title, ctx) => {
      const count = [...title].length;
      if (count <= ctx.maxTitleLength) {
        return null;
      }
      const diff = count - ctx.maxTitleLength;
      return {
        rule: 'max-length',
        severity: 'error',
        message: `标题字符数 ${count} 超出上限 ${ctx.maxTitleLength}（含空格），超出 ${diff} 个字符`,
        suggestion: `精简至 ${ctx.maxTitleLength} 字符以内：优先删减冗余修饰语与重复表述`,
      };
    },
  },
  {
    rule: 'word-repeat',
    severity: 'error',
    versions: ['v2'],
    check: (title, ctx) => {
      const tokens = tokenize(title);
      const counts = new Map<string, number>();
      const firstWord: Record<string, string> = {};
      for (const t of tokens) {
        if (WORD_REPEAT_EXEMPT.has(t.lower)) {
          continue;
        }
        counts.set(t.lower, (counts.get(t.lower) ?? 0) + 1);
        if (!firstWord[t.lower]) {
          firstWord[t.lower] = t.word;
        }
      }
      const violators: string[] = [];
      const entries = Array.from(counts.entries());
      for (const [word, count] of entries) {
        if (count > ctx.maxWordRepeat) {
          const fw = firstWord[word];
          if (fw) {
            violators.push(fw);
          }
        }
      }
      if (violators.length === 0) {
        return null;
      }
      return {
        rule: 'word-repeat',
        severity: 'error',
        message: `以下词语出现超过 ${ctx.maxWordRepeat} 次：${violators.join('、')}`,
        detail: violators.join(', '),
        suggestion: '合并重复表述（品牌名同样计入次数），保留最重要的出现位置',
      };
    },
  },
  {
    rule: 'banned-chars',
    severity: 'error',
    versions: ['v2'],
    check: (title, _ctx) => {
      const found: { char: string; position: number }[] = [];
      for (let i = 0; i < title.length; i += 1) {
        const char = title.charAt(i);
        if (BANNED_CHARS.has(char)) {
          found.push({ char, position: i });
        } else if (MEASUREMENT_ALLOWED_CHARS.has(char) && !isMeasurementContext(title, i, char)) {
          found.push({ char, position: i });
        }
      }
      if (found.length === 0) {
        return null;
      }
      const distinct = [...new Set(found.map(f => f.char))].join(' ');
      return {
        rule: 'banned-chars',
        severity: 'error',
        message: `标题包含禁用特殊字符：${distinct}（~ # < > * 仅允许出现在编码 / 测量上下文）`,
        detail: found.map(f => `'${f.char}' @${f.position}`).join('; '),
        suggestion: '删除装饰性特殊字符，编码或测量场景保留紧邻数字 / 单位的 ~ # < > *',
      };
    },
  },
  {
    rule: 'promo-phrases',
    severity: 'error',
    versions: ['v1', 'v2'],
    check: (title, _ctx) => {
      const lower = title.toLowerCase();
      const hit = PROMO_PHRASES.filter(phrase => {
        // 全词匹配：避免 "top rated" 误伤 "topratedmodel" 类连写词
        const idx = lower.indexOf(phrase);
        if (idx === -1) {
          return false;
        }
        const beforeOk = idx === 0 || /[^a-z0-9\u4e00-\u9fff]/.test(lower.charAt(idx - 1));
        const afterIdx = idx + phrase.length;
        const afterOk =
          afterIdx >= lower.length || /[^a-z0-9\u4e00-\u9fff]/.test(lower.charAt(afterIdx));
        return beforeOk && afterOk;
      });
      if (hit.length === 0) {
        return null;
      }
      return {
        rule: 'promo-phrases',
        severity: 'error',
        message: `标题包含促销 / 受限用语：${hit.join('、')}`,
        detail: hit.join(', '),
        suggestion: '删除促销表述与主观宣称，保留客观商品属性描述',
      };
    },
  },
  {
    rule: 'info-order',
    severity: 'warning',
    versions: ['v2'],
    check: (title, _ctx) => {
      // 启发式：品牌名由调用方提供（首词兜底），品牌名不应出现在非首位且
      // 前面出现尺寸 / 颜色等尾部信息成分（型号 / 颜色 / 尺寸通常排在末尾）。
      const tokens = splitTokens(title);
      if (tokens.length < 3) {
        return null;
      }
      const tailMarkers = /\b(size|color|colour|model|no\.?|pack|count|pcs|色|号|型)\b/i;
      const trailingTail = tokens.slice(-3).some(t => tailMarkers.test(t));
      if (trailingTail) {
        // 末尾信息正常，视为顺序无大碍（弱启发式，不报问题）
        return null;
      }
      // 反例形态：标题以尺寸 / 型号 / 颜色 / 容量规格词开头（品牌信息被后置）
      const headToken = tokens[0];
      if (headToken === undefined) {
        return null;
      }
      const headMarker =
        /^(size|color|colour|model|pack|count|pcs|cm|mm|kg|lb|色|号|型)/i.test(headToken) ||
        /^\d+(\s?mAh|\s?ml|\s?gb|\s?tb|\s?inch)?$/i.test(headToken) ||
        /^\d+[a-z]?(pack|pcs|count)/i.test(headToken);
      if (!headMarker) {
        return null;
      }
      return {
        rule: 'info-order',
        severity: 'warning',
        message: '标题疑似以尺寸 / 型号 / 颜色等尾部信息开头，建议复核信息顺序',
        suggestion: '建议顺序：品牌 → 款式 → 类型 → 属性 → 颜色 / 尺寸 → 型号',
      };
    },
  },
  {
    rule: 'capitalization',
    severity: 'warning',
    versions: ['v2'],
    check: (title, _ctx) => {
      const tokens = splitTokens(title);
      // 全大写且长度 >= 3 的单词视为疑似大写违规（排除品牌惯用全大写：首词豁免）
      const allCaps = tokens.filter(
        t => t.length >= 3 && t === t.toUpperCase() && /[A-Z]{3,}/.test(t)
      );
      if (allCaps.length <= 1) {
        return null;
      }
      return {
        rule: 'capitalization',
        severity: 'warning',
        message: `标题包含 ${allCaps.length} 个全大写单词（疑似大写违规，首词品牌名除外）：${allCaps.join('、')}`,
        suggestion: '建议标题式大写（Title Case），介词 / 冠词 / 连词小写',
      };
    },
  },
  {
    rule: 'trailing-punct',
    severity: 'info',
    versions: ['v1', 'v2'],
    check: (title, _ctx) => {
      const trimmed = title.trimEnd();
      if (!trimmed) {
        return null;
      }
      const last = trimmed.charAt(trimmed.length - 1);
      if (!/[,。！？.!\u3002\uff01\uff1f]/.test(last)) {
        return null;
      }
      return {
        rule: 'trailing-punct',
        severity: 'info',
        message: `标题末尾含标点「${last}」`,
        suggestion: '删除标题末尾标点',
      };
    },
  },
  {
    rule: 'bullet-hint',
    severity: 'info',
    versions: ['v2'],
    check: (title, ruleCtx) => {
      // 与 max-length 联动：超长时建议溢出信息移入商品亮点字段
      const count = [...title].length;
      if (count <= ruleCtx.maxTitleLength) {
        return null;
      }
      return {
        rule: 'bullet-hint',
        severity: 'info',
        message: '溢出信息建议放入商品亮点（Product Highlights）字段',
        suggestion: `商品亮点字段总长不超过 ${BULLET_HIGHLIGHTS_MAX} 字符，用逗号分隔短语承接标题放不下的属性`,
      };
    },
  },
  {
    rule: 'variant-consistency',
    severity: 'info',
    versions: ['v2'],
    check: (title, _ctx, input) => {
      const variants = input.variants;
      if (!variants || variants.length < 2) {
        return null;
      }
      // 词级 diff 启发式：取标题中不在所有变体公共词集里的位置词数量作为
      // 结构一致性指标；差异词过多视为结构不统一。
      const baseTokens = new Set(tokenize(title).map(t => t.lower));
      let maxDiff = 0;
      for (const v of variants) {
        const vTokens = new Set(tokenize(v).map(t => t.lower));
        let diff = 0;
        for (const b of baseTokens) {
          if (!vTokens.has(b)) diff += 1;
        }
        for (const vt of vTokens) {
          if (!baseTokens.has(vt)) diff += 1;
        }
        maxDiff = Math.max(maxDiff, diff);
      }
      if (maxDiff <= 2) {
        return null;
      }
      return {
        rule: 'variant-consistency',
        severity: 'info',
        message: `标题与变体标题结构差异较大（差异词 ${maxDiff} 个），建议复核变体标题一致性`,
        suggestion: '父 ASIN 标题不应含尺寸 / 颜色，子 ASIN 仅保留最关键变体属性，其余放入亮点字段',
      };
    },
  },
];

// ============================================================
// 上下文构建
// ============================================================

function buildContext(input: TitleComplianceInput): {
  ctx: RuleContext;
  version: ListingComplianceVersion;
} {
  const version = normalizeComplianceVersion(input.version);
  const maxLength = version === 'v2' ? V2_MAX_LENGTH : V1_MAX_LENGTH;
  const skipRules = new Set<string>();

  // 类目差异化：媒体类上限 50 字符
  const category = (input.category ?? '').trim().toLowerCase();
  const effectiveMax = MEDIA_CATEGORIES.has(category)
    ? Math.min(maxLength, MEDIA_MAX_LENGTH)
    : maxLength;

  // 豁免站点：跳过全部新规规则，仅保留 v1 基础项
  const marketplace = (input.marketplaceId ?? '').trim().toLowerCase();
  if (EXEMPT_MARKETPLACES.has(marketplace)) {
    for (const entry of RULES) {
      if (entry.versions.includes('v2') && entry.rule !== 'max-length') {
        skipRules.add(entry.rule);
      }
    }
  }

  return {
    version,
    ctx: {
      version,
      maxTitleLength: effectiveMax,
      maxWordRepeat: DEFAULT_MAX_WORD_REPEAT,
      skipRules,
    },
  };
}

// ============================================================
// 主入口
// ============================================================

/** 降级报告：脏输入时返回，不抛错 */
function degradationReport(
  appliedVersion: ListingComplianceVersion,
  issue: TitleComplianceIssue
): TitleComplianceReport {
  return {
    passed: false,
    issues: [issue],
    summary: { [issue.rule]: 1 },
    score: 0,
    appliedVersion,
  };
}

/**
 * 计算合规得分（0-100）：error 每条 -20，warning 每条 -8，info 每条 -3，下限 0。
 * 得分供 keyword_hunter rubric 的程序化初筛复用。
 */
function computeScore(issues: TitleComplianceIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'error') {
      score -= 20;
    } else if (issue.severity === 'warning') {
      score -= 8;
    } else {
      score -= 3;
    }
  }
  return Math.max(0, score);
}

/**
 * 主入口：对商品名称做一次全规则合规校验。
 * 纯函数：无任何副作用，不依赖 DOM / 异步 / 全局状态。
 */
export function checkTitleCompliance(input: TitleComplianceInput): TitleComplianceReport {
  const rawTitle = input?.title;
  if (rawTitle === null || rawTitle === undefined || typeof rawTitle !== 'string') {
    return degradationReport('v1', {
      rule: 'invalid-input',
      severity: 'error',
      message: '校验输入无效：title 必须为非空字符串',
      suggestion: '传入待校验的商品名称字符串',
    });
  }
  if (rawTitle.length > MAX_INPUT_LENGTH) {
    return degradationReport('v1', {
      rule: 'invalid-input',
      severity: 'error',
      message: `校验输入超长（${rawTitle.length} 字符，上限 ${MAX_INPUT_LENGTH}），疑似异常输入，跳过规则校验`,
      suggestion: '确认输入来源后重试',
    });
  }

  const { version, ctx } = buildContext(input);
  const issues: TitleComplianceIssue[] = [];
  const summary: Record<string, number> = {};

  for (const entry of RULES) {
    if (ctx.skipRules.has(entry.rule)) {
      continue;
    }
    if (!entry.versions.includes(ctx.version)) {
      continue;
    }
    const issue = entry.check(rawTitle, ctx, input);
    if (issue) {
      issues.push(issue);
      summary[issue.rule] = (summary[issue.rule] ?? 0) + 1;
    }
  }

  return {
    passed: issues.every(i => i.severity !== 'error'),
    issues,
    summary,
    score: computeScore(issues),
    appliedVersion: version,
  };
}

// ============================================================
// 单项快检（供 AI 分析管道 / 复核 UI 按需调用）
// ============================================================

/** 快速判断标题长度是否合规（不触发其他规则） */
export function isTitleLengthValid(title: string, version?: string): boolean {
  const v = normalizeComplianceVersion(version);
  const maxLength = v === 'v2' ? V2_MAX_LENGTH : V1_MAX_LENGTH;
  return [...title].length <= maxLength;
}

/** 提取重复超标的词语（不含豁免词） */
export function extractRepeatWordViolations(title: string): string[] {
  const tokens = tokenize(title);
  const counts = new Map<string, number>();
  const firstWord: Record<string, string> = {};
  for (const t of tokens) {
    if (WORD_REPEAT_EXEMPT.has(t.lower)) {
      continue;
    }
    counts.set(t.lower, (counts.get(t.lower) ?? 0) + 1);
    if (!firstWord[t.lower]) {
      firstWord[t.lower] = t.word;
    }
  }
  const violators: string[] = [];
  for (const [word, count] of Array.from(counts.entries())) {
    if (count > DEFAULT_MAX_WORD_REPEAT) {
      const fw = firstWord[word];
      if (fw) {
        violators.push(fw);
      }
    }
  }
  return violators;
}
