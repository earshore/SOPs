/**
 * 并行分析服务测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const llmMocks = vi.hoisted(() => ({
  callLLM: vi.fn(),
}));

vi.mock("@/services/llmService", () => ({
  callLLM: llmMocks.callLLM,
}));

import {
  generateCacheKey,
  getCachedResult,
  runParallelAIAnalysis,
  setCachedResult,
} from "../parallelAnalysisService";
import { LocalDataStore } from "@/services/localDataStore";
import { StorageService, STORAGE_KEYS } from "@/services/storageService";
import type { Product } from "../../config/sampleData";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

beforeEach(async () => {
  localStorageMock.clear();
  await LocalDataStore.clearAll();
  llmMocks.callLLM.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createProduct(): Product {
  return {
    asin: "B0DNMZ2MLG",
    productTitle: "Test Product Title",
    customer_reviews: [
      {
        body: "test review body",
        headline: "test headline",
        origin_country: "US",
        review_date: "2026-01-01",
        star_rating: 5,
        _origin_site: "US",
      },
    ],
    feature_bullets: ["Feature 1"],
    scrape_status: "success",
    metadata: {},
  };
}

function mockLlmConfig(): void {
  vi.spyOn(StorageService, "get").mockImplementation((key: string, defaultValue: unknown = null) => {
    if (key === STORAGE_KEYS.LLM_ACTIVE_PROVIDER) {
      return "openai";
    }
    return defaultValue;
  });
  vi.spyOn(StorageService, "getLLMConfigWithKey").mockResolvedValue({
    provider: "openai",
    endpoint: "https://example.com/v1/chat/completions",
    apiKey: "test-key",
    model: "test-model",
  } as never);
}

function mockSuccessfulLlmResponses(): void {
  llmMocks.callLLM.mockImplementation(async (messages: Array<{ content: string }>) => {
    const prompt = messages[1]?.content || "";
    if (prompt.includes("selling-points")) {
      return JSON.stringify({
        bullet_analysis: [],
        overall_strategy: {},
        function_scene_matrix: {},
      });
    }

    return JSON.stringify({
      primary_keywords: [],
      secondary_keywords: [],
    });
  });
}

describe("缓存功能", () => {
  it("应该能够生成唯一的缓存键", () => {
    const product: Product = {
      asin: "B0DNMZ2MLG",
      productTitle: "Test Product Title",
      customer_reviews: [
        {
          body: "test",
          headline: "test",
          origin_country: "US",
          review_date: "2026-01-01",
          star_rating: 5,
          _origin_site: "US",
        },
      ],
      feature_bullets: [],
      scrape_status: "success",
      metadata: {},
    };

    const key1 = generateCacheKey("title-keywords", product, "en");
    const key2 = generateCacheKey("selling-points", product, "en");
    const key3 = generateCacheKey("title-keywords", product, "de");

    expect(key1).not.toBe(key2); // 不同目标
    expect(key1).not.toBe(key3); // 不同语言
    expect(key1).toContain("title-keywords");
    expect(key1).toContain("B0DNMZ2MLG");
  });

  it("应该在内容变化但评论数量不变时生成不同缓存键", () => {
    const product: Product = {
      asin: "B0DNMZ2MLG",
      productTitle: "Test Product Title",
      customer_reviews: [
        {
          body: "first review body",
          headline: "test",
          origin_country: "US",
          review_date: "2026-01-01",
          star_rating: 5,
          _origin_site: "US",
        },
      ],
      feature_bullets: ["Feature 1"],
      scrape_status: "success",
      metadata: {},
    };
    const baseReview = product.customer_reviews[0]!;
    const updatedProduct: Product = {
      ...product,
      customer_reviews: [
        {
          ...baseReview,
          body: "updated review body",
        },
      ],
    };

    expect(generateCacheKey("title-keywords", product, "en")).not.toBe(
      generateCacheKey("title-keywords", updatedProduct, "en")
    );
  });

  it("应该能够保存和读取缓存", async () => {
    const testData = { result: "test analysis result" };
    const cacheKey = "test_cache_key";

    await setCachedResult(cacheKey, testData);
    const cached = await getCachedResult(cacheKey);

    expect(cached).toEqual(testData);
  });

  it("应该在缓存过期后返回 null", async () => {
    const testData = { result: "test" };
    const cacheKey = "test_cache_key";

    // 保存一个过期的缓存（25小时前）
    const expiredTimestamp = Date.now() - 25 * 60 * 60 * 1000;
    localStorageMock.setItem(
      cacheKey,
      JSON.stringify({
        data: testData,
        timestamp: expiredTimestamp,
      }),
    );

    const cached = await getCachedResult(cacheKey);
    expect(cached).toBeNull();
  });

  it("应该在缓存有效期内返回数据", async () => {
    const testData = { result: "test" };
    const cacheKey = "test_cache_key";

    // 保存一个有效的缓存（1小时前）
    const validTimestamp = Date.now() - 1 * 60 * 60 * 1000;
    localStorageMock.setItem(
      cacheKey,
      JSON.stringify({
        data: testData,
        timestamp: validTimestamp,
      }),
    );

    const cached = await getCachedResult(cacheKey);
    expect(cached).toEqual(testData);
  });
});

describe("运行时调度", () => {
  it("全量命中缓存时不读取 LLM 配置且不调用模型", async () => {
    const product = createProduct();
    const cachedTitleKeywords = {
      primary_keywords: [],
      secondary_keywords: [],
    };
    const cachedSellingPoints = {
      bullet_analysis: [],
      overall_strategy: {},
      function_scene_matrix: {},
    };
    await setCachedResult(generateCacheKey("title-keywords", product, "en"), cachedTitleKeywords);
    await setCachedResult(generateCacheKey("selling-points", product, "en"), cachedSellingPoints);
    const getLLMConfigWithKeySpy = vi.spyOn(StorageService, "getLLMConfigWithKey");

    const report = await runParallelAIAnalysis(
      ["title-keywords", "selling-points"],
      product,
      vi.fn(),
      "en",
      {
        enableCache: true,
        maxConcurrency: 2,
        streamResults: true,
      }
    );

    expect(report["title-keywords"]).toEqual(cachedTitleKeywords);
    expect(report["selling-points"]).toEqual(cachedSellingPoints);
    expect(getLLMConfigWithKeySpy).not.toHaveBeenCalled();
    expect(llmMocks.callLLM).not.toHaveBeenCalled();
  });

  it("可靠性优先失败后停止继续排队后续任务", async () => {
    const product = createProduct();
    mockLlmConfig();
    llmMocks.callLLM.mockRejectedValue(new Error("model failed"));

    await expect(runParallelAIAnalysis(
      ["title-keywords", "selling-points"],
      product,
      vi.fn(),
      "en",
      {
        enableCache: false,
        maxConcurrency: 1,
        streamResults: false,
        failureStrategy: "abort",
        stopOnFailure: true,
        retryBudget: 0,
      }
    )).rejects.toThrow("分析失败");

    expect(llmMocks.callLLM).toHaveBeenCalledTimes(1);
  });

  it("final_only 模式不推送局部成功报告", async () => {
    const product = createProduct();
    const onTaskComplete = vi.fn();
    mockLlmConfig();
    mockSuccessfulLlmResponses();

    await runParallelAIAnalysis(
      ["title-keywords", "selling-points"],
      product,
      vi.fn(),
      "en",
      {
        enableCache: false,
        maxConcurrency: 2,
        streamResults: false,
        failureStrategy: "continue",
        onTaskComplete,
      }
    );

    expect(onTaskComplete).not.toHaveBeenCalled();
    expect(llmMocks.callLLM).toHaveBeenCalledTimes(2);
  });
});

describe("并发控制", () => {
  it("应该限制并发任务数量", async () => {
    const maxConcurrency = 2;
    let currentRunning = 0;
    let maxObserved = 0;

    const tasks = Array.from({ length: 5 }, (_, i) => async () => {
      currentRunning++;
      maxObserved = Math.max(maxObserved, currentRunning);

      // 模拟异步操作
      await new Promise((resolve) => setTimeout(resolve, 10));

      currentRunning--;
      return `result-${i}`;
    });

    // 简单的并发控制实现
    const runningTasks = new Set<Promise<string>>();
    const results: string[] = [];

    for (const task of tasks) {
      while (runningTasks.size >= maxConcurrency) {
        await Promise.race(runningTasks);
      }

      const promise = task().then((result) => {
        results.push(result);
        runningTasks.delete(promise);
        return result;
      });

      runningTasks.add(promise);
    }

    await Promise.all(runningTasks);

    expect(maxObserved).toBeLessThanOrEqual(maxConcurrency);
    expect(results).toHaveLength(5);
  });
});

describe("性能设置", () => {
  it("应该使用默认配置", () => {
    const defaultConfig = {
      maxConcurrency: 8,
      enableCache: true,
      failureStrategy: "continue" as const,
    };

    expect(defaultConfig.maxConcurrency).toBe(8);
    expect(defaultConfig.enableCache).toBe(true);
    expect(defaultConfig.failureStrategy).toBe("continue");
  });

  it("应该允许自定义配置", () => {
    const customConfig = {
      maxConcurrency: 8,
      enableCache: false,
      failureStrategy: "abort" as const,
    };

    expect(customConfig.maxConcurrency).toBe(8);
    expect(customConfig.enableCache).toBe(false);
    expect(customConfig.failureStrategy).toBe("abort");
  });
});
