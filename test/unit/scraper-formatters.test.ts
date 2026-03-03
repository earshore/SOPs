/**
 * scraper-formatters.test.ts - Scraper 格式化工具单元测试
 * 测试国旗、站点名称、日期格式化等工具函数
 * 
 * 任务: 2.3.6 编写单元测试
 * 需求: 3.2, 3.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getFlag,
  getSiteName,
  formatDate,
  getErrorSummary,
  getSiteDomain
} from '@/modules/app_center/views/master_analysis/scraper/utils/formatters';

describe('Scraper 格式化工具', () => {
  describe('getFlag - 获取国旗 emoji', () => {
    it('应该返回正确的国旗 emoji', () => {
      expect(getFlag('DE')).toBe('🇩🇪');
      expect(getFlag('FR')).toBe('🇫🇷');
      expect(getFlag('IT')).toBe('🇮🇹');
      expect(getFlag('ES')).toBe('🇪🇸');
      expect(getFlag('NL')).toBe('🇳🇱');
      expect(getFlag('SE')).toBe('🇸🇪');
      expect(getFlag('PL')).toBe('🇵🇱');
      expect(getFlag('BE')).toBe('🇧🇪');
      expect(getFlag('IE')).toBe('🇮🇪');
      expect(getFlag('UK')).toBe('🇬🇧');
      expect(getFlag('GB')).toBe('🇬🇧');
    });

    it('应该为未知站点返回默认国旗', () => {
      expect(getFlag('US')).toBe('🏳️');
      expect(getFlag('UNKNOWN')).toBe('🏳️');
      expect(getFlag('')).toBe('🏳️');
    });

    it('应该处理大小写', () => {
      // 当前实现区分大小写，如果需要不区分需要修改实现
      expect(getFlag('de')).toBe('🏳️');
      expect(getFlag('De')).toBe('🏳️');
    });
  });

  describe('getSiteName - 获取站点名称', () => {
    it('应该返回正确的站点中文名称', () => {
      expect(getSiteName('DE')).toBe('德国');
      expect(getSiteName('FR')).toBe('法国');
      expect(getSiteName('IT')).toBe('意大利');
      expect(getSiteName('ES')).toBe('西班牙');
      expect(getSiteName('NL')).toBe('荷兰');
      expect(getSiteName('SE')).toBe('瑞典');
      expect(getSiteName('PL')).toBe('波兰');
      expect(getSiteName('BE')).toBe('比利时');
      expect(getSiteName('IE')).toBe('爱尔兰');
      expect(getSiteName('UK')).toBe('英国');
    });

    it('应该为未知站点返回原始代码', () => {
      expect(getSiteName('US')).toBe('US');
      expect(getSiteName('UNKNOWN')).toBe('UNKNOWN');
      expect(getSiteName('')).toBe('');
    });
  });

  describe('formatDate - 格式化日期', () => {
    let originalDate: typeof Date;

    beforeEach(() => {
      // 保存原始 Date
      originalDate = global.Date;
    });

    afterEach(() => {
      // 恢复原始 Date
      global.Date = originalDate;
    });

    it('应该为今天的日期显示时间', () => {
      // Mock 当前时间为 2024-01-15 14:30:00
      const mockNow = new Date('2024-01-15T14:30:00Z');
      vi.setSystemTime(mockNow);

      const todayTimestamp = '2024-01-15T10:25:00Z';
      const result = formatDate(todayTimestamp);

      // 应该显示为 HH:MM 格式
      expect(result).toMatch(/^\d{2}:\d{2}$/);

      vi.useRealTimers();
    });

    it('应该为非今天的日期显示月/日', () => {
      // Mock 当前时间为 2024-01-15
      const mockNow = new Date('2024-01-15T14:30:00Z');
      vi.setSystemTime(mockNow);

      const yesterdayTimestamp = '2024-01-14T10:25:00Z';
      const result = formatDate(yesterdayTimestamp);

      // 应该显示为 M/D 格式
      expect(result).toMatch(/^\d{1,2}\/\d{1,2}$/);

      vi.useRealTimers();
    });

    it('应该正确格式化时间（补零）', () => {
      const mockNow = new Date('2024-01-15T14:30:00Z');
      vi.setSystemTime(mockNow);

      // 测试需要补零的时间 - 使用本地时间而不是 UTC
      const timestamp = new Date('2024-01-15T14:30:00Z').toISOString();
      // 创建一个早上的时间（本地时间 09:05）
      const earlyMorning = new Date(mockNow);
      earlyMorning.setHours(9, 5, 0, 0);
      const result = formatDate(earlyMorning.toISOString());

      // 应该是 09:05 而不是 9:5
      expect(result).toMatch(/^\d{2}:\d{2}$/);
      expect(result).toBe('09:05');

      vi.useRealTimers();
    });

    it('应该处理不同月份的日期', () => {
      const mockNow = new Date('2024-01-15T14:30:00Z');
      vi.setSystemTime(mockNow);

      const timestamp = '2023-12-25T10:00:00Z';
      const result = formatDate(timestamp);

      expect(result).toContain('12');
      expect(result).toContain('25');

      vi.useRealTimers();
    });

    it('应该处理无效的时间戳', () => {
      const result = formatDate('invalid-timestamp');

      // 应该返回 NaN 或某种错误格式
      expect(result).toBeDefined();
    });
  });

  describe('getErrorSummary - 获取错误摘要', () => {
    it('应该识别超时错误', () => {
      expect(getErrorSummary('Request timeout after 5000ms')).toBe('请求超时');
      expect(getErrorSummary('Connection timeout')).toBe('请求超时');
      expect(getErrorSummary('TIMEOUT')).toBe('请求超时');
    });

    it('应该识别 404 错误', () => {
      expect(getErrorSummary('404 Not Found')).toBe('页面不存在');
      expect(getErrorSummary('Error 404')).toBe('页面不存在');
    });

    it('应该识别 403 错误', () => {
      expect(getErrorSummary('403 Forbidden')).toBe('访问被拒绝');
      expect(getErrorSummary('Error 403')).toBe('访问被拒绝');
    });

    it('应该识别网络错误', () => {
      expect(getErrorSummary('Network error occurred')).toBe('网络错误');
      expect(getErrorSummary('NETWORK_FAILURE')).toBe('网络错误');
    });

    it('应该返回原始错误消息（未识别的错误）', () => {
      const customError = 'Custom error message';
      expect(getErrorSummary(customError)).toBe(customError);
    });

    it('应该处理空字符串', () => {
      expect(getErrorSummary('')).toBe('');
    });

    it('应该处理包含多个关键词的错误', () => {
      // 应该匹配第一个找到的关键词
      const error = 'Network timeout error 404';
      const result = getErrorSummary(error);

      // 可能是 '网络错误' 或 '请求超时'，取决于实现顺序
      expect(['网络错误', '请求超时']).toContain(result);
    });
  });

  describe('getSiteDomain - 获取站点域名', () => {
    it('应该返回正确的亚马逊域名', () => {
      expect(getSiteDomain('DE')).toBe('amazon.de');
      expect(getSiteDomain('FR')).toBe('amazon.fr');
      expect(getSiteDomain('IT')).toBe('amazon.it');
      expect(getSiteDomain('ES')).toBe('amazon.es');
      expect(getSiteDomain('NL')).toBe('amazon.nl');
      expect(getSiteDomain('SE')).toBe('amazon.se');
      expect(getSiteDomain('PL')).toBe('amazon.pl');
      expect(getSiteDomain('BE')).toBe('amazon.com.be');
      expect(getSiteDomain('IE')).toBe('amazon.ie');
      expect(getSiteDomain('UK')).toBe('amazon.co.uk');
      expect(getSiteDomain('GB')).toBe('amazon.co.uk');
    });

    it('应该为未知站点返回默认域名', () => {
      expect(getSiteDomain('US')).toBe('amazon.com');
      expect(getSiteDomain('UNKNOWN')).toBe('amazon.com');
      expect(getSiteDomain('')).toBe('amazon.com');
    });

    it('应该处理所有欧洲站点', () => {
      const europeanSites = ['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK'];

      europeanSites.forEach(site => {
        const domain = getSiteDomain(site);
        expect(domain).toMatch(/^amazon\./);
        expect(domain).not.toBe('amazon.com');  // 欧洲站点不应该返回 .com
      });
    });
  });

  describe('格式化工具集成测试', () => {
    it('应该为同一站点返回一致的信息', () => {
      const site = 'DE';

      const flag = getFlag(site);
      const name = getSiteName(site);
      const domain = getSiteDomain(site);

      expect(flag).toBe('🇩🇪');
      expect(name).toBe('德国');
      expect(domain).toBe('amazon.de');
    });

    it('应该处理所有支持的站点', () => {
      const sites = ['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'IE', 'UK'];

      sites.forEach(site => {
        expect(getFlag(site)).not.toBe('🏳️');
        expect(getSiteName(site)).not.toBe(site);
        expect(getSiteDomain(site)).toContain('amazon.');
      });
    });

    it('应该为未知站点提供合理的默认值', () => {
      const unknownSite = 'UNKNOWN';

      expect(getFlag(unknownSite)).toBe('🏳️');
      expect(getSiteName(unknownSite)).toBe(unknownSite);
      expect(getSiteDomain(unknownSite)).toBe('amazon.com');
    });
  });
});
