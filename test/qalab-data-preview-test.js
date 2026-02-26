/**
 * Q&A Lab 数据预览功能测试
 * 测试导入分析报告后，是否能正确显示所有分析目标的卡片
 */

const testData = {
  metadata: {
    marketplace: 'DE',
    dataSource: 'import',
    timestamp: new Date().toISOString(),
    asins: ['B0TESTASI1'],
    productTitle: '测试产品'
  },
  analysisReport: {
    'title-keywords': {
      primary_keywords: ['keyword1', 'keyword2', 'keyword3'],
      scene_keywords: ['scene1', 'scene2'],
      removed_brand_terms: ['brand1'],
      removed_modifiers: ['modifier1', 'modifier2']
    },
    'selling-points': {
      bullet_analysis: [
        { function: 'func1', scene: 'scene1', differentiation_angle: 'angle1' },
        { function: 'func2', scene: 'scene2', differentiation_angle: 'angle2' },
        { function: 'func3', scene: null, differentiation_angle: 'angle3' }
      ]
    },
    'fatal-flaws': {
      critical_issues: [
        { text: 'issue1', severity: 'high', actionable: true },
        { text: 'issue2', severity: 'medium', actionable: false },
        { text: 'issue3', severity: 'high', actionable: true }
      ]
    },
    'wow-moments': {
      moments: [
        { text: 'moment1', type: 'exceeded', category: 'feature' },
        { text: 'moment2', type: 'exceeded', category: 'quality' },
        { text: 'moment3', type: 'normal', category: 'feature' }
      ]
    },
    'hesitation-points': {
      hesitations: [
        { text: 'hesitation1', resolved: true, priority: 'high' },
        { text: 'hesitation2', resolved: false, priority: 'medium' },
        { text: 'hesitation3', resolved: true, priority: 'high' }
      ]
    },
    'buyer-profile': {
      buyer_types: ['type1', 'type2', 'type3'],
      usage_scenarios: ['scenario1', 'scenario2'],
      demographics: ['demo1', 'demo2', 'demo3', 'demo4']
    },
    'vocab-gap': {
      missing_terms: ['term1', 'term2'],
      buyer_slang: ['slang1', 'slang2', 'slang3'],
      recommendations: ['rec1', 'rec2', 'rec3', 'rec4']
    },
    'promise-reality': {
      gaps: [
        { text: 'gap1', type: 'overpromise', actionable: true },
        { text: 'gap2', type: 'normal', actionable: false },
        { text: 'gap3', type: 'overpromise', actionable: true }
      ]
    }
  }
};

console.log('=== Q&A Lab 数据预览测试 ===\n');
console.log('测试数据包含 8 个分析目标：');
console.log('1. title-keywords (标题核心词根)');
console.log('2. selling-points (卖点结构拆解)');
console.log('3. fatal-flaws (致命劝退点)');
console.log('4. wow-moments (惊喜顿悟时刻)');
console.log('5. hesitation-points (购买前犹豫点)');
console.log('6. buyer-profile (画像与场景侧写)');
console.log('7. vocab-gap (词汇鸿沟分析)');
console.log('8. promise-reality (承诺/现实断层)\n');

console.log('测试数据JSON:');
console.log(JSON.stringify(testData, null, 2));
console.log('\n=== 测试步骤 ===');
console.log('1. 打开浏览器访问: http://localhost:5173');
console.log('2. 导航到: 应用中心 > Master Analysis > Q&A 预研');
console.log('3. 点击"数据预览" Tab');
console.log('4. 点击"点击导入分析报告 JSON"区域');
console.log('5. 选择包含上述测试数据的JSON文件');
console.log('6. 验证是否显示 8 个分析目标卡片');
console.log('7. 检查每个卡片的统计数据是否正确\n');

console.log('=== 预期结果 ===');
console.log('✓ 应该显示 8 个分析目标卡片（2列网格布局）');
console.log('✓ 每个卡片包含：目标名称、数据来源、3个统计数据、数据源标签');
console.log('✓ 卡片样式与 AI Analysis 页面一致');
console.log('✓ 底部提示显示"共找到 8 个分析目标"');
