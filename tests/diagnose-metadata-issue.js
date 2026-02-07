/**
 * 诊断脚本：检查历史记录中的 metadata 完整性
 * 用于排查 "Cannot read properties of undefined (reading 'name')" 错误
 * 
 * 使用方法：
 * 1. 在浏览器控制台中运行此脚本
 * 2. 查看输出的诊断信息
 */

(function diagnoseMetadataIssue() {
    console.log('=== 开始诊断 metadata 完整性 ===\n');

    // 1. 检查 localStorage 中的历史记录
    const historyKey = 'scrape_history';
    const historyData = localStorage.getItem(historyKey);
    
    if (!historyData) {
        console.log('✅ 未找到历史记录数据');
        return;
    }

    let history;
    try {
        history = JSON.parse(historyData);
    } catch (e) {
        console.error('❌ 历史记录数据解析失败:', e);
        return;
    }

    if (!Array.isArray(history) || history.length === 0) {
        console.log('✅ 历史记录为空');
        return;
    }

    console.log(`📊 找到 ${history.length} 条历史记录\n`);

    // 2. 检查每条记录的 metadata
    let issueCount = 0;
    history.forEach((item, index) => {
        console.log(`--- 记录 #${index + 1} (ID: ${item.id}) ---`);
        console.log(`  站点: ${item.site || '❌ 缺失'}`);
        console.log(`  时间: ${item.timestamp || '❌ 缺失'}`);
        console.log(`  ASIN数量: ${item.asins?.length || 0}`);

        if (!item.data) {
            console.log('  ❌ data 字段缺失');
            issueCount++;
        } else if (!item.data.metadata) {
            console.log('  ❌ metadata 字段缺失');
            issueCount++;
        } else {
            const meta = item.data.metadata;
            console.log(`  metadata.marketplace: ${meta.marketplace || '❌ 缺失'}`);
            console.log(`  metadata.domain: ${meta.domain || '❌ 缺失'}`);
            console.log(`  metadata.language: ${meta.language || '❌ 缺失'}`);
            
            if (!meta.marketplace) {
                console.log('  ⚠️ marketplace 字段缺失，可能导致分析失败');
                issueCount++;
            }
        }
        console.log('');
    });

    // 3. 输出诊断结果
    console.log('=== 诊断完成 ===');
    if (issueCount === 0) {
        console.log('✅ 所有历史记录的 metadata 结构完整');
    } else {
        console.log(`⚠️ 发现 ${issueCount} 个问题`);
        console.log('\n建议操作：');
        console.log('1. 清空历史记录：在应用中点击"清空历史"按钮');
        console.log('2. 或在控制台执行：localStorage.removeItem("scrape_history")');
        console.log('3. 重新抓取数据');
    }
})();
