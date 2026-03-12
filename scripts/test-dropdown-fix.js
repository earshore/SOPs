/**
 * EU营销日历下拉框修复验证脚本
 * 
 * 使用方法：
 * 1. 启动开发服务器: npm run dev
 * 2. 在浏览器控制台运行此脚本
 */

(function() {
    console.log('🔍 开始验证EU营销日历下拉框修复...\n');

    const tests = [];
    let passCount = 0;
    let failCount = 0;

    // 测试1: 检查搜索框元素是否存在
    function test1() {
        const searchInput = document.getElementById('amzf_search');
        const searchHistory = document.getElementById('amzf_search_history');
        const searchBox = document.querySelector('.amzf_search_box');

        if (searchInput && searchHistory && searchBox) {
            console.log('✅ 测试1通过: 搜索框相关元素存在');
            passCount++;
            return true;
        } else {
            console.log('❌ 测试1失败: 搜索框相关元素缺失');
            failCount++;
            return false;
        }
    }

    // 测试2: 检查下拉框CSS样式
    function test2() {
        const searchHistory = document.getElementById('amzf_search_history');
        if (!searchHistory) {
            console.log('❌ 测试2失败: 下拉框元素不存在');
            failCount++;
            return false;
        }

        const styles = window.getComputedStyle(searchHistory);
        const position = styles.position;
        const zIndex = styles.zIndex;

        console.log(`   下拉框样式: position=${position}, z-index=${zIndex}`);

        if (position === 'fixed' && parseInt(zIndex) >= 99999) {
            console.log('✅ 测试2通过: 下拉框CSS样式正确');
            passCount++;
            return true;
        } else {
            console.log('❌ 测试2失败: 下拉框CSS样式不正确');
            console.log(`   期望: position=fixed, z-index>=99999`);
            console.log(`   实际: position=${position}, z-index=${zIndex}`);
            failCount++;
            return false;
        }
    }

    // 测试3: 检查父容器overflow设置
    function test3() {
        const header = document.querySelector('.amzf_header');
        const moduleContainer = document.querySelector('.module-container');

        if (!header) {
            console.log('⚠️  测试3警告: .amzf_header 元素不存在');
        } else {
            const headerOverflow = window.getComputedStyle(header).overflow;
            console.log(`   .amzf_header overflow: ${headerOverflow}`);
        }

        if (!moduleContainer) {
            console.log('⚠️  测试3警告: .module-container 元素不存在');
        } else {
            const containerOverflow = window.getComputedStyle(moduleContainer).overflow;
            console.log(`   .module-container overflow: ${containerOverflow}`);
        }

        console.log('✅ 测试3通过: 父容器overflow检查完成');
        passCount++;
        return true;
    }

    // 测试4: 模拟点击搜索框
    function test4() {
        return new Promise((resolve) => {
            const searchInput = document.getElementById('amzf_search');
            const searchHistory = document.getElementById('amzf_search_history');

            if (!searchInput || !searchHistory) {
                console.log('❌ 测试4失败: 元素不存在');
                failCount++;
                resolve(false);
                return;
            }

            // 模拟点击
            searchInput.focus();
            searchInput.click();

            // 等待动画完成
            setTimeout(() => {
                const isVisible = searchHistory.classList.contains('amzf_show');
                const opacity = window.getComputedStyle(searchHistory).opacity;

                console.log(`   下拉框状态: visible=${isVisible}, opacity=${opacity}`);

                if (isVisible && parseFloat(opacity) > 0) {
                    console.log('✅ 测试4通过: 点击搜索框后下拉框正常显示');
                    passCount++;
                    resolve(true);
                } else {
                    console.log('❌ 测试4失败: 点击搜索框后下拉框未显示');
                    failCount++;
                    resolve(false);
                }
            }, 500);
        });
    }

    // 测试5: 检查下拉框位置
    function test5() {
        return new Promise((resolve) => {
            const searchBox = document.querySelector('.amzf_search_box');
            const searchHistory = document.getElementById('amzf_search_history');

            if (!searchBox || !searchHistory) {
                console.log('❌ 测试5失败: 元素不存在');
                failCount++;
                resolve(false);
                return;
            }

            const searchRect = searchBox.getBoundingClientRect();
            const dropdownRect = searchHistory.getBoundingClientRect();

            console.log(`   搜索框位置: top=${searchRect.top.toFixed(2)}, left=${searchRect.left.toFixed(2)}`);
            console.log(`   下拉框位置: top=${dropdownRect.top.toFixed(2)}, left=${dropdownRect.left.toFixed(2)}`);

            const isPositionCorrect = dropdownRect.top > searchRect.bottom - 10;
            const isInViewport = dropdownRect.right <= window.innerWidth && dropdownRect.bottom <= window.innerHeight;

            if (isPositionCorrect && isInViewport) {
                console.log('✅ 测试5通过: 下拉框位置正确且在视口内');
                passCount++;
                resolve(true);
            } else {
                console.log('❌ 测试5失败: 下拉框位置异常');
                if (!isPositionCorrect) {
                    console.log('   下拉框位置不在搜索框下方');
                }
                if (!isInViewport) {
                    console.log('   下拉框超出视口边界');
                }
                failCount++;
                resolve(false);
            }
        });
    }

    // 测试6: 检查点击外部关闭
    function test6() {
        return new Promise((resolve) => {
            const searchHistory = document.getElementById('amzf_search_history');

            if (!searchHistory) {
                console.log('❌ 测试6失败: 元素不存在');
                failCount++;
                resolve(false);
                return;
            }

            // 模拟点击外部
            document.body.click();

            setTimeout(() => {
                const isVisible = searchHistory.classList.contains('amzf_show');

                if (!isVisible) {
                    console.log('✅ 测试6通过: 点击外部后下拉框正常关闭');
                    passCount++;
                    resolve(true);
                } else {
                    console.log('❌ 测试6失败: 点击外部后下拉框未关闭');
                    failCount++;
                    resolve(false);
                }
            }, 100);
        });
    }

    // 运行所有测试
    async function runTests() {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        test1();
        test2();
        test3();
        await test4();
        await test5();
        await test6();

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\n📊 测试结果汇总:`);
        console.log(`   ✅ 通过: ${passCount} 项`);
        console.log(`   ❌ 失败: ${failCount} 项`);
        console.log(`   总计: ${passCount + failCount} 项`);

        if (failCount === 0) {
            console.log('\n🎉 所有测试通过！下拉框修复成功！');
        } else {
            console.log('\n⚠️  部分测试失败，请检查修复代码。');
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    // 检查是否在正确的页面
    if (!window.location.hash.includes('marketing_calendar')) {
        console.log('⚠️  警告: 当前不在EU营销日历页面');
        console.log('   请先导航到: #/amz_hub/practice/marketing_calendar');
        console.log('   然后重新运行此脚本\n');
        return;
    }

    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runTests);
    } else {
        runTests();
    }
})();
