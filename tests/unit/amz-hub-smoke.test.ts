/**
 * AMZ_HUB 模块 smoke tests
 * 覆盖所有知识条目入口的 mount/unmount 生命周期
 * 参考 promo_tools/index.test.ts 模式
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// 静态模板导入会触发 Alpine/Chart.js 等，先 stub 可能的副作用
vi.mock('@/common/utils/lazyLibs', () => ({
  loadChartJs: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/common/utils/security', () => ({
  escapeHtml: (s: string) => String(s).replace(/[&<>"']/g, ''),
  setSafeHtml: (el: HTMLElement, html: string) => {
    el.innerHTML = html;
  },
}));

import { mount as mountOverview, unmount as unmountOverview } from '@/modules/amz_hub/views/overview/index';
import { mount as mountEuInsights, unmount as unmountEuInsights } from '@/modules/amz_hub/views/knowledge/eu_insights/index';
import { mount as mountSeoStrategy, unmount as unmountSeoStrategy } from '@/modules/amz_hub/views/knowledge/seo_strategy/index';
import { mount as mountEcosystem, unmount as unmountEcosystem } from '@/modules/amz_hub/views/knowledge/ecosystem/index';
import { mount as mountQualityListing, unmount as unmountQualityListing } from '@/modules/amz_hub/views/practice/quality_listing/index';
import { mount as mountMarketingCalendar, unmount as unmountMarketingCalendar } from '@/modules/amz_hub/views/practice/marketing_calendar/index';
import { mount as mountPromoActivities, unmount as unmountPromoActivities } from '@/modules/amz_hub/views/practice/promo_activities/index';
import { mount as mountNewProduct30days, unmount as unmountNewProduct30days } from '@/modules/amz_hub/views/advanced/new_product_30days/index';
import { mount as mountConversionOptimization, unmount as unmountConversionOptimization } from '@/modules/amz_hub/views/advanced/conversion_optimization/index';
import { mount as mountMaturePhase, unmount as unmountMaturePhase } from '@/modules/amz_hub/views/advanced/mature_phase/index';

interface ModuleFixture {
  name: string;
  mount: (c: HTMLElement) => Promise<void>;
  unmount: () => void;
  containerClass: string;
  /** 模板渲染后必须存在的关键 selector */
  requiredSelectors: string[];
}

const fixtures: ModuleFixture[] = [
  {
    name: 'overview',
    mount: mountOverview,
    unmount: unmountOverview,
    containerClass: 'amz-hub-overview',
    requiredSelectors: ['.wb-title', '.sop-card-grid'],
  },
  {
    name: 'eu_insights',
    mount: mountEuInsights,
    unmount: unmountEuInsights,
    containerClass: 'eu-page',
    requiredSelectors: ['#amz_countrySelector', '.wb-title'],
  },
  {
    name: 'seo_strategy',
    mount: mountSeoStrategy,
    unmount: unmountSeoStrategy,
    containerClass: 'seo-page',
    requiredSelectors: ['.wb-title'],
  },
  {
    name: 'ecosystem',
    mount: mountEcosystem,
    unmount: unmountEcosystem,
    containerClass: 'eco-page',
    requiredSelectors: ['.wb-title', '#amz_a10Chart'],
  },
  {
    name: 'quality_listing',
    mount: mountQualityListing,
    unmount: unmountQualityListing,
    containerClass: 'ql-page',
    requiredSelectors: ['.wb-title'],
  },
  {
    name: 'marketing_calendar',
    mount: mountMarketingCalendar,
    unmount: unmountMarketingCalendar,
    containerClass: 'amzf_main',
    requiredSelectors: ['#amzf_country_tabs', '#amzf_main'],
  },
  {
    name: 'promo_activities',
    mount: mountPromoActivities,
    unmount: unmountPromoActivities,
    containerClass: 'amzpa_callout',
    requiredSelectors: ['.wb-title'],
  },
  {
    name: 'new_product_30days',
    mount: mountNewProduct30days,
    unmount: unmountNewProduct30days,
    containerClass: 'np30-page',
    requiredSelectors: ['.wb-title'],
  },
  {
    name: 'conversion_optimization',
    mount: mountConversionOptimization,
    unmount: unmountConversionOptimization,
    containerClass: 'cvo-page',
    requiredSelectors: ['.wb-title'],
  },
  {
    name: 'mature_phase',
    mount: mountMaturePhase,
    unmount: unmountMaturePhase,
    containerClass: 'mp-page',
    requiredSelectors: ['.wb-title', '.fas.fa-trophy'],
  },
];

describe('AMZ_HUB 模块 smoke tests', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  fixtures.forEach((fx) => {
    describe(`${fx.name} module`, () => {
      afterEach(() => {
        fx.unmount();
      });

      it('mounts template with fade-in class', async () => {
        await fx.mount(container);

        expect(container.classList.contains('fade-in')).toBe(true);
      });

      it('renders required selectors after mount', async () => {
        await fx.mount(container);

        fx.requiredSelectors.forEach((sel) => {
          expect(
            container.querySelector(sel),
            `selector "${sel}" not found in ${fx.name} template`,
          ).not.toBeNull();
        });
      });
    });
  });
});
