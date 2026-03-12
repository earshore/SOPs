// ============================================
// EU Marketing Calendar Dropdown Fix Verification
// ============================================
// 在浏览器Console中运行此脚本来验证修复
// Run this script in browser console to verify the fix

(async function verifyDropdownFix() {
    console.log('🔍 开始验证下拉框修复...\n');
    
    // Step 1: 检查下拉框元素
    const dropdown = document.getElementById('amzf_search_history');
    const searchBox = document.querySelector('.amzf_search_box');
    
    if (!dropdown) {
        console.error('❌ 错误：找不到下拉框元素 #amzf_search_history');
        return;
    }
    
    if (!searchBox) {
        console.error('❌ 错误：找不到搜索框元素 .amzf_search_box');
        return;
    }
    
    console.log('✅ 找到下拉框和搜索框元素\n');
    
    // Step 2: 检查下拉框是否已移到 body
    console.log('📍 检查下拉框位置:');
    console.log('  父元素:', dropdown.parentElement?.tagName);
    console.log('  是否在 body 下:', dropdown.parentElement === document.body ? '✅ 是' : '❌ 否');
    
    if (dropdown.parentElement !== document.body) {
        console.warn('⚠️ 警告：下拉框还没有移到 body，可能需要先点击搜索框触发显示');
    }
    console.log('');
    
    // Step 3: 触发下拉框显示
    console.log('🖱️ 模拟点击搜索框...');
    searchBox.click();
    
    // 等待下拉框显示
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Step 4: 检查下拉框是否显示
    const isVisible = dropdown.classList.contains('amzf_show');
    console.log('  下拉框可见:', isVisible ? '✅ 是' : '❌ 否');
    
    if (!isVisible) {
        console.error('❌ 错误：下拉框未显示，无法继续测试');
        return;
    }
    console.log('');
    
    // Step 5: 再次检查父元素
    console.log('📍 下拉框显示后的位置:');
    console.log('  父元素:', dropdown.parentElement?.tagName);
    console.log('  是否在 body 下:', dropdown.parentElement === document.body ? '✅ 是' : '❌ 否');
    console.log('');
    
    // Step 6: 检查位置计算
    const searchRect = searchBox.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();
    
    console.log('📏 位置信息:');
    console.log('  搜索框 bottom:', searchRect.bottom.toFixed(2));
    console.log('  下拉框设置 top:', dropdown.style.top);
    console.log('  下拉框实际 top:', dropdownRect.top.toFixed(2));
    console.log('  下拉框设置 left:', dropdown.style.left);
    console.log('  下拉框实际 left:', dropdownRect.left.toFixed(2));
    console.log('');
    
    // Step 7: 检查 transform
    console.log('🔄 Transform 检查:');
    console.log('  inline transform:', dropdown.style.transform);
    console.log('  computed transform:', window.getComputedStyle(dropdown).transform);
    console.log('');
    
    // Step 8: 计算位置差异
    const setTop = parseFloat(dropdown.style.top);
    const setLeft = parseFloat(dropdown.style.left);
    const topDiff = Math.abs(dropdownRect.top - setTop);
    const leftDiff = Math.abs(dropdownRect.left - setLeft);
    
    console.log('📊 位置差异分析:');
    console.log('  top 差异:', topDiff.toFixed(2) + 'px', topDiff < 2 ? '✅ 正常' : '❌ 异常');
    console.log('  left 差异:', leftDiff.toFixed(2) + 'px', leftDiff < 2 ? '✅ 正常' : '❌ 异常');
    console.log('');
    
    // Step 9: 检查父元素 transform（如果位置有问题）
    if (topDiff >= 2 || leftDiff >= 2) {
        console.log('🔍 检查父元素 transform (可能的问题来源):');
        let parent = dropdown.parentElement;
        let level = 0;
        while (parent && level < 5) {
            const parentStyle = window.getComputedStyle(parent);
            const hasTransform = parentStyle.transform !== 'none';
            console.log(`  Level ${level} - ${parent.tagName}.${parent.className || '(no class)'}:`);
            console.log(`    transform: ${parentStyle.transform} ${hasTransform ? '⚠️' : '✅'}`);
            console.log(`    position: ${parentStyle.position}`);
            parent = parent.parentElement;
            level++;
        }
        console.log('');
    }
    
    // Step 10: 最终结果
    console.log('═══════════════════════════════════════');
    if (topDiff < 2 && leftDiff < 2 && dropdown.parentElement === document.body) {
        console.log('🎉🎉🎉 测试通过！下拉框位置完全正确！');
        console.log('✅ 下拉框已正确移到 body');
        console.log('✅ 位置计算准确（误差 < 2px）');
        console.log('✅ 不受父元素 transform 影响');
    } else {
        console.log('❌ 测试失败！仍存在问题：');
        if (dropdown.parentElement !== document.body) {
            console.log('  ❌ 下拉框未移到 body');
        }
        if (topDiff >= 2) {
            console.log(`  ❌ top 位置偏移 ${topDiff.toFixed(2)}px`);
        }
        if (leftDiff >= 2) {
            console.log(`  ❌ left 位置偏移 ${leftDiff.toFixed(2)}px`);
        }
    }
    console.log('═══════════════════════════════════════');
    
    return {
        success: topDiff < 2 && leftDiff < 2 && dropdown.parentElement === document.body,
        topDiff,
        leftDiff,
        inBody: dropdown.parentElement === document.body
    };
})();
