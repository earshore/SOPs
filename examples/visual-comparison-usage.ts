// examples/visual-comparison-usage.ts
// ================================================================
// 📸 图像对比工具使用示例
// ================================================================

import { createImageComparator, compareImages } from '../tests/visual/image-comparator';
import {
  ThresholdLevel,
  PageType,
  getThresholdConfig,
  getThresholdForPageType,
  getThresholdForComponent,
  getThresholdForInteractionState,
  adjustThresholdForViewport,
  ThresholdConfigBuilder,
  ThresholdValidator
} from '../tests/visual/threshold-config';

/**
 * 示例 1: 基本使用 - 快速对比两张图像
 */
async function example1_BasicComparison() {
  console.log('=== 示例 1: 基本图像对比 ===\n');

  const result = await compareImages(
    'screenshots/baseline/home.png',
    'screenshots/current/home.png'
  );

  console.log(`匹配结果: ${result.match ? '✓ 通过' : '✗ 失败'}`);
  console.log(`差异像素: ${result.diffPixels}`);
  console.log(`差异百分比: ${result.diffPercentage}%`);
  console.log(`图像尺寸: ${result.dimensions.width}x${result.dimensions.height}`);
  
  if (result.diffImagePath) {
    console.log(`差异图已保存: ${result.diffImagePath}`);
  }
}

/**
 * 示例 2: 使用预定义阈值级别
 */
async function example2_PredefinedThresholds() {
  console.log('\n=== 示例 2: 使用预定义阈值级别 ===\n');

  const comparator = createImageComparator();
  
  // 使用严格阈值
  const strictConfig = getThresholdConfig(ThresholdLevel.STRICT);
  const result = await comparator.compare(
    'screenshots/baseline/login.png',
    'screenshots/current/login.png',
    strictConfig
  );

  console.log(`严格模式 (1% 容忍度): ${result.match ? '✓ 通过' : '✗ 失败'}`);
  console.log(`差异: ${result.diffPercentage}%`);
}

/**
 * 示例 3: 根据页面类型自动选择阈值
 */
async function example3_PageTypeThresholds() {
  console.log('\n=== 示例 3: 根据页面类型选择阈值 ===\n');

  const comparator = createImageComparator();
  
  // 静态页面 - 使用极严格阈值
  const staticPageConfig = getThresholdForPageType(PageType.STATIC);
  console.log(`静态页面阈值: ${staticPageConfig.threshold! * 100}%`);
  
  // 表单页面 - 使用严格阈值
  const formPageConfig = getThresholdForPageType(PageType.FORM);
  console.log(`表单页面阈值: ${formPageConfig.threshold! * 100}%`);
  
  // 仪表板 - 使用宽松阈值
  const dashboardConfig = getThresholdForPageType(PageType.DASHBOARD);
  console.log(`仪表板阈值: ${dashboardConfig.threshold! * 100}%`);
  
  const result = await comparator.compare(
    'screenshots/baseline/dashboard.png',
    'screenshots/current/dashboard.png',
    dashboardConfig
  );
  
  console.log(`仪表板对比结果: ${result.match ? '✓ 通过' : '✗ 失败'}`);
}

/**
 * 示例 4: 组件级对比
 */
async function example4_ComponentComparison() {
  console.log('\n=== 示例 4: 组件级对比 ===\n');

  const comparator = createImageComparator();
  
  // 按钮组件 - 极严格
  const buttonConfig = getThresholdForComponent('button');
  console.log(`按钮阈值: ${buttonConfig.threshold! * 100}%, 最大差异: ${buttonConfig.maxDiffPixels} 像素`);
  
  // 表格组件 - 宽松
  const tableConfig = getThresholdForComponent('table');
  console.log(`表格阈值: ${tableConfig.threshold! * 100}%, 最大差异: ${tableConfig.maxDiffPixels} 像素`);
  
  const result = await comparator.compare(
    'screenshots/baseline/button.png',
    'screenshots/current/button.png',
    buttonConfig
  );
  
  console.log(`按钮对比: ${result.match ? '✓ 通过' : '✗ 失败'}`);
}

/**
 * 示例 5: 交互状态对比
 */
async function example5_InteractionStates() {
  console.log('\n=== 示例 5: 交互状态对比 ===\n');

  const comparator = createImageComparator();
  
  // 悬停状态
  const hoverConfig = getThresholdForInteractionState('hover');
  const hoverResult = await comparator.compare(
    'screenshots/baseline/button-hover.png',
    'screenshots/current/button-hover.png',
    hoverConfig
  );
  
  console.log(`悬停状态: ${hoverResult.match ? '✓ 通过' : '✗ 失败'} (${hoverResult.diffPercentage}%)`);
  
  // 错误状态
  const errorConfig = getThresholdForInteractionState('error');
  const errorResult = await comparator.compare(
    'screenshots/baseline/form-error.png',
    'screenshots/current/form-error.png',
    errorConfig
  );
  
  console.log(`错误状态: ${errorResult.match ? '✓ 通过' : '✗ 失败'} (${errorResult.diffPercentage}%)`);
}

/**
 * 示例 6: 视口调整
 */
async function example6_ViewportAdjustment() {
  console.log('\n=== 示例 6: 视口调整 ===\n');

  const comparator = createImageComparator();
  const baseConfig = getThresholdForPageType(PageType.FORM);
  
  // 桌面端
  const desktopConfig = adjustThresholdForViewport(baseConfig, 'desktop');
  console.log(`桌面端阈值: ${desktopConfig.threshold! * 100}%`);
  
  // 平板端 (增加 20%)
  const tabletConfig = adjustThresholdForViewport(baseConfig, 'tablet');
  console.log(`平板端阈值: ${tabletConfig.threshold! * 100}%`);
  
  // 移动端 (增加 50%)
  const mobileConfig = adjustThresholdForViewport(baseConfig, 'mobile');
  console.log(`移动端阈值: ${mobileConfig.threshold! * 100}%`);
  
  const result = await comparator.compare(
    'screenshots/baseline/form-mobile.png',
    'screenshots/current/form-mobile.png',
    mobileConfig
  );
  
  console.log(`移动端对比: ${result.match ? '✓ 通过' : '✗ 失败'}`);
}

/**
 * 示例 7: 使用配置构建器
 */
async function example7_ConfigBuilder() {
  console.log('\n=== 示例 7: 使用配置构建器 ===\n');

  const comparator = createImageComparator();
  
  // 构建自定义配置
  const customConfig = new ThresholdConfigBuilder(ThresholdLevel.STANDARD)
    .withThreshold(0.03)              // 3% 容忍度
    .withMaxDiffPixels(300)           // 最多 300 像素
    .withDiffColor(255, 0, 255)       // 紫色高亮
    .withAntiAliasing(true, 0.15)     // 启用抗锯齿检测
    .forViewport('tablet')            // 平板端调整
    .build();
  
  console.log(`自定义配置:`);
  console.log(`  阈值: ${customConfig.threshold! * 100}%`);
  console.log(`  最大差异像素: ${customConfig.maxDiffPixels}`);
  console.log(`  差异颜色: RGB(${customConfig.diffColor?.join(', ')})`);
  
  const result = await comparator.compare(
    'screenshots/baseline/custom.png',
    'screenshots/current/custom.png',
    customConfig
  );
  
  console.log(`对比结果: ${result.match ? '✓ 通过' : '✗ 失败'}`);
}

/**
 * 示例 8: 配置验证
 */
async function example8_ConfigValidation() {
  console.log('\n=== 示例 8: 配置验证 ===\n');

  // 验证有效配置
  const validConfig = getThresholdConfig(ThresholdLevel.STANDARD);
  const validResult = ThresholdValidator.validate(validConfig);
  console.log(`有效配置: ${validResult.valid ? '✓' : '✗'}`);
  
  // 验证无效配置
  const invalidConfig = {
    threshold: 1.5,  // 超出范围
    maxDiffPixels: -100  // 负数
  };
  const invalidResult = ThresholdValidator.validate(invalidConfig);
  console.log(`\n无效配置: ${invalidResult.valid ? '✓' : '✗'}`);
  if (invalidResult.errors.length > 0) {
    console.log('错误:');
    invalidResult.errors.forEach(err => console.log(`  - ${err}`));
  }
  
  // 验证有警告的配置
  const warningConfig = {
    threshold: 0.0001,  // 过于严格
    maxDiffPixels: 5000  // 过大
  };
  const warningResult = ThresholdValidator.validate(warningConfig);
  console.log(`\n有警告的配置: ${warningResult.valid ? '✓' : '✗'}`);
  if (warningResult.warnings.length > 0) {
    console.log('警告:');
    warningResult.warnings.forEach(warn => console.log(`  - ${warn}`));
  }
}

/**
 * 示例 9: 批量对比不同页面类型
 */
async function example9_BatchComparisonByType() {
  console.log('\n=== 示例 9: 批量对比不同页面类型 ===\n');

  const comparator = createImageComparator();
  
  const pages = [
    { name: 'home', type: PageType.STATIC },
    { name: 'login', type: PageType.FORM },
    { name: 'dashboard', type: PageType.DASHBOARD },
    { name: 'products', type: PageType.LIST }
  ];

  for (const page of pages) {
    const config = getThresholdForPageType(page.type);
    const result = await comparator.compare(
      `screenshots/baseline/${page.name}.png`,
      `screenshots/current/${page.name}.png`,
      config
    );
    
    const status = result.match ? '✓' : '✗';
    console.log(`${status} ${page.name} (${page.type}): ${result.diffPercentage}% 差异`);
  }
}

/**
 * 示例 10: CI/CD 集成场景
 */
async function example10_CICDIntegration() {
  console.log('\n=== 示例 10: CI/CD 集成 ===\n');

  const comparator = createImageComparator();
  const pages = [
    { name: 'home', type: PageType.STATIC },
    { name: 'promptlab', type: PageType.FORM },
    { name: 'ai-analysis', type: PageType.DATA_DISPLAY }
  ];
  
  let allPassed = true;
  const failedPages: string[] = [];

  for (const page of pages) {
    const config = adjustThresholdForViewport(
      getThresholdForPageType(page.type),
      'desktop'
    );
    
    const result = await comparator.compare(
      `screenshots/baseline/${page.name}.png`,
      `screenshots/current/${page.name}.png`,
      config
    );

    if (!result.match) {
      allPassed = false;
      failedPages.push(page.name);
      console.log(`✗ ${page.name}: ${result.diffPercentage}% 差异 (阈值: ${config.threshold! * 100}%)`);
    } else {
      console.log(`✓ ${page.name}: 通过`);
    }
  }

  if (!allPassed) {
    console.log(`\n❌ 视觉回归测试失败`);
    console.log(`失败页面: ${failedPages.join(', ')}`);
    process.exit(1);
  } else {
    console.log(`\n✓ 所有视觉回归测试通过`);
    process.exit(0);
  }
}

// 运行所有示例
async function runAllExamples() {
  try {
    await example1_BasicComparison();
    await example2_PredefinedThresholds();
    await example3_PageTypeThresholds();
    await example4_ComponentComparison();
    await example5_InteractionStates();
    await example6_ViewportAdjustment();
    await example7_ConfigBuilder();
    await example8_ConfigValidation();
    await example9_BatchComparisonByType();
    // await example10_CICDIntegration();  // 注释掉，因为会退出进程
    
    console.log('\n=== 所有示例运行完成 ===');
  } catch (error) {
    console.error('示例运行出错:', error);
  }
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

export {
  example1_BasicComparison,
  example2_PredefinedThresholds,
  example3_PageTypeThresholds,
  example4_ComponentComparison,
  example5_InteractionStates,
  example6_ViewportAdjustment,
  example7_ConfigBuilder,
  example8_ConfigValidation,
  example9_BatchComparisonByType,
  example10_CICDIntegration
};
