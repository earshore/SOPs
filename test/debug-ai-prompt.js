// ============================================================
// AI 提示词调试工具
// ============================================================
// 使用方法：
// 1. 打开浏览器控制台 (F12)
// 2. 复制整个脚本到控制台
// 3. 运行 debugAIPrompt() 查看 AI 模式的提示词构建
// ============================================================

console.log('🔧 AI 提示词调试工具已加载');

window.debugAIPrompt = function() {
    console.log('\n========================================');
    console.log('🔍 AI 提示词调试');
    console.log('========================================');
    console.log('时间:', new Date().toLocaleTimeString());
    
    // 1. 检查全局状态
    if (!window.qalabState) {
        console.error('❌ qalabState 未加载');
        return;
    }
    
    if (!window.qalabState.reportData) {
        console.error('❌ reportData 未加载');
        return;
    }
    
    const reportData = window.qalabState.reportData;
    const analysisReport = reportData.analysisReport || reportData;
    
    console.log('✅ 报告数据已加载');
    console.log('========================================');
    
    // 2. 检查业务字段
    console.log('📊 检查业务字段访问:');
    
    const fields = [
        'selling-points',
        'fatal-flaws',
        'wow-moments',
        'hesitation-points',
        'buyer-profile'
    ];
    
    fields.forEach(field => {
        const data = analysisReport[field];
        console.log(`\n字段: ${field}`);
        console.log('  - 存在:', !!data);
        console.log('  - 类型:', typeof data);
        
        if (data) {
            console.log('  - 字段:', Object.keys(data));
            
            // 检查常见的子字段
            if (data.bullet_analysis) {
                console.log('  - bullet_analysis 长度:', data.bullet_analysis.length);
            }
            if (data.critical_issues) {
                console.log('  - critical_issues 长度:', data.critical_issues.length);
            }
            if (data.moments) {
                console.log('  - moments 长度:', data.moments.length);
            }
            if (data.hesitations) {
                console.log('  - hesitations 长度:', data.hesitations.length);
            }
            if (data.buyer_types) {
                console.log('  - buyer_types 长度:', data.buyer_types.length);
            }
            
            // 显示完整结构
            console.log('  - 完整数据:', data);
        }
    });
    
    console.log('\n========================================');
    console.log('💡 提示: 如果字段不存在或为空，说明报告数据结构不符合预期');
    console.log('========================================');
};

console.log('✅ 运行 debugAIPrompt() 开始调试');
