/**
 * titleComplianceService 契约测试 + 单元测试
 *
 * 覆盖亚马逊《商品名称要求和指南》（2026 新规）落地方案 P2：
 *  - 主入口 checkTitleCompliance 的纯函数行为与报告结构
 *  - 版本分流（v1 经典版 / v2 2026 新规版）与非法版本 fallback
 *  - 脏输入防御（null / undefined / 超长）降级报告，零抛错
 *  - 硬规则：max-length / word-repeat / banned-chars / promo-phrases
 *  - 软规则：info-order / capitalization / trailing-punct / bullet-hint / variant-consistency
 *  - 类目差异化（媒体类 50 字符上限、豁免站点跳过新规）
 *  - 得分单调性、summary 统计、单项快检
 *
 * 纯函数直接 import 真模块，零 mock。
 */

import { describe, it, expect } from "vitest";

import {
  checkTitleCompliance,
  normalizeComplianceVersion,
  isTitleLengthValid,
  extractRepeatWordViolations,
  PROMO_PHRASES,
  type TitleComplianceReport,
} from "@/services/titleComplianceService";

// ============================================================
// 测试 fixture
// ============================================================

/** 合法合规标题（v2：75 字符以内、无重复、无特殊字符、无促销语） */
const GOOD_TITLE_V2 = "Anker 321 Power Bank 10000mAh Portable Charger USB-C";

/** 合规经典标题（v1：180 以内） */
const GOOD_TITLE_V1 =
  "Anker PowerCore 10000 Portable Charger, One of The Smallest and Lightest 10000mAh External Batteries, Ultra-Compact Battery Pack";

/** 超长标题（用于触发 max-length / bullet-hint） */
const LONG_TITLE =
  "Anker PowerCore 10000 Portable Charger Ultra-Compact High-Speed-Charging Power Bank External Battery Pack with Fast Charging Technology for iPhone Samsung iPad and More Devices".slice(
    0,
    120,
  );

/** 重复词超标标题（品牌名同样计入） */
const REPEAT_TITLE = "Anker Anker Anker USB Cable USB Cable USB";

/** 含禁用特殊字符 */
const BANNED_CHAR_TITLE = "Anker Power Bank! USB-C _ Fast Charge?";

/** 含促销用语 */
const PROMO_TITLE = "Best Seller Anker Power Bank Free Shipping Hot Item";

/** 信息顺序疑似错乱（尺寸词开头） */
const BAD_ORDER_TITLE =
  "10000mAh 2 Pack Portable Charger Anker USB-C Power Bank";

/** 全大写单词超标 */
const ALL_CAPS_TITLE = "ANKER POWERBANK PORTABLE CHARGER USB-C FAST";

describe("normalizeComplianceVersion", () => {
  it("should keep v2 as v2", () => {
    expect(normalizeComplianceVersion("v2")).toBe("v2");
  });

  it("should keep v1 as v1", () => {
    expect(normalizeComplianceVersion("v1")).toBe("v1");
  });

  it("should fallback unknown / nullish / non-string values to v1", () => {
    expect(normalizeComplianceVersion("v3")).toBe("v1");
    expect(normalizeComplianceVersion(null)).toBe("v1");
    expect(normalizeComplianceVersion(undefined)).toBe("v1");
    expect(normalizeComplianceVersion("")).toBe("v1");
    expect(normalizeComplianceVersion(42 as unknown)).toBe("v1");
  });
});

describe("checkTitleCompliance - 输入防御", () => {
  it("should return degradation report for null/undefined/non-string without throwing", () => {
    for (const bad of [null, undefined, 123, {}]) {
      const report = checkTitleCompliance({ title: bad as unknown as string });
      expect(report.passed).toBe(false);
      expect(report.issues.length).toBe(1);
      expect(report.issues[0].rule).toBe("invalid-input");
      expect(report.score).toBe(0);
      expect(report.appliedVersion).toBe("v1");
    }
  });

  it("should not throw for oversized input and return input-error report", () => {
    const huge = "x".repeat(20000);
    const report = checkTitleCompliance({ title: huge });
    expect(report.passed).toBe(false);
    expect(report.issues[0].rule).toBe("invalid-input");
    expect(report.issues[0].message).toContain("20000");
    expect(report.issues.length).toBe(1);
  });

  it("should run rules normally for empty string", () => {
    const report = checkTitleCompliance({ title: "" });
    expect(report.passed).toBe(true);
    expect(report.score).toBe(100);
  });
});

describe("checkTitleCompliance - 版本分流", () => {
  it("should default to v1 ruleset when version omitted (保守策略，与 promptlab 版本偏好默认值一致)", () => {
    const report = checkTitleCompliance({ title: LONG_TITLE });
    expect(report.appliedVersion).toBe("v1");
    // v1 上限 180，120 字符的 LONG_TITLE 不会触发 v1 的 max-length
    expect(report.issues.some((i) => i.rule === "max-length")).toBe(false);
  });

  it("should use v1 ruleset (180 chars) when version is v1", () => {
    const report = checkTitleCompliance({
      title: GOOD_TITLE_V1,
      version: "v1",
    });
    expect(report.appliedVersion).toBe("v1");
    expect(report.passed).toBe(true);
  });

  it("should fallback unknown version to v1 and echo appliedVersion", () => {
    const report = checkTitleCompliance({
      title: GOOD_TITLE_V1,
      version: "v3",
    });
    expect(report.appliedVersion).toBe("v1");
    expect(report.passed).toBe(true);
  });
});

describe("checkTitleCompliance - max-length 规则", () => {
  it("should pass titles within v2 limit (75 chars including spaces)", () => {
    const report = checkTitleCompliance({ title: GOOD_TITLE_V2 });
    expect(report.passed).toBe(true);
    expect([...GOOD_TITLE_V2].length).toBeLessThanOrEqual(75);
  });

  it("should fail titles exceeding v2 limit and suggest trimming", () => {
    const report = checkTitleCompliance({ title: LONG_TITLE, version: "v2" });
    const issue = report.issues.find((i) => i.rule === "max-length");
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe("error");
    expect(issue!.message).toContain("超出上限 75");
    expect(issue!.suggestion).toContain("75 字符以内");
  });

  it("should pass titles up to 180 chars under v1 ruleset", () => {
    const justOver75 = LONG_TITLE.slice(0, 80);
    const report = checkTitleCompliance({ title: justOver75, version: "v1" });
    expect(report.passed).toBe(true);
  });
});

describe("checkTitleCompliance - word-repeat 规则", () => {
  it("should fail when any word (brand included) appears more than twice", () => {
    const report = checkTitleCompliance({ title: REPEAT_TITLE, version: "v2" });
    const issue = report.issues.find((i) => i.rule === "word-repeat");
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe("error");
    expect(issue!.message).toContain("Anker");
    expect(issue!.message).toContain("USB");
  });

  it("should pass when words appear at most twice", () => {
    const report = checkTitleCompliance({
      title: "Anker Anker USB Cable USB Cable",
    });
    expect(report.issues.some((i) => i.rule === "word-repeat")).toBe(false);
  });

  it("should exempt prepositions/articles/conjunctions from counting", () => {
    // "in" / "for" / "the" 出现多次不应触发
    const title = "Anker in-box charger for the kitchen for the living room";
    const report = checkTitleCompliance({ title });
    expect(report.issues.some((i) => i.rule === "word-repeat")).toBe(false);
  });

  it("should be case-insensitive for repetition counting", () => {
    // USB 出现 3 次（Anker anker ANKER = 3 次 Anker），两个词均超标
    const title = "Anker anker ANKER USB Cable USB USB";
    const violations = extractRepeatWordViolations(title);
    expect(violations).toContain("Anker");
    expect(violations).toContain("USB");
  });

  it("should pass when no word exceeds the repeat limit", () => {
    const report = checkTitleCompliance({ title: GOOD_TITLE_V2 });
    expect(report.issues.some((i) => i.rule === "word-repeat")).toBe(false);
  });
});

describe("checkTitleCompliance - banned-chars 规则", () => {
  it("should fail for unconditionally banned characters", () => {
    const report = checkTitleCompliance({
      title: BANNED_CHAR_TITLE,
      version: "v2",
    });
    const issue = report.issues.find((i) => i.rule === "banned-chars");
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe("error");
    expect(issue!.detail).toContain("!");
    expect(issue!.detail).toContain("_");
    expect(issue!.detail).toContain("?");
  });

  it("should exempt ~ # < > * when adjacent to digits/units (measurement context)", () => {
    const report = checkTitleCompliance({
      title: "Anker 5~12V Power Bank #A123 2*4 Pack",
    });
    expect(report.issues.some((i) => i.rule === "banned-chars")).toBe(false);
  });

  it("should fail ~ # < > * outside measurement context", () => {
    const report = checkTitleCompliance({
      title: "Anker ~Amazing# Power Bank",
      version: "v2",
    });
    const issue = report.issues.find((i) => i.rule === "banned-chars");
    expect(issue).toBeTruthy();
  });

  it("should pass clean titles with hyphens and commas (allowed separators)", () => {
    const report = checkTitleCompliance({
      title: "Anker 321 Power Bank, 10000mAh USB-C",
    });
    expect(report.issues.some((i) => i.rule === "banned-chars")).toBe(false);
  });
});

describe("checkTitleCompliance - promo-phrases 规则", () => {
  it("should fail for promotional phrases in both rule sets", () => {
    for (const version of ["v1", "v2"] as const) {
      const report = checkTitleCompliance({ title: PROMO_TITLE, version });
      const issue = report.issues.find((i) => i.rule === "promo-phrases");
      expect(issue).toBeTruthy();
      expect(issue!.severity).toBe("error");
      expect(issue!.message).toContain("best seller");
      expect(issue!.message).toContain("free shipping");
      expect(issue!.message).toContain("hot item");
    }
  });

  it("should match promotional phrases case-insensitively", () => {
    const report = checkTitleCompliance({
      title: "best seller anker power bank free shipping",
    });
    expect(report.issues.some((i) => i.rule === "promo-phrases")).toBe(true);
    const issue = report.issues.find((i) => i.rule === "promo-phrases");
    expect(issue!.detail).toContain("best seller");
    expect(issue!.detail).toContain("free shipping");
  });

  it("should not false-positive on embedded substrings", () => {
    // "bestsellermodel" 连写不应误伤 "best seller"
    const report = checkTitleCompliance({
      title: "Anker bestsellermodel power bank",
    });
    expect(report.issues.some((i) => i.rule === "promo-phrases")).toBe(false);
  });

  it("should expose a configurable phrase library", () => {
    expect(PROMO_PHRASES.length).toBeGreaterThan(20);
    expect(PROMO_PHRASES).toContain("free shipping");
    expect(PROMO_PHRASES).toContain("guaranteed");
  });
});

describe("checkTitleCompliance - 软规则（warning / info）", () => {
  it("should warn when title starts with size/model/color tokens", () => {
    const report = checkTitleCompliance({
      title: BAD_ORDER_TITLE,
      version: "v2",
    });
    const orderIssue = report.issues.find((i) => i.rule === "info-order");
    expect(orderIssue).toBeTruthy();
    expect(orderIssue!.severity).toBe("warning");
    expect(orderIssue!.suggestion).toContain("品牌");
  });

  it("should not warn for normal information order", () => {
    const report = checkTitleCompliance({ title: GOOD_TITLE_V2 });
    expect(report.issues.some((i) => i.rule === "info-order")).toBe(false);
  });

  it("should warn for multiple all-caps words but exempt the first (brand) token", () => {
    const report = checkTitleCompliance({
      title: ALL_CAPS_TITLE,
      version: "v2",
    });
    const issue = report.issues.find((i) => i.rule === "capitalization");
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe("warning");
    expect(issue!.message).toContain("POWERBANK");
    expect(issue!.message).toContain("PORTABLE");
  });

  it("should not warn when only the brand token is all-caps", () => {
    const report = checkTitleCompliance({
      title: "ANKER power bank portable charger usb-c",
    });
    expect(report.issues.some((i) => i.rule === "capitalization")).toBe(false);
  });

  it("should flag trailing punctuation at info level", () => {
    const report = checkTitleCompliance({ title: "Anker Power Bank." });
    const issue = report.issues.find((i) => i.rule === "trailing-punct");
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe("info");
  });

  it("should suggest highlights field when v2 title exceeds length limit", () => {
    const report = checkTitleCompliance({ title: LONG_TITLE, version: "v2" });
    const hint = report.issues.find((i) => i.rule === "bullet-hint");
    expect(hint).toBeTruthy();
    expect(hint!.severity).toBe("info");
    expect(hint!.suggestion).toContain("125");
  });

  it("should not suggest highlights field for compliant titles", () => {
    const report = checkTitleCompliance({ title: GOOD_TITLE_V2 });
    expect(report.issues.some((i) => i.rule === "bullet-hint")).toBe(false);
  });
});

describe("checkTitleCompliance - variant-consistency", () => {
  it("should warn when sibling titles differ structurally too much", () => {
    const variants = [
      "Anker Power Bank 10000mAh USB-C Black",
      "DifferentBrand Wireless Earbuds Bluetooth",
    ];
    const report = checkTitleCompliance({
      title: GOOD_TITLE_V2,
      variants,
      version: "v2",
    });
    const issue = report.issues.find((i) => i.rule === "variant-consistency");
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe("info");
  });

  it("should pass when variant titles are structurally similar", () => {
    // 变体标题与主标题仅变体属性（Black/White）不同
    const variants = [
      "Anker 321 Power Bank 10000mAh Portable Charger USB-C Black",
      "Anker 321 Power Bank 10000mAh Portable Charger USB-C White",
    ];
    const report = checkTitleCompliance({
      title: GOOD_TITLE_V2,
      variants,
      version: "v2",
    });
    expect(report.issues.some((i) => i.rule === "variant-consistency")).toBe(
      false,
    );
  });

  it("should skip the check without variants input", () => {
    const report = checkTitleCompliance({ title: GOOD_TITLE_V2 });
    expect(report.issues.some((i) => i.rule === "variant-consistency")).toBe(
      false,
    );
  });
});

describe("checkTitleCompliance - 类目差异化与豁免站点", () => {
  it("should apply 50-char limit for media categories", () => {
    const title60 = "A".repeat(60);
    const report = checkTitleCompliance({ title: title60, category: "Books" });
    expect(report.issues.some((i) => i.rule === "max-length")).toBe(true);
    expect(
      report.issues.find((i) => i.rule === "max-length")!.message,
    ).toContain("上限 50");
  });

  it("should skip v2-only rules for exempt marketplaces (SA/EG/TR/AE)", () => {
    const report = checkTitleCompliance({
      title: LONG_TITLE,
      marketplaceId: "SA",
      version: "v2",
    });
    expect(
      report.issues.every(
        (i) =>
          i.rule === "max-length" ||
          i.rule === "promo-phrases" ||
          i.rule === "trailing-punct",
      ),
    ).toBe(true);
    expect(report.issues.some((i) => i.rule === "word-repeat")).toBe(false);
    expect(report.issues.some((i) => i.rule === "banned-chars")).toBe(false);
  });

  it("should apply full v2 rules for non-exempt marketplaces", () => {
    const report = checkTitleCompliance({
      title: LONG_TITLE,
      marketplaceId: "US",
      version: "v2",
    });
    expect(
      report.issues.some(
        (i) =>
          i.rule === "word-repeat" ||
          i.rule === "banned-chars" ||
          i.rule === "max-length",
      ),
    ).toBe(true);
  });
});

describe("checkTitleCompliance - 报告结构、得分与统计", () => {
  it("should set passed=false only when error-severity issues exist", () => {
    // 仅 info 级（末尾标点）不应判失败
    const infoOnly = checkTitleCompliance({ title: "Anker Power Bank." });
    expect(infoOnly.passed).toBe(true);
    // error 级应判失败
    const withError = checkTitleCompliance({
      title: LONG_TITLE,
      version: "v2",
    });
    expect(withError.passed).toBe(false);
  });

  it("should score monotonically lower as issues grow", () => {
    const scores: number[] = [
      checkTitleCompliance({ title: GOOD_TITLE_V2, version: "v2" }).score,
      checkTitleCompliance({ title: "Anker Power Bank.", version: "v2" }).score,
      checkTitleCompliance({ title: BANNED_CHAR_TITLE, version: "v2" }).score,
      checkTitleCompliance({ title: LONG_TITLE, version: "v2" }).score,
      checkTitleCompliance({
        title: REPEAT_TITLE + " " + BANNED_CHAR_TITLE + " Free Shipping",
        version: "v2",
      }).score,
    ];
    for (let i = 1; i < scores.length; i += 1) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it("should populate summary with per-rule hit counts", () => {
    const report = checkTitleCompliance({
      title: BANNED_CHAR_TITLE,
      version: "v2",
    });
    expect(report.summary["banned-chars"]).toBe(1);
    expect(report.summary["promo-phrases"]).toBeUndefined();
  });

  it("should keep score between 0 and 100", () => {
    const report = checkTitleCompliance({
      title: BANNED_CHAR_TITLE + " " + PROMO_TITLE,
      version: "v2",
    });
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });
});

describe("单项快检函数", () => {
  it("isTitleLengthValid should respect version limits", () => {
    expect(isTitleLengthValid(GOOD_TITLE_V2, "v2")).toBe(true);
    expect(isTitleLengthValid(LONG_TITLE, "v2")).toBe(false);
    expect(isTitleLengthValid(LONG_TITLE.slice(0, 80), "v1")).toBe(true);
    expect(isTitleLengthValid("x".repeat(200), "v1")).toBe(false);
  });

  it("isTitleLengthValid should fallback unknown version to v1 (conservative default)", () => {
    const len76 = "x".repeat(76);
    const len181 = "x".repeat(181);
    // 未传版本时 fallback v1（180 上限，与版本偏好默认值语义一致）
    expect(isTitleLengthValid(len76)).toBe(true);
    expect(isTitleLengthValid(len76, "v3")).toBe(true);
    expect(isTitleLengthValid(len181)).toBe(false);
    expect(isTitleLengthValid(len181, "v3")).toBe(false);
  });

  it("extractRepeatWordViolations should list words exceeding twice", () => {
    const violations = extractRepeatWordViolations(REPEAT_TITLE);
    expect(violations).toContain("Anker");
    expect(violations).toContain("USB");
    expect(violations.length).toBe(2);
  });

  it("extractRepeatWordViolations should return empty for clean titles", () => {
    expect(extractRepeatWordViolations(GOOD_TITLE_V2)).toEqual([]);
  });
});

describe("checkTitleCompliance - 回归防护：合规标题零问题", () => {
  it("should return fully clean report for a well-formed v2 title", () => {
    const report: TitleComplianceReport = checkTitleCompliance({
      title: GOOD_TITLE_V2,
    });
    expect(report.passed).toBe(true);
    expect(report.score).toBe(100);
    expect(report.issues.length).toBe(0);
    expect(Object.keys(report.summary).length).toBe(0);
  });
});
