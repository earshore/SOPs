/**
 * FullAnalysisReportAdapter 测试
 * 测试生产环境主要使用的适配器
 */

import { describe, it, expect } from 'vitest';
import { FullAnalysisReportAdapter } from './FullAnalysisReportAdapter';

describe('FullAnalysisReportAdapter', () => {
  const adapter = new FullAnalysisReportAdapter();

  describe('canHandle', () => {
    it('should handle report with buyer-profile', () => {
      const report = { 'buyer-profile': {} };
      expect(adapter.canHandle(report)).toBe(true);
    });

    it('should handle report with selling-points', () => {
      const report = { 'selling-points': {} };
      expect(adapter.canHandle(report)).toBe(true);
    });

    it('should handle report with both fields', () => {
      const report = { 'buyer-profile': {}, 'selling-points': {} };
      expect(adapter.canHandle(report)).toBe(true);
    });

    it('should reject report with only title-keywords', () => {
      const report = { 'title-keywords': {} };
      expect(adapter.canHandle(report)).toBe(false);
    });

    it('should reject invalid report', () => {
      expect(adapter.canHandle(null)).toBe(false);
      expect(adapter.canHandle({})).toBe(false);
      expect(adapter.canHandle({ random: 'data' })).toBe(false);
    });
  });

  describe('getName', () => {
    it('should return adapter name', () => {
      expect(adapter.getName()).toBe('FullAnalysisReportAdapter');
    });
  });
});
