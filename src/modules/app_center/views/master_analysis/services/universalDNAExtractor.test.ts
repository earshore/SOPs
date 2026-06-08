/**
 * Universal DNA Extractor 测试
 * 使用实际的 Downloads 报告文件测试
 */

import { describe, it, expect } from "vitest";
import { UniversalDNAExtractor } from "../services/UniversalDNAExtractor";
import type {
  CompetitorReport,
  ProductOverviewReport,
  SemanticAnalysisReport,
} from "../types/downloadsReportTypes";

const extractor = new UniversalDNAExtractor();

describe("Competitor Report", () => {
  it("should extract DNA from competitor report", () => {
    const report: Partial<CompetitorReport> = {
      keyword_clusters: {
        core: ["Handglocke", "Tischglocke", "Serviceglocke"],
        attribute: ["Messing", "laut", "klarer Klang", "11 x 5,5 cm"],
        long_tail: ["Handglocke für Kinder zum Essen rufen"],
      },
      high_frequency_phrases: [
        "schöner Klang",
        "sehr hübsch",
        "gut verarbeitet",
      ],
      feature_points: [
        "Kompakte, tragbare Größe (ca. 11 x 5,5 x 5,5 cm)",
        "Metallkonstruktion für Robustheit",
        "Klarer, lauter Klang",
      ],
      competitor_insights: {
        user_profile: ["Familien mit Kindern", "Pflegende Angehörige"],
        strengths: [
          "Klare Positionierung auf lautem Klang",
          "Robuste Metallmaterialien",
        ],
        weaknesses: ["Qualitätsinkonsistenz bei Griffbefestigung"],
        differentiation_angles: [
          "Verbesserte Befestigungsqualität",
          "Klangbeschreibung & -beweis",
        ],
      },
      meta: {
        targetMarket: "German",
        analyzedASINs: ["B09NPJ78XD"],
        generatedByModel: "gpt-5-mini-ca",
        generatedAt: "2025-12-26T19:01:13.764Z",
      },
    };

    const dna = extractor.extractDNA(report);

    expect(dna).not.toBeNull();
    expect(dna!.keywords.core).toContain("Handglocke");
    expect(dna!.keywords.longTail).toContain(
      "Handglocke für Kinder zum Essen rufen",
    );
    expect(dna!.highFrequencyPhrases).toContain("schöner Klang");
    expect(dna!.audience).toContain("Familien mit Kindern");
    expect(dna!.painPoints).toContain(
      "Qualitätsinkonsistenz bei Griffbefestigung",
    );
    expect(dna!.differentiationAngles).toContain(
      "Verbesserte Befestigungsqualität",
    );
    expect(dna!.metadata.reportType).toBe("competitor");
  });

  it("should extract DNA from competitor report with camelCase fields", () => {
    const report = {
      keywordClusters: {
        core: ["desk bell"],
        attribute: ["metal", "11 cm"],
        long_tail: ["desk bell for service counter"],
        banned: ["guaranteed"],
      },
      highFrequencyPhrases: ["clear sound"],
      featurePoints: ["Compact metal bell"],
      competitorInsights: {
        user_profile: ["service counter teams"],
        strengths: ["clear tone"],
        weaknesses: ["loose handle"],
        differentiation_angles: ["reinforced handle"],
      },
      complianceRisks: [
        { type: "claim", examples: ["guaranteed"], suggestion: "soften claim" },
      ],
      qaOpportunities: [],
      meta: {},
    };

    const dna = extractor.extractDNA(report);

    expect(dna).not.toBeNull();
    expect(dna!.keywords.core).toContain("desk bell");
    expect(dna!.audience).toContain("service counter teams");
    expect(dna!.restrictedWords).toContain("guaranteed");
    expect(dna!.metadata.reportType).toBe("competitor");
  });
});

describe("Product Overview Report - camelCase", () => {
  it("should extract DNA from product overview report", () => {
    const report: Partial<ProductOverviewReport> = {
      productOverview: {
        itemsAnalyzed: 2,
        asins: ["B09XBHXKKL"],
        market: "Amazon.de",
        category: "Children's outdoor toys",
        summary: "Foam glider sets for children",
      },
      coreFeatures: {
        materials: "EPP / Styrofoam-style foam",
        packContents: "4 gliders per pack (approx. 38 cm length)",
        assembly: "Tool-free push-fit assembly",
      },
      user_profile: {
        demographics: {
          age_ranges: ["Parents of young children (approx. 3–12 years)"],
          locations: ["Urban/suburban families"],
          household: ["Families with multiple children"],
        },
        goals: ["Provide low-cost outdoor entertainment"],
        pain_points: ["Products breaking after short period"],
        scenarios: ["Parent buying novelty gift"],
        objections: ["Worries about durability"],
        price_sensitivity: "Moderate to high",
        decision_drivers: ["Perceived play value", "Durability"],
      },
      strengths: ["Good flight performance", "Lightweight construction"],
      weaknesses: ["Repeated user reports of breakage"],
      differentiationAngles: [
        "Durability-first SKU",
        "Performance optimization",
      ],
      keywordClusters: {
        core: ["styropor flieger", "foam glider"],
        longTail: ["4 stück styropor flugzeuge kinder"],
        intent: ["purchase_gift: styropor flieger geschenk kinder"],
      },
      complianceRisks: [],
      meta: {
        generatedAt: "2025-12-23T00:00:00Z",
        engine: "openai_compat:gpt-5-mini-ca",
        asins: ["B09XBHXKKL"],
      },
    };

    const dna = extractor.extractDNA(report);

    expect(dna).not.toBeNull();
    expect(dna!.keywords.core).toContain("styropor flieger");
    expect(dna!.keywords.intent).toContain(
      "purchase_gift: styropor flieger geschenk kinder",
    );
    expect(dna!.audience).toContain("Parents of young children");
    expect(dna!.painPoints).toContain("Products breaking after short period");
    expect(dna!.metadata.reportType).toBe("product_overview");
  });
});

describe("Product Overview Report - snake_case", () => {
  it("should extract DNA from product overview report with snake_case fields", () => {
    const report = {
      product_overview: {
        itemsAnalyzed: 1,
        asins: ["B00TEST"],
        market: "Amazon.de",
        category: "Home",
        summary: "Compact organizer",
      },
      core_features: {
        material: "Bamboo wood",
        size: "30 cm width",
      },
      user_profile: {
        demographics: {
          ageRanges: ["Apartment renters"],
          locations: ["Urban homes"],
          household: ["Small households"],
        },
        painPoints: ["Limited storage"],
        scenarios: ["Kitchen organization"],
        priceSensitivity: "medium",
        decisionDrivers: ["Space saving"],
      },
      strengths: ["Natural material"],
      weaknesses: ["Limited capacity"],
      differentiation_angles: ["Small-space positioning"],
      keyword_clusters: {
        core: ["bamboo organizer"],
        longTail: ["small kitchen bamboo organizer"],
        intent: ["space saving organizer"],
      },
      compliance_risks: [
        { type: "claim", risk: "eco friendly", suggestion: "substantiate" },
      ],
      meta: {},
    };

    const dna = extractor.extractDNA(report);

    expect(dna).not.toBeNull();
    expect(dna!.keywords.core).toContain("bamboo organizer");
    expect(dna!.audience).toContain("Apartment renters");
    expect(dna!.painPoints).toContain("Limited storage");
    expect(dna!.metadata.reportType).toBe("product_overview");
  });
});

describe("Semantic Analysis Report", () => {
  it("should extract DNA from semantic analysis report", () => {
    const report: Partial<SemanticAnalysisReport> = {
      high_frequency_phrases: {
        attribute: ["natürlich", "Matatabi / Silvervine", "zahnpflegend"],
        use_cases: ["Spielzeug zum Kauen", "Zahnpflege", "Stressabbau"],
      },
      pain_point_gaps: {
        top_quality_issues: [
          "Zu hart für einige Katzen",
          "Kurzzeitige Wirkung",
        ],
        unmet_need: ["Konstante, sichere Kauerfahrung", "Längere Anziehung"],
        differentiation_angles: [
          "Killer Feature: Zwei-Härte-Sticks im Set",
          "Killer Feature: Frische-Versiegelung",
        ],
      },
      native_voice: {
        native_phrasing: ["Katzenspielzeug", "Kausnack", "Knabberstick"],
        emotional_hook: ["Langeweile adé: Mit unseren Matatabi-Kausticks"],
      },
      meta: {
        targetMarket: "German",
        analyzedASINs: ["B0CPJ4Z1DH"],
        generatedByModel: "gpt-5-mini-ca",
        generatedAt: "2025-12-31T04:05:18.081Z",
        templateUsed: "语义与竞品分析",
        templateId: "semantic",
        dataScope: ["Title", "Bullets", "Reviews"],
      },
    };

    const dna = extractor.extractDNA(report);

    expect(dna).not.toBeNull();
    expect(dna!.keywords.core).toContain("natürlich");
    expect(dna!.keywords.longTail).toContain("Katzenspielzeug");
    expect(dna!.keywords.intent).toContain("Spielzeug zum Kauen");
    expect(dna!.highFrequencyPhrases).toContain("zahnpflegend");
    expect(dna!.painPoints).toContain("Zu hart für einige Katzen");
    expect(dna!.differentiationAngles[0]).toContain("Killer Feature");
    expect(dna!.metadata.reportType).toBe("semantic_analysis");
  });
});

describe("Edge Cases", () => {
  it("should return null for invalid report", () => {
    const dna = extractor.extractDNA(null);
    expect(dna).toBeNull();
  });

  it("should return null for unsupported format", () => {
    const dna = extractor.extractDNA({ random: "data" });
    expect(dna).toBeNull();
  });

  it("should check if report can be extracted", () => {
    const validReport = {
      competitor_insights: {},
      feature_points: [],
      keyword_clusters: {},
    };
    expect(extractor.canExtractDNA(validReport)).toBe(true);
    expect(extractor.canExtractDNA({})).toBe(false);
  });
});
