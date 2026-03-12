/**
 * 并行分析服务使用示例
 */

import { runParallelAIAnalysis } from '../src/modules/app_center/views/master_analysis/ai_analysis/services/parallelAnalysisService';
import type { Product } from '../src/modules/app_center/views/master_analysis/ai_analysis/config/sampleData';

// 示例产品数据
const sampleProduct: Product = {
  asin: 'B0DNMZ2MLG',
  productTitle: 'YCZ CLUB GENT\'S AROMA Perfume Men',
  customer_reviews: [
    {
      body: 'Great smell and long lasting',
      headline: 'Excellent product',
      origin_country: 'US',
      review_date: '2026-01-15',
      star_rating: 5,
      _origin_site: 'US'
    }
  ],
  feature_bullets: [
    'Long lasting fragrance',
    'Perfect for daily use'
  ],
  scrape_status: 'success',
  metadata: {}
};

// 示例 1: 基本使用（默认配置）
async function example1() {
  console.log('示例 1: 基本使用');
  
  const targetIds = [
    'title-keywords',
    'selling-points',
    'fatal-flaws'
  ];

  const report = await runParallelAIAnalysis(
    targetIds,
    sampleProduct,
    (progress, step) => {
      console.log(`进度: ${progress}% - ${step}`);
    },
    'en'
  );

  console.log('分析完成:', Object.keys(report));
}

// 示例 2: 自定义并发数
async function example2() {
  console.log('示例 2: 高并发模式');
  
  const targetIds = [
    'title-keywords',
    'selling-points',
    'fatal-flaws',
    'wow-moments',
    'hesitation-points',
    'buyer-profile',
    'vocab-gap',
    'promise-reality'
  ];

  const report = await runParallelAIAnalysis(
    targetIds,
    sampleProduct,
    (progress, step) => {
      console.log(`进度: ${progress}% - ${step}`);
    },
    'en',
    {
      maxConcurrency: 8, // 8个并发
      enableCache: true,
      failureStrategy: 'continue'
    }
  );

  console.log('分析完成:', Object.keys(report));
}

// 示例 3: 禁用缓存
async function example3() {
  console.log('示例 3: 禁用缓存');
  
  const targetIds = ['title-keywords', 'selling-points'];

  const report = await runParallelAIAnalysis(
    targetIds,
    sampleProduct,
    (progress, step) => {
      console.log(`进度: ${progress}% - ${step}`);
    },
    'en',
    {
      maxConcurrency: 4,
      enableCache: false, // 禁用缓存
      failureStrategy: 'continue'
    }
  );

  console.log('分析完成:', Object.keys(report));
}

// 示例 4: 失败立即中止
async function example4() {
  console.log('示例 4: 失败立即中止');
  
  const targetIds = ['title-keywords', 'selling-points'];

  try {
    const report = await runParallelAIAnalysis(
      targetIds,
      sampleProduct,
      (progress, step) => {
        console.log(`进度: ${progress}% - ${step}`);
      },
      'en',
      {
        maxConcurrency: 4,
        enableCache: true,
        failureStrategy: 'abort' // 任何失败都中止
      }
    );

    console.log('分析完成:', Object.keys(report));
  } catch (error) {
    console.error('分析失败:', error);
  }
}

// 示例 5: 性能对比
async function example5() {
  console.log('示例 5: 性能对比');
  
  const targetIds = [
    'title-keywords',
    'selling-points',
    'fatal-flaws',
    'wow-moments'
  ];

  // 串行执行（并发=1）
  console.log('串行执行...');
  const start1 = Date.now();
  await runParallelAIAnalysis(
    targetIds,
    sampleProduct,
    () => {},
    'en',
    { maxConcurrency: 1 }
  );
  const time1 = Date.now() - start1;
  console.log(`串行耗时: ${time1}ms`);

  // 并行执行（并发=4）
  console.log('并行执行...');
  const start2 = Date.now();
  await runParallelAIAnalysis(
    targetIds,
    sampleProduct,
    () => {},
    'en',
    { maxConcurrency: 4 }
  );
  const time2 = Date.now() - start2;
  console.log(`并行耗时: ${time2}ms`);

  console.log(`加速比: ${(time1 / time2).toFixed(2)}x`);
}

// 示例 6: 缓存效果测试
async function example6() {
  console.log('示例 6: 缓存效果测试');
  
  const targetIds = ['title-keywords', 'selling-points'];

  // 首次分析（无缓存）
  console.log('首次分析...');
  const start1 = Date.now();
  await runParallelAIAnalysis(
    targetIds,
    sampleProduct,
    () => {},
    'en',
    { enableCache: true }
  );
  const time1 = Date.now() - start1;
  console.log(`首次耗时: ${time1}ms`);

  // 二次分析（有缓存）
  console.log('二次分析（使用缓存）...');
  const start2 = Date.now();
  await runParallelAIAnalysis(
    targetIds,
    sampleProduct,
    () => {},
    'en',
    { enableCache: true }
  );
  const time2 = Date.now() - start2;
  console.log(`二次耗时: ${time2}ms`);

  console.log(`缓存加速: ${(time1 / time2).toFixed(2)}x`);
}

// 运行所有示例
async function runAllExamples() {
  try {
    await example1();
    await example2();
    await example3();
    await example4();
    await example5();
    await example6();
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}

// 导出示例函数
export {
  example1,
  example2,
  example3,
  example4,
  example5,
  example6,
  runAllExamples
};
