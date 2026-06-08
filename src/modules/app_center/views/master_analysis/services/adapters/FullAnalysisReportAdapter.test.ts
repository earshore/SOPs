/**
 * FullAnalysisReportAdapter 测试
 * 测试生产环境主要使用的适配器
 */

import { describe, it, expect } from "vitest";
import { FullAnalysisReportAdapter } from "./FullAnalysisReportAdapter";

const adapter = new FullAnalysisReportAdapter();

describe("canHandle", () => {
  it("should handle report with buyer-profile", () => {
    const report = { "buyer-profile": {} };
    expect(adapter.canHandle(report)).toBe(true);
  });

  it("should handle report with selling-points", () => {
    const report = { "selling-points": {} };
    expect(adapter.canHandle(report)).toBe(true);
  });

  it("should handle report with both fields", () => {
    const report = { "buyer-profile": {}, "selling-points": {} };
    expect(adapter.canHandle(report)).toBe(true);
  });

  it("should reject report with only title-keywords", () => {
    const report = { "title-keywords": {} };
    expect(adapter.canHandle(report)).toBe(false);
  });

  it("should reject invalid report", () => {
    expect(adapter.canHandle(null)).toBe(false);
    expect(adapter.canHandle({})).toBe(false);
    expect(adapter.canHandle({ random: "data" })).toBe(false);
  });
});

describe("getName", () => {
  it("should return adapter name", () => {
    expect(adapter.getName()).toBe("FullAnalysisReportAdapter");
  });
});

describe("extractDNA", () => {
  it("should extract DNA from legacy underscore fields", () => {
    const report = {
      buyer_profile: {
        demographics: {
          likely_gender: "male",
          age_range_estimate: "25-34",
          lifestyle_indicators: ["commuter"],
        },
        buyer_types: [
          {
            type: "gift buyer",
            percentage_estimate: "40%",
            evidence: "reviews",
          },
        ],
        usage_scenes: [],
        purchase_motivations: ["travel friendly"],
        geographic_insights: {
          primary_markets: [],
          cultural_considerations: [],
        },
      },
      selling_points: {
        bullet_analysis: [
          {
            bullet_index: 1,
            original_text_summary:
              "50ml travel bottle, lasts 6小时, package size 10x5x3cm",
            functions: ["portable bottle"],
            scenes: [],
            pain_points_addressed: [],
            differentiation_angle: "travel ready",
            credibility_score: "high",
          },
        ],
        overall_strategy: {
          primary_differentiation: "travel ready",
          target_positioning: "young commuters",
          emotional_hooks: ["confidence"],
          missing_elements: [],
        },
        function_scene_matrix: {
          functions: ["portable bottle"],
          scenes: [],
          pain_points: ["bulky packaging"],
        },
      },
      title_seo_roots: {
        primary_keywords: [
          {
            keyword: "travel perfume",
            weight: "high",
            search_volume_estimate: "high",
          },
        ],
        secondary_keywords: [
          { keyword: "50ml", type: "size", importance: "spec" },
          { keyword: "100g", type: "weight", importance: "spec" },
          { keyword: "fresh scent", type: "feature", importance: "marketing" },
        ],
        scene_keywords: [
          { keyword: "daily commute", usage_context: "workday" },
        ],
        audience_keywords: [],
        removed_modifiers: ["best"],
        removed_brand_terms: ["BrandX"],
        optimization_suggestions: [],
      },
    };

    const dna = adapter.extractDNA(report, "zh");

    expect(dna).not.toBeNull();
    expect(dna?.audience).toContain("25-34男性");
    expect(dna?.usps).toContain("- portable bottle");
    expect(dna?.specs).toContain("容量: 50ml");
    expect(dna?.specs).toContain("重量: 100g");
    expect(dna?.restrictedWords).toEqual(["best", "BrandX"]);
  });
});
