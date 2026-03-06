/**
 * 置信度系统诊断和修复脚本
 *
 * 使用方法：
 * 1. 在 AI 分析页面完成一次分析
 * 2. 打开浏览器控制台（F12）
 * 3. 复制并执行此脚本
 */

(async function diagnoseConfidence() {
  console.log('🔍 ========== 置信度系统诊断开始 ==========\n');

  // ========== 步骤 1: 检查 Alpine 组件 ==========
  console.log('📋 步骤 1: 检查 Alpine 组件');
  const alpineEl = document.querySelector('[x-data*="aiAnalysisPanel"]');

  if (!alpineEl || !alpineEl.__x) {
    console.error('❌ 无法找到 Alpine 组件！');
    console.log('💡 建议：刷新页面重试');
    return;
  }

  const alpineData = alpineEl.__x.$data;
  console.log('✅ Alpine 组件找到');
  console.log('  - hasReport:', alpineData.hasReport);
  console.log('  - analysisReport 存在:', !!alpineData.analysisReport);

  if (!alpineData.analysisReport) {
    console.error('❌ 没有分析报告！');
    console.log('💡 建议：先完成一次 AI 分析');
    return;
  }

  const report = alpineData.analysisReport;
  console.log('  - 报告类型:', typeof report);
  console.log('  - 报告键:', Object.keys(report).slice(0, 10).join(', '));

  // ========== 步骤 2: 检查 _metadata ==========
  console.log('\n📊 步骤 2: 检查 _metadata 字段');

  if (!report._metadata) {
    console.error('❌ 报告缺少 _metadata 字段！');
    console.log('🔧 这是主要问题，需要修复');
  } else {
    console.log('✅ _metadata 存在');
    console.log('  - confidence:', report._metadata.confidence);
    console.log('  - overallConfidence:', report._metadata.overallConfidence);

    if (!report._metadata.confidence) {
      console.error('❌ _metadata.confidence 为空！');
    }
    if (!report._metadata.overallConfidence) {
      console.error('❌ _metadata.overallConfidence 为空！');
    }
  }

  // ========== 步骤 3: 检查 Alpine 计算属性 ==========
  console.log('\n🧮 步骤 3: 检查 Alpine 计算属性');
  console.log('  - reportConfidence:', alpineData.reportConfidence);
  console.log('  - overallConfidence:', alpineData.overallConfidence);
  console.log('  - overallConfidencePercent:', alpineData.overallConfidencePercent);
  console.log('  - hasConfidenceData:', alpineData.hasConfidenceData);

  if (!alpineData.hasConfidenceData) {
    console.error('❌ hasConfidenceData 为 false，这就是为什么 UI 不显示！');
  }

  // ========== 步骤 4: 检查 UI 元素 ==========
  console.log('\n🎨 步骤 4: 检查 UI 元素');
  const confidenceCard = document.querySelector('[x-show="hasConfidenceData"]');

  if (!confidenceCard) {
    console.error('❌ 置信度卡片元素未找到！');
  } else {
    console.log('✅ 置信度卡片元素找到');
    const isVisible = confidenceCard.style.display !== 'none';
    console.log('  - 是否可见:', isVisible);
    console.log('  - display 样式:', confidenceCard.style.display || '(未设置)');
  }

  // ========== 步骤 5: 尝试手动计算置信度 ==========
  console.log('\n🔧 步骤 5: 尝试手动计算置信度');

  try {
    // 动态导入置信度计算模块
    const module = await import('/src/modules/app_center/views/master_analysis/ai_analysis/services/confidenceCalculator.ts');
    const { calculateFullReportConfidence, calculateOverallConfidence } = module;

    console.log('✅ 置信度计算模块加载成功');

    const calculatedConfidence = calculateFullReportConfidence(report);
    const calculatedOverall = calculateOverallConfidence(calculatedConfidence);

    console.log('  - 手动计算的置信度:', calculatedConfidence);
    console.log('  - 手动计算的总体置信度:', calculatedOverall);
    console.log('  - 百分比:', Math.round(calculatedOverall * 100) + '%');

    // ========== 步骤 6: 自动修复 ==========
    if (!report._metadata || !report._metadata.confidence) {
      console.log('\n🔧 步骤 6: 自动修复缺失的置信度数据');

      // 添加或更新 _metadata
      report._metadata = {
        ...report._metadata,
        confidence: calculatedConfidence,
        overallConfidence: calculatedOverall,
        analyzedAt: report._metadata?.analyzedAt || new Date().toISOString(),
        targetIds: alpineData.selectedTargets || [],
        language: 'zh'
      };

      // 触发 Alpine 更新
      alpineData.analysisReport = { ...report };

      // 同步到 Zustand store
      if (window.Alpine && window.Alpine.store) {
        const appStore = window.Alpine.store('app');
        if (appStore && appStore.setAnalysisReport) {
          appStore.setAnalysisReport(report);
        }
      }

      console.log('✅ 置信度数据已修复！');
      console.log('  - 新的 overallConfidence:', report._metadata.overallConfidence);
      console.log('  - 新的 overallConfidencePercent:', Math.round(report._metadata.overallConfidence * 100) + '%');

      // 等待 Alpine 更新
      setTimeout(() => {
        const newHasConfidenceData = alpineData.hasConfidenceData;
        console.log('  - hasConfidenceData 现在是:', newHasConfidenceData);

        if (newHasConfidenceData) {
          console.log('🎉 修复成功！置信度现在应该显示了！');
        } else {
          console.error('⚠️ 修复后 hasConfidenceData 仍然是 false');
          console.log('💡 尝试刷新页面');
        }
      }, 500);
    } else {
      console.log('\n✅ 置信度数据完整，无需修复');
      console.log('💡 如果仍然看不到置信度，可能是 CSS 或其他问题');
    }

  } catch (error) {
    console.error('❌ 无法加载置信度计算模块:', error);
    console.log('💡 这可能是路径问题，尝试刷新页面');
  }

  // ========== 步骤 7: 生成诊断报告 ==========
  console.log('\n📋 ========== 诊断报告 ==========');

  const diagnosticReport = {
    alpineComponentFound: !!alpineEl,
    hasReport: alpineData.hasReport,
    reportExists: !!report,
    hasMetadata: !!report._metadata,
    hasConfidence: !!report._metadata?.confidence,
    hasOverallConfidence: !!report._metadata?.overallConfidence,
    hasConfidenceData: alpineData.hasConfidenceData,
    uiElementFound: !!confidenceCard,
    uiElementVisible: confidenceCard ? confidenceCard.style.display !== 'none' : false
  };

  console.table(diagnosticReport);

  // 判断问题类型
  console.log('\n🎯 问题诊断:');
  if (!diagnosticReport.hasMetadata) {
    console.log('❌ 主要问题：报告缺少 _metadata 字段');
    console.log('💡 原因：后端可能没有正确附加置信度数据');
    console.log('💡 解决：脚本已尝试自动修复，刷新页面查看效果');
  } else if (!diagnosticReport.hasConfidence) {
    console.log('❌ 主要问题：_metadata 存在但缺少 confidence 字段');
    console.log('💡 原因：置信度计算可能失败');
    console.log('💡 解决：脚本已尝试自动修复');
  } else if (!diagnosticReport.hasConfidenceData) {
    console.log('❌ 主要问题：数据存在但 hasConfidenceData 为 false');
    console.log('💡 原因：Alpine 响应式系统可能未更新');
    console.log('💡 解决：尝试刷新页面');
  } else if (!diagnosticReport.uiElementVisible) {
    console.log('❌ 主要问题：UI 元素被隐藏');
    console.log('💡 原因：x-show 指令或 CSS 问题');
    console.log('💡 解决：检查 CSS 和 Alpine 指令');
  } else {
    console.log('✅ 所有检查通过！置信度应该正常显示');
    console.log('💡 如果仍然看不到，可能是浏览器缓存问题，尝试硬刷新（Ctrl+Shift+R）');
  }

  console.log('\n✅ ========== 诊断完成 ==========');
})();
