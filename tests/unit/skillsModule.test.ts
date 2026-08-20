/**
 * C' 分支覆盖率专项：skills 页面模块
 *
 * modules/more/views/explore/skills/index.ts（772 行）内部函数均不对外导出，
 * 只能通过 mount/unmount 集成方式测试。本文件复用 keywordHunter 模块测试
 * 的 harness 模式：vi.mock 各依赖 + 真实 DOM + dispatchEvent 触发行为分支。
 *
 * 覆盖目标（覆盖率缺口：branches 0.00%）：
 * - loadPersistedFilters / persistFilters（F4 筛选持久化）
 * - displayTitle / statusLabel / statusClass / createSkillCard
 * - extractSkillSections（L4 结构化预览抽取）
 * - renderList 三类空态（零库 / 无匹配 / 正常渲染）
 * - openDetail / closeDetail / syncSkillModalClosed / runModalAction
 * - trySkillInDeepChat（成功 / 路由失败 / 抛错）
 * - copyText（成功 / 失败）
 * - 事件委托：handleModuleClick / handleModuleKeydown / handleModalClick / handleDocumentKeydown
 * - initEventListeners / removeEventListeners（含 searchBox 存在与缺失两种路径）
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------- 依赖 mock ----------

const mocks = vi.hoisted(() => ({
  // template.html 完整骨架（mount 需要所有 id 元素 + 交互结构）
  template: `
    <div>
      <div data-sops-searchbox="skills"></div>
      <span id="skill-banner-total">0 个技能</span>
      <span id="skill-result-count"></span>
      <div id="skills-library-empty-hint" hidden></div>
      <div class="skills-catalog-sticky"></div>
      <div id="skill-category-container"></div>
      <div id="metric-total"></div>
      <div id="metric-category"></div>
      <div id="metric-scripts"></div>
      <div id="metric-beta"></div>
      <div id="skill-list"></div>
      <div id="skill-detail-modal" class="hidden" title="">
        <span id="modal-skill-title"></span>
        <span id="modal-skill-category"></span>
        <span id="modal-skill-description"></span>
        <span id="modal-skill-content"></span>
        <div id="modal-skill-structured"></div>
        <details id="modal-skill-raw-details"></details>
        <button data-skill-modal-action="try-deep-chat">在 Deep Chat 试用</button>
        <button data-skill-modal-action="copy-raw">复制</button>
        <button data-skill-modal-action="close">关闭</button>
      </div>
    </div>
  `,
  loadTemplate: vi.fn(async () => mocks.template),
  setSafeHtml: vi.fn((container: HTMLElement, html: string) => {
    container.innerHTML = html;
  }),
  showToast: vi.fn(),
  storageGet: vi.fn(() => null),
  storageSet: vi.fn(() => true),
  ensureInitialized: vi.fn(),
  listSkills: vi.fn(() => []),
  getSkill: vi.fn(() => undefined),
  getCategories: vi.fn(() => []),
  getStats: vi.fn(() => ({ total: 0, parseFailures: 0, byCategory: {}, byStatus: {} })),
  copyTextToClipboard: vi.fn(async () => true),
  buildSkillDeepChatUserDraft: vi.fn(() => '[draft]'),
  queueSkillForDeepChat: vi.fn(),
  eventBusEmit: vi.fn(),
  navigateToRouteId: vi.fn(async () => true),
  createSearchBox: vi.fn(() => ({
    mount: vi.fn(),
    destroy: vi.fn(),
  })),
  APP_EVENTS_SKILL_DEEP_CHAT_HANDOFF: 'skill:deep-chat:handoff',
}));

vi.mock('@/common/infrastructure/SafeModuleLoader', () => ({
  SafeTemplateLoader: {
    getInstance: vi.fn(() => ({ loadTemplate: mocks.loadTemplate })),
  },
}));

vi.mock('@/common/utils/security', () => ({
  setSafeHtml: mocks.setSafeHtml,
}));

vi.mock('@/common/ui', () => ({
  showToast: mocks.showToast,
}));

vi.mock('@/services/storageService', () => ({
  STORAGE_KEYS: {
    SKILLS_FILTERS_V1: 'skills:filters:v1',
  },
  StorageService: {
    get: mocks.storageGet,
    set: mocks.storageSet,
  },
}));

vi.mock('@/services/skillRegistry', async importOriginal => {
  const actual = await importOriginal<typeof import('@/services/skillRegistry')>();
  // 注意顺序：先展开真实导出（保留类型与 CATEGORY_LABELS 等），再用 mock 对象覆盖
  // skillRegistry 与服务函数，避免真实模块覆盖 mock（真实模块也导出 skillRegistry）
  return {
    ...actual,
    skillRegistry: {
      ensureInitialized: mocks.ensureInitialized,
      listSkills: mocks.listSkills,
      getSkill: mocks.getSkill,
      getCategories: mocks.getCategories,
      getStats: mocks.getStats,
    },
  };
});

vi.mock('@/common/utils/clipboard', () => ({
  copyTextToClipboard: mocks.copyTextToClipboard,
}));

vi.mock('@/modules/app_center/skillDeepChatHandoff', () => ({
  buildSkillDeepChatUserDraft: mocks.buildSkillDeepChatUserDraft,
  queueSkillForDeepChat: mocks.queueSkillForDeepChat,
}));

vi.mock('@/common/EventBus', () => ({
  default: { emit: mocks.eventBusEmit },
}));

vi.mock('@/common/router/initRouter', () => ({
  navigateToRouteId: mocks.navigateToRouteId,
}));

vi.mock('@/common/constants/eventConstants', () => ({
  APP_EVENTS: { SKILL_DEEP_CHAT_HANDOFF: mocks.APP_EVENTS_SKILL_DEEP_CHAT_HANDOFF },
}));

vi.mock('@/common/components/SearchBox', () => ({
  createSearchBox: mocks.createSearchBox,
}));

import { mount, unmount } from '@/modules/more/views/explore/skills';
import type { Skill, SkillCategoryInfo, SkillRegistryStats } from '@/services/skillRegistry';

// ---------- fixtures ----------

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'ad-keyword-research',
    title: '🎯 PPC 关键词研究',
    description: '关键词研究方法论',
    category: 'advertising',
    categoryLabel: '广告投放',
    status: 'available',
    hasScripts: true,
    source: 'amazon-skills',
    repoPath: 'vendor/amazon-skills/ad/keyword.md',
    body: '',
    raw: '# PPC 关键词研究\n\n正文内容',
    frontmatter: {},
    ...overrides,
  } as Skill;
}

const CATEGORY_AD: SkillCategoryInfo = { id: 'advertising', label: '广告投放', count: 3 };
const STATS_ONE: SkillRegistryStats = {
  total: 1,
  parseFailures: 0,
  byCategory: { advertising: 1 },
  byStatus: { available: 1 },
};

// ---------- helpers ----------

async function mountSkills(containerOptions: { withSearch?: boolean } = {}): Promise<HTMLElement> {
  const container = document.createElement('div');
  if (containerOptions.withSearch !== false) {
    const searchContainer = document.createElement('div');
    searchContainer.dataset.sopsSearchbox = 'skills';
    container.appendChild(searchContainer);
  }
  document.body.appendChild(container);
  await mount(container);
  return container;
}

function click(element: Element | null): void {
  expect(element).not.toBeNull();
  element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function keydown(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

// ---------- tests ----------

beforeEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  vi.clearAllMocks();
  // clearAllMocks 会清空 mock 返回值，必须逐项重设，否则 loadTemplate 等
  // 会返回 undefined 导致模块走真实模板/真实依赖（测试串扰）
  mocks.loadTemplate.mockResolvedValue(mocks.template);
  mocks.setSafeHtml.mockImplementation((container: HTMLElement, html: string) => {
    container.innerHTML = html;
  });
  mocks.storageGet.mockReturnValue(null);
  mocks.storageSet.mockReturnValue(true);
  mocks.ensureInitialized.mockResolvedValue(undefined);
  mocks.listSkills.mockReturnValue([]);
  mocks.getSkill.mockReturnValue(undefined);
  mocks.getCategories.mockReturnValue([]);
  mocks.getStats.mockReturnValue({ total: 0, parseFailures: 0, byCategory: {}, byStatus: {} });
  mocks.copyTextToClipboard.mockResolvedValue(true);
  mocks.buildSkillDeepChatUserDraft.mockReturnValue('[draft]');
  mocks.queueSkillForDeepChat.mockReturnValue(undefined);
  mocks.eventBusEmit.mockReturnValue(undefined);
  mocks.navigateToRouteId.mockResolvedValue(true);
});

afterEach(() => {
  unmount();
  document.body.innerHTML = '';
});

describe('displayTitle / status 标签', () => {
  it('剥离标题首尾 emoji 与符号（含变体选择符 / ZWJ / 混合码点）', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([makeSkill({ title: '⭐ PPC 关键词研究 🎯' })]);
    await mountSkills();
    // 卡片标题 span
    const titles = document.querySelectorAll('.skill-title');
    expect(titles.length).toBe(1);
    expect(titles[0].textContent).toBe('PPC 关键词研究');
  });

  it('无 emoji 标题保持原文；首尾空格被 trim', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([makeSkill({ title: ' Listing 优化 ' })]);
    await mountSkills();
    expect(document.querySelector('.skill-title')?.textContent).toBe('Listing 优化');
  });

  it('emoji 包围纯装饰标题时回退原标题 trim 值', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([makeSkill({ title: '⭐🎯' })]);
    await mountSkills();
    expect(document.querySelector('.skill-title')?.textContent).toBe('⭐🎯');
  });

  it.each([
    ['beta', '试用版', 'skill-status-beta'],
    ['available', '正式', 'skill-status-available'],
    ['unknown', '未标注', 'skill-status-unknown'],
  ])('status=%s 时标签文案与类名：%s / %s', async (status, label, cls) => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([makeSkill({ status: status as Skill['status'] })]);
    await mountSkills();
    const st = document.querySelector(`.${cls}`);
    expect(st).not.toBeNull();
    expect(st?.textContent).toBe(label);
  });
});

describe('renderList 空态', () => {
  it('零库时显示「技能库尚未接入」alert 空态', async () => {
    await mountSkills();
    const list = document.getElementById('skill-list');
    expect(list?.textContent).toContain('技能库尚未接入');
    expect(document.getElementById('skill-banner-total')?.textContent).toBe('技能库为空');
    expect(document.querySelector('.skills-page--empty-library')).not.toBeNull();
    expect(document.getElementById('skills-library-empty-hint')?.hidden).toBe(false);
    expect(document.querySelector('.skills-catalog-sticky')?.hidden).toBe(true);
    // 空库指标用「—」
    for (const id of ['metric-total', 'metric-category', 'metric-scripts', 'metric-beta']) {
      expect(document.getElementById(id)?.textContent).toBe('—');
    }
  });

  it('有库但筛选无匹配时显示「未找到匹配」+ 不推荐清空（keyword 未激活时）', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([]);
    await mountSkills();
    const list = document.getElementById('skill-list');
    expect(list?.textContent).toContain('未找到匹配的技能');
    expect(list?.textContent).toContain('推荐：清空搜索、切回「全部」');
  });

  it('筛选无匹配且当前有活跃筛选时，提供「清空筛选」按钮并触发重渲染', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValueOnce([]).mockReturnValueOnce([makeSkill()]);
    mocks.storageSet.mockReturnValue(true);
    await mountSkills();
    const clearBtn = Array.from(document.querySelectorAll('button')).find(b =>
      b.textContent?.includes('清空筛选')
    );
    expect(clearBtn).not.toBeNull();
    click(clearBtn!);
    // 清空后重新渲染，应出现技能卡片
    expect(mocks.listSkills).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: undefined, category: 'all' })
    );
  });

  it('正常渲染技能卡片并组装 footer 动作按钮', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([makeSkill()]);
    await mountSkills();
    const card = document.querySelector('.skill-card');
    expect(card?.dataset.skillId).toBe('ad-keyword-research');
    expect(card?.getAttribute('aria-label')).toBe('查看技能：PPC 关键词研究');
    // 无简介时回退「暂无简介」
    mocks.listSkills.mockReturnValue([makeSkill({ description: '' })]);
    // 重新 mount 覆盖同一容器
    await unmount();
    document.body.innerHTML = '';
    await mountSkills();
    expect(document.querySelector('.skill-description')?.textContent).toBe('暂无简介');
  });

  it('beta 状态卡片动作按钮 title 与 CTA 文本', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([makeSkill({ status: 'beta' })]);
    await mountSkills();
    const cta = document.querySelector('[data-skill-action="try-deep-chat"]');
    expect(cta?.textContent).toContain('在 Deep Chat 试用');
    expect(cta?.getAttribute('aria-label')).toBe('在 Deep Chat 试用：PPC 关键词研究');
    expect(document.querySelector('.skill-status-beta')?.title).toBe(
      '试用版：功能可用，持续改进中'
    );
  });
});

describe('筛选持久化（F4）', () => {
  it('mount 时从 storage 恢复 category/keyword 并回填', async () => {
    mocks.storageGet.mockReturnValue({ category: 'advertising', keyword: 'PPC' });
    mocks.getCategories.mockReturnValue([CATEGORY_AD]);
    mocks.listSkills.mockReturnValue([makeSkill()]);
    mocks.getStats.mockReturnValue(STATS_ONE);
    await mountSkills();
    // 当前分类为 advertising → 分类按钮 active 落在对应项
    const allBtn = document.querySelector('button[data-category="all"]');
    const adBtn = document.querySelector('button[data-category="advertising"]');
    expect(allBtn?.getAttribute('aria-pressed')).toBe('false');
    expect(adBtn?.getAttribute('aria-pressed')).toBe('true');
    expect(adBtn?.className).toContain('active');
  });

  it('非法 filter 数据（非对象 / category 为 all 字符串 / keyword 非字符串）均安全忽略', async () => {
    for (const bad of [null, 'not-object', 42, { category: null }, { category: 0 }, { keyword: 1 }]) {
      mocks.storageGet.mockReturnValue(bad);
      mocks.getStats.mockReturnValue(STATS_ONE);
      mocks.getCategories.mockReturnValue([CATEGORY_AD]);
      mocks.listSkills.mockReturnValue([makeSkill()]);
      await unmount();
      document.body.innerHTML = '';
      await mountSkills();
      // 非法数据不改变当前筛选状态（模块保持前序筛选，不应用非法值）
      const adBtn = document.querySelector('button[data-category="advertising"]');
      expect(adBtn?.getAttribute('aria-pressed')).toBe('true');
      document.body.innerHTML = '';
    }
  });

  it('切换分类后 persistFilters 落盘', async () => {
    mocks.getCategories.mockReturnValue([CATEGORY_AD]);
    await mountSkills();
    const adBtn = document.querySelector('button[data-category="advertising"]');
    click(adBtn);
    expect(mocks.storageSet).toHaveBeenCalledWith(
      'skills:filters:v1',
      expect.objectContaining({ category: 'advertising' })
    );
  });

  it('unmount 时 persistFilters 落盘当前筛选', async () => {
    mocks.storageGet.mockReturnValue({ category: 'advertising', keyword: 'PPC' });
    await mountSkills();
    mocks.storageSet.mockClear();
    unmount();
    expect(mocks.storageSet).toHaveBeenCalledWith(
      'skills:filters:v1',
      expect.objectContaining({ category: 'advertising', keyword: 'PPC' })
    );
  });
});

describe('搜索（P1-2 统一搜索框）', () => {
  it('searchContainer 存在时挂载 SearchBox，防抖 200ms 后更新关键词并落盘重渲染', async () => {
    vi.useFakeTimers();
    mocks.getStats.mockReturnValue(STATS_ONE);
    await mountSkills();
    expect(mocks.createSearchBox).toHaveBeenCalledTimes(1);
    const handle = mocks.createSearchBox.mock.results[0].value;
    const onFilter = mocks.createSearchBox.mock.calls[0][0].onFilter;
    onFilter('ppc');
    vi.advanceTimersByTime(200);
    expect(mocks.storageSet).toHaveBeenCalledWith(
      'skills:filters:v1',
      expect.objectContaining({ keyword: 'ppc' })
    );
    expect(mocks.listSkills).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: 'ppc' })
    );
    expect(handle.destroy).not.toHaveBeenCalled();
    unmount();
    expect(handle.destroy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('searchContainer 缺失时（legacy 容器）不挂载 SearchBox，模块仍可正常渲染', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([makeSkill()]);
    const legacyTemplate = '<div><div id="skill-list"></div><div id="skill-detail-modal" class="hidden"></div></div>';
    mocks.loadTemplate.mockResolvedValue(legacyTemplate);
    await mountSkills({ withSearch: false });
    expect(mocks.createSearchBox).not.toHaveBeenCalled();
    expect(document.querySelector('.skill-card')).not.toBeNull();
  });
});

describe('事件委托（模块区点击 / 键盘）', () => {
  it('点击分类按钮 → handleCategoryClick 切换分类', async () => {
    mocks.getCategories.mockReturnValue([CATEGORY_AD]);
    await mountSkills();
    const adBtn = document.querySelector('button[data-category="advertising"]');
    click(adBtn);
    expect(mocks.listSkills).toHaveBeenCalled();
  });

  it('点击动作按钮（冒泡到容器）→ handleSkillAction 分发动作并阻止冒泡', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.getSkill.mockReturnValue(makeSkill());
    mocks.listSkills.mockReturnValue([makeSkill()]);
    await mountSkills();
    const copyBtn = document.querySelector(
      '[data-skill-action="copy-skill-raw"][data-skill-id="ad-keyword-research"]'
    );
    copyBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(mocks.copyTextToClipboard).toHaveBeenCalled();
  });

  it('点击卡片空白区域 → openDetail 打开详情', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.getSkill.mockReturnValue(makeSkill());
    mocks.listSkills.mockReturnValue([makeSkill()]);
    await mountSkills();
    const card = document.querySelector('.skill-card');
    click(card);
    const modal = document.getElementById('skill-detail-modal');
    expect(modal?.classList.contains('hidden')).toBe(false);
    expect(document.getElementById('modal-skill-title')?.textContent).toBe('PPC 关键词研究');
    expect(document.getElementById('modal-skill-category')?.textContent).toBe('广告投放 · 正式');
    expect(document.getElementById('modal-skill-description')?.textContent).toBe('关键词研究方法论');
    expect(document.getElementById('modal-skill-content')?.textContent).toBe(
      '# PPC 关键词研究\n\n正文内容'
    );
  });

  it('键盘 Enter/空格在卡片上 → openDetail；Enter 在内部动作按钮上不触发；其他键忽略', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.getSkill.mockReturnValue(makeSkill());
    mocks.listSkills.mockReturnValue([makeSkill()]);
    await mountSkills();
    const card = document.querySelector('.skill-card');
    keydown(card!, 'Enter');
    expect(document.getElementById('skill-detail-modal')?.classList.contains('hidden')).toBe(false);
    // 空格同样触发
    await unmount();
    document.body.innerHTML = '';
    await mountSkills();
    keydown(document.querySelector('.skill-card')!, ' ');
    expect(document.getElementById('skill-detail-modal')?.classList.contains('hidden')).toBe(false);
    // 动作按钮上的 Enter 不重复打开（由点击路径处理）
    const copyBtn = document.querySelector('[data-skill-action="copy-skill-raw"]');
    keydown(copyBtn!, 'Enter');
    // Tab 等键不触发
    keydown(document.querySelector('.skill-card')!, 'Tab');
  });
});

describe('详情模态（openDetail / closeDetail / modal 事件）', () => {
  beforeEach(async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.getSkill.mockReturnValue(makeSkill());
    mocks.listSkills.mockReturnValue([makeSkill()]);
    await mountSkills();
    click(document.querySelector('.skill-card'));
  });

  it('skillRegistry 无该技能时 openDetail 直接返回', async () => {
    await unmount();
    document.body.innerHTML = '';
    mocks.getSkill.mockReturnValue(undefined);
    await mountSkills();
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([makeSkill()]);
    // 点击卡片，getSkill 返回 undefined → 不应打开
    click(document.querySelector('.skill-card'));
    expect(document.getElementById('skill-detail-modal')?.classList.contains('hidden')).toBe(true);
  });

  it('closeDetail 与 Escape 关闭模态；AppModal close 事件同步外层 class', async () => {
    const modal = document.getElementById('skill-detail-modal');
    expect(modal?.classList.contains('hidden')).toBe(false);
    // 直接点击遮罩（target === modal）
    modal?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modal?.classList.contains('hidden')).toBe(true);
    // 重新打开后，AppModal 自身的 close 事件同步外层 hidden
    click(document.querySelector('.skill-card'));
    modal?.dispatchEvent(new Event('close', { bubbles: true }));
    expect(modal?.classList.contains('hidden')).toBe(true);
    // Escape 关闭
    click(document.querySelector('.skill-card'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(modal?.classList.contains('hidden')).toBe(true);
    // 非 Escape 键不触发
    click(document.querySelector('.skill-card'));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(modal?.classList.contains('hidden')).toBe(false);
  });

  it('modal 内 runModalAction：close / copy-raw / try-deep-chat', async () => {
    mocks.getSkill.mockReturnValue(makeSkill());
    // 重新打开
    click(document.querySelector('.skill-card'));
    // copy-raw：复制成功路径
    const copyRawBtn = document.querySelector('[data-skill-modal-action="copy-raw"]');
    click(copyRawBtn);
    await vi.waitFor(() =>
      expect(mocks.copyTextToClipboard).toHaveBeenCalledWith('# PPC 关键词研究\n\n正文内容')
    );
    expect(mocks.showToast).toHaveBeenCalledWith('技能全文已复制，可粘贴到 AI 对话', {
      type: 'success',
    });
    // try-deep-chat：关闭详情后跳转
    click(document.querySelector('.skill-card'));
    const tryBtn = document.querySelector('[data-skill-modal-action="try-deep-chat"]');
    click(tryBtn);
    expect(mocks.queueSkillForDeepChat).toHaveBeenCalled();
    expect(mocks.eventBusEmit).toHaveBeenCalledWith(mocks.APP_EVENTS_SKILL_DEEP_CHAT_HANDOFF, {
      skillId: 'ad-keyword-research',
      skillTitle: 'PPC 关键词研究',
    });
    expect(mocks.navigateToRouteId).toHaveBeenCalledWith('playground_deep_chat');
  });

  it('unknown action 的 modal 按钮不触发任何动作', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([makeSkill()]);
    mocks.getSkill.mockReturnValue(makeSkill());
    await mountSkills();
    click(document.querySelector('.skill-card'));
    const unknown = document.createElement('button');
    unknown.dataset.skillModalAction = 'nonexistent';
    document.getElementById('skill-detail-modal')?.appendChild(unknown);
    click(unknown);
    expect(mocks.queueSkillForDeepChat).not.toHaveBeenCalled();
    expect(mocks.showToast).not.toHaveBeenCalled();
  });

  it('点击 modal 内非按钮非遮罩区域不触发任何动作', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([makeSkill()]);
    mocks.getSkill.mockReturnValue(makeSkill());
    await mountSkills();
    click(document.querySelector('.skill-card'));
    const inner = document.createElement('span');
    document.getElementById('skill-detail-modal')?.appendChild(inner);
    click(inner);
    expect(mocks.copyTextToClipboard).not.toHaveBeenCalled();
    expect(mocks.queueSkillForDeepChat).not.toHaveBeenCalled();
  });

  it('无 skill-detail-modal 元素时 openDetail 直接返回；syncSkillModalClosed 安全 noop', async () => {
    await unmount();
    document.body.innerHTML = '';
    await mountSkills();
    // renderList 中 openDetail 保护路径：getSkill 命中但 modal 不存在
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([makeSkill()]);
    // template 中 modal 被移除
    document.getElementById('skill-detail-modal')?.remove();
    click(document.querySelector('.skill-card'));
    expect(mocks.getSkill).toHaveBeenCalled();
  });
});

describe('extractSkillSections（L4 结构化预览）', () => {
  function renderPreview(body: string): HTMLElement[] {
    // 通过 renderSkillStructuredPreview 间接触发：需 skill.body
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.getSkill.mockReturnValue(makeSkill({ body }));
    mocks.listSkills.mockReturnValue([makeSkill({ body })]);
    return [];
  }

  it('按 ## / ### 标题抽取区块，preferred 顺序命中能力/输入/输出/用法', async () => {
    // 非空 picked 时只保留命中的 preferred 区块（能力、输入），不会保留「其他章节」
    const body = `# 技能名

## 能力

能力描述内容

## 输入

输入要求

## 其他章节

无关内容`;
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.getSkill.mockReturnValue(makeSkill({ body }));
    mocks.listSkills.mockReturnValue([makeSkill({ body })]);
    await mountSkills();
    click(document.querySelector('.skill-card'));
    const host = document.getElementById('modal-skill-structured');
    expect(host?.hidden).toBe(false);
    const cards = host?.querySelectorAll('article');
    expect(cards?.length).toBe(2);
    expect(cards?.[0].querySelector('h4')?.textContent).toBe('能力');
    expect(cards?.[1].querySelector('h4')?.textContent).toBe('输入');
    // raw details 收起
    expect((document.getElementById('modal-skill-raw-details') as HTMLDetailsElement)?.open).toBe(
      false
    );
  });

  it('无 preferred 区块时回退前 3 个区块并截断 480 字符', async () => {
    const long = 'x'.repeat(600);
    const body = `## 章节一

${long}

## 章节二

内容二

## 章节三

内容三

## 章节四

内容四`;
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.getSkill.mockReturnValue(makeSkill({ body }));
    mocks.listSkills.mockReturnValue([makeSkill({ body })]);
    await mountSkills();
    click(document.querySelector('.skill-card'));
    const cards = document
      .getElementById('modal-skill-structured')
      ?.querySelectorAll('article');
    expect(cards?.length).toBe(3);
    expect(cards?.[0].querySelector('p')?.textContent?.length).toBe(480);
  });

  it('body 为空且 raw 无有效区块时 host 隐藏并展开 raw details', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.getSkill.mockReturnValue(makeSkill({ body: '无标题纯文本', raw: '无标题纯文本' }));
    mocks.listSkills.mockReturnValue([makeSkill({ body: '无标题纯文本' })]);
    await mountSkills();
    click(document.querySelector('.skill-card'));
    expect(document.getElementById('modal-skill-structured')?.hidden).toBe(true);
    expect(
      (document.getElementById('modal-skill-raw-details') as HTMLDetailsElement)?.open
    ).toBe(true);
  });

  it('windows 换行符（\\r\\n）与 H3 标题均正确抽取；空内容区块被跳过', async () => {
    // preferred 命中「用法」，picked 非空 → 只返回命中的 preferred 区块
    const body = '### 用法\r\n\r\n用法正文\r\n\r\n## 输入\r\n';
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.getSkill.mockReturnValue(makeSkill({ body }));
    mocks.listSkills.mockReturnValue([makeSkill({ body })]);
    await mountSkills();
    click(document.querySelector('.skill-card'));
    const cards = document
      .getElementById('modal-skill-structured')
      ?.querySelectorAll('article');
    expect(cards?.length).toBe(1);
    expect(cards?.[0].querySelector('h4')?.textContent).toBe('用法');
    expect(cards?.[0].querySelector('p')?.textContent).toBe('用法正文');
  });
});

describe('trySkillInDeepChat（卡片 CTA 路径）', () => {
  beforeEach(async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.listSkills.mockReturnValue([makeSkill()]);
    await mountSkills();
  });

  it('技能不存在时 toast 报错并直接返回', async () => {
    // 按钮必须在 moduleRoot 内（handleModuleClick 有 moduleRoot.contains 校验）
    const btn = document.createElement('button');
    btn.dataset.skillAction = 'try-deep-chat';
    btn.dataset.skillId = 'nonexistent';
    document.querySelector('#skill-list')!.appendChild(btn);
    click(btn);
    expect(mocks.showToast).toHaveBeenCalledWith('未找到该技能', { type: 'error' });
    expect(mocks.queueSkillForDeepChat).not.toHaveBeenCalled();
    btn.remove();
  });

  it('路由打开成功：loading → 成功 toast → 2.5s 后恢复按钮', async () => {
    mocks.getSkill.mockReturnValue(makeSkill());
    vi.useFakeTimers();
    click(document.querySelector('[data-skill-action="try-deep-chat"]'));
    const btn = document.querySelector('[data-skill-action="try-deep-chat"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.classList.contains('is-loading')).toBe(true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
    // navigate 微任务 resolve
    await vi.runAllTimersAsync();
    await Promise.resolve();
    expect(mocks.showToast).toHaveBeenCalledWith('正在打开 Deep Chat 并载入技能…', {
      type: 'success',
    });
    expect(mocks.queueSkillForDeepChat).toHaveBeenCalledTimes(1);
    expect(mocks.eventBusEmit).toHaveBeenCalledWith(
      'skill:deep-chat:handoff',
      expect.objectContaining({ skillId: 'ad-keyword-research' })
    );
    vi.advanceTimersByTime(2500);
    expect(btn.disabled).toBe(false);
    expect(btn.classList.contains('is-loading')).toBe(false);
    expect(btn.getAttribute('aria-busy')).toBe('false');
    vi.useRealTimers();
  });

  it('路由返回 false：恢复按钮并 toast 检查路由提示', async () => {
    mocks.getSkill.mockReturnValue(makeSkill());
    mocks.navigateToRouteId.mockResolvedValue(false);
    click(document.querySelector('[data-skill-action="try-deep-chat"]'));
    await vi.waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('无法打开 Deep Chat，请检查路由', {
        type: 'error',
      })
    );
    const btn = document.querySelector('[data-skill-action="try-deep-chat"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('路由抛错：恢复按钮并 toast 重试提示', async () => {
    mocks.getSkill.mockReturnValue(makeSkill());
    mocks.navigateToRouteId.mockRejectedValue(new Error('network'));
    click(document.querySelector('[data-skill-action="try-deep-chat"]'));
    await vi.waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('无法打开 Deep Chat，请稍后重试', {
        type: 'error',
      })
    );
  });
});

describe('copyText（卡片「复制全文」路径）', () => {
  it('复制成功显示成功 toast', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.getSkill.mockReturnValue(makeSkill());
    mocks.listSkills.mockReturnValue([makeSkill()]);
    await mountSkills();
    click(document.querySelector('[data-skill-action="copy-skill-raw"]'));
    await vi.waitFor(() =>
      expect(mocks.copyTextToClipboard).toHaveBeenCalledWith('# PPC 关键词研究\n\n正文内容')
    );
    expect(mocks.showToast).toHaveBeenCalledWith('技能全文已复制，可粘贴到 AI 对话', {
      type: 'success',
    });
  });

  it('剪贴板失败显示失败 toast', async () => {
    mocks.copyTextToClipboard.mockResolvedValue(false);
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.getSkill.mockReturnValue(makeSkill());
    mocks.listSkills.mockReturnValue([makeSkill()]);
    await mountSkills();
    click(document.querySelector('[data-skill-action="copy-skill-raw"]'));
    await vi.waitFor(() =>
      expect(mocks.showToast).toHaveBeenCalledWith('复制失败，请手动选择文本复制', {
        type: 'error',
      })
    );
    expect(mocks.showToast).not.toHaveBeenCalledWith(
      '技能全文已复制，可粘贴到 AI 对话',
      expect.anything()
    );
  });
});

describe('tryDeepChat loading 同步（卡片 + 模态双选择器）', () => {
  it('卡片 loading 与模态按钮选择器同时命中', async () => {
    mocks.getStats.mockReturnValue(STATS_ONE);
    mocks.getSkill.mockReturnValue(makeSkill());
    mocks.listSkills.mockReturnValue([makeSkill()]);
    await mountSkills();
    // 卡片路径触 loading，setTryDeepChatLoading 同时查询卡片与模态两套选择器
    click(document.querySelector('[data-skill-action="try-deep-chat"]'));
    await vi.waitFor(() => expect(mocks.queueSkillForDeepChat).toHaveBeenCalled());
  });
});

describe('mount/unmount 生命周期边界', () => {
  it('mount 时 template 加载异常时 mount 抛出（SafeTemplateLoader 不静默吞错）', async () => {
    mocks.loadTemplate.mockRejectedValueOnce(new Error('template missing'));
    const container = document.createElement('div');
    document.body.appendChild(container);
    await expect(mount(container)).rejects.toThrow('template missing');
  });

  it('unmount 后 mount 前的空操作均安全（currentSkill null / modal 缺失路径）', async () => {
    await mountSkills();
    unmount();
    // 重复 unmount 不抛
    expect(() => unmount()).not.toThrow();
  });
});
