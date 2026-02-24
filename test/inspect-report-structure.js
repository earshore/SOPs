// ============================================================
// 报告数据结构检查工具
// ============================================================
// 使用方法：
// 1. 打开浏览器控制台 (F12)
// 2. 复制整个脚本到控制台
// 3. 运行 inspectReport() 查看报告结构
// ============================================================

console.log('🔧 报告结构检查工具已加载');

window.inspectReport = function() {
    console.log('\n========================================');
    console.log('🔍 报告数据结构检查');
    console.log('========================================');
    console.log('时间:', new Date().toLocaleTimeString());
    
    // 1. 检查全局状态
    if (!window.qalabState) {
        console.error('❌ qalabState 未加载');
        return;
    }
    
    if (!window.qalabState.reportData) {
        console.error('❌ reportData 未加载');
        console.log('💡 提示: 请先加载报告数据');
        return;
    }
    
    const reportData = window.qalabState.reportData;
    
    console.log('✅ 报告数据已加载');
    console.log('========================================');
    
    // 2. 显示根级别字段
    console.log('📦 根级别字段:');
    const rootKeys = Object.keys(reportData);
    rootKeys.forEach(key => {
        const value = reportData[key];
        const type = Array.isArray(value) ? 'Array' : typeof value;
        const extra = Array.isArray(value) ? `[${value.length}]` : '';
        console.log(`  - ${key}: ${type}${extra}`);
    });
    
    console.log('========================================');
    
    // 3. 检查 metadata
    if (reportData.metadata) {
        console.log('📋 metadata 字段:');
        Object.keys(reportData.metadata).forEach(key => {
            console.log(`  - ${key}:`, reportData.metadata[key]);
        });
        console.log('========================================');
    }
    
    // 4. 检查 analysisReport
    const ar = reportData.analysisReport || reportData;
    console.log('📊 analysisReport 字段:');
    const arKeys = Object.keys(ar);
    arKeys.forEach(key => {
        const value = ar[key];
        const type = Array.isArray(value) ? 'Array' : typeof value;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            console.log(`  - ${key}: Object`);
            const subKeys = Object.keys(value);
            subKeys.forEach(subKey => {
                const subValue = value[subKey];
                const subType = Array.isArray(subValue) ? 'Array' : typeof subValue;
                const subExtra = Array.isArray(subValue) ? `[${subValue.length}]` : '';
                console.log(`      - ${subKey}: ${subType}${subExtra}`);
            });
        } else if (Array.isArray(value)) {
            console.log(`  - ${key}: Array[${value.length}]`);
        } else {
            console.log(`  - ${key}: ${type}`);
        }
    });
    
    console.log('========================================');
    
    // 5. 查找可能的业务字段
    console.log('🔍 查找可能的业务字段:');
    
    const possibleFields = [
        'selling-points', 'sellingPoints', 'selling_points',
        'fatal-flaws', 'fatalFlaws', 'fatal_flaws',
        'wow-moments', 'wowMoments', 'wow_moments',
        'hesitation-points', 'hesitationPoints', 'hesitation_points',
        'buyer-profile', 'buyerProfile', 'buyer_profile'
    ];
    
    let foundFields = [];
    possibleFields.forEach(field => {
        if (ar[field]) {
            foundFields.push(field);
            console.log(`  ✅ 找到: ${field}`);
            if (typeof ar[field] === 'object') {
                console.log(`      子字段:`, Object.keys(ar[field]));
            }
        }
    });
    
    if (foundFields.length === 0) {
        console.log('  ⚠️ 未找到标准业务字段');
        console.log('  💡 可能的原因:');
        console.log('     1. 报告数据格式不同');
        console.log('     2. 字段使用了其他命名');
        console.log('     3. 数据还未完全加载');
    }
    
    console.log('========================================');
    
    // 6. 显示完整的 JSON（截断）
    console.log('📄 完整 JSON 预览 (前 500 字符):');
    const jsonStr = JSON.stringify(reportData, null, 2);
    console.log(jsonStr.substring(0, 500) + (jsonStr.length > 500 ? '\n...(截断)' : ''));
    
    console.log('========================================');
    console.log('💡 提示: 可以在控制台输入 window.qalabState.reportData 查看完整数据');
    console.log('========================================');
};

console.log('✅ 运行 inspectReport() 开始检查');
