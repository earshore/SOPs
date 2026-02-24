// ============================================================
// Rufus AI 模式验证 - 浏览器控制台快速测试
// ============================================================
// 使用方法：
// 1. 打开浏览器控制台 (F12)
// 2. 复制整个脚本到控制台
// 3. 运行以下命令：
//    - quickCheck()  - 快速检查基础状态
//    - testToggle()  - 测试模式切换
//    - testAI()      - 测试 AI 回答
//    - fullTest()    - 完整测试流程
// ============================================================

console.log('🔧 Rufus AI 验证脚本已加载');
console.log('可用命令: quickCheck(), testToggle(), testAI(), fullTest()');

// 快速检查
window.quickCheck = function() {
    console.log('\n========================================');
    console.log('🔍 Rufus AI 快速检查');
    console.log('========================================');
    console.log('时间:', new Date().toLocaleTimeString());
    console.log('✅ = 正常 | ❌ = 异常');
    
    // 1. 检查全局对象
    const hasQalabState = typeof window.qalabState !== 'undefined';
    const hasRufusSimulator = typeof window.rufusSimulator !== 'undefined';
    console.log(hasQalabState ? '✅' : '❌', 'qalabState:', hasQalabState ? '已加载' : '未加载');
    console.log(hasRufusSimulator ? '✅' : '❌', 'rufusSimulator:', hasRufusSimulator ? '已加载' : '未加载');
    
    if (hasQalabState) {
        console.log('  - 当前模式:', window.qalabState.rufusMode);
        console.log('  - 报告数据:', window.qalabState.reportData ? '已加载' : '未加载');
        console.log('  - 消息数量:', window.qalabState.rufusMessages.length);
        console.log('  - 注册的动作数:', window.qalabState.registeredActions.length);
    }
    
    // 2. 检查 DOM 元素
    const msgContainer = document.getElementById('rufusMessages');
    const inputBox = document.getElementById('rufusInput');
    const toggleBtn = document.getElementById('rufusModeToggle');
    
    console.log(msgContainer ? '✅' : '❌', '消息容器:', msgContainer ? '已加载' : '未加载');
    console.log(inputBox ? '✅' : '❌', '输入框:', inputBox ? '已加载' : '未加载');
    console.log(toggleBtn ? '✅' : '❌', '模式切换按钮:', toggleBtn ? '已加载' : '未加载');
    
    if (toggleBtn) {
        console.log('  - 按钮文本:', toggleBtn.textContent.trim());
        console.log('  - 按钮类名:', toggleBtn.className);
    }
    
    // 3. 检查全局动作
    const toggleAction = window.amz_qalab_toggleRufusMode;
    const sendAction = window.amz_qalab_sendRufusQuestion;
    
    console.log(typeof toggleAction === 'function' ? '✅' : '❌', 'amz_qalab_toggleRufusMode:', typeof toggleAction === 'function' ? '已注册' : '未注册');
    console.log(typeof sendAction === 'function' ? '✅' : '❌', 'amz_qalab_sendRufusQuestion:', typeof sendAction === 'function' ? '已注册' : '未注册');
    
    // 4. 检查 LLM 配置
    try {
        const llmProvider = localStorage.getItem('llm_active_provider');
        console.log(llmProvider ? '✅' : '⚠️', 'LLM 配置:', llmProvider ? `"${llmProvider}"` : '未配置');
    } catch (e) {
        console.log('⚠️', 'LLM 配置: 无法读取');
    }
    
    console.log('========================================');
    
    // 总结
    const allGood = hasQalabState && hasRufusSimulator && msgContainer && inputBox && toggleBtn && typeof toggleAction === 'function';
    if (allGood) {
        console.log('✅ 基础检查通过，可以进行功能测试');
        console.log('💡 运行 testToggle() 测试模式切换');
    } else {
        console.log('❌ 基础检查未通过');
        console.log('建议: 刷新页面 (Ctrl+F5) 后重试');
    }
    
    return allGood;
};

// 测试模式切换
window.testToggle = function() {
    console.log('\n========================================');
    console.log('🔄 测试模式切换');
    console.log('========================================');
    
    if (!window.qalabState) {
        console.error('❌ qalabState 未加载，请先运行 quickCheck()');
        return false;
    }
    
    const oldMode = window.qalabState.rufusMode;
    console.log('📋 切换前模式:', oldMode);
    
    // 调用切换函数
    if (typeof window.amz_qalab_toggleRufusMode === 'function') {
        console.log('🔧 调用 amz_qalab_toggleRufusMode()...');
        window.amz_qalab_toggleRufusMode();
    } else {
        console.error('❌ amz_qalab_toggleRufusMode 未注册');
        return false;
    }
    
    // 等待一下让 UI 更新
    setTimeout(() => {
        const newMode = window.qalabState.rufusMode;
        console.log('📋 切换后模式:', newMode);
        
        const toggleBtn = document.getElementById('rufusModeToggle');
        if (toggleBtn) {
            console.log('🎨 按钮文本:', toggleBtn.textContent.trim());
            console.log('🎨 按钮类名:', toggleBtn.className);
        }
        
        if (oldMode !== newMode) {
            console.log('✅ 模式切换成功!');
            console.log('💡 运行 testAI() 测试 AI 回答 (如果当前是 AI 模式)');
        } else {
            console.log('❌ 模式未改变');
        }
        
        console.log('========================================');
    }, 100);
    
    return true;
};

// 测试 AI 回答
window.testAI = function() {
    console.log('\n========================================');
    console.log('🤖 测试 AI 回答');
    console.log('========================================');
    
    if (!window.qalabState) {
        console.error('❌ qalabState 未加载');
        return false;
    }
    
    const currentMode = window.qalabState.rufusMode;
    console.log('📋 当前模式:', currentMode);
    
    if (currentMode !== 'ai') {
        console.warn('⚠️ 当前不是 AI 模式，先切换到 AI 模式');
        if (typeof window.amz_qalab_toggleRufusMode === 'function') {
            window.amz_qalab_toggleRufusMode();
            console.log('✅ 已切换到 AI 模式');
        }
    }
    
    // 检查报告数据
    if (!window.qalabState.reportData) {
        console.error('❌ 没有报告数据，请先加载报告');
        console.log('💡 提示: 点击「加载示例数据」然后「智能分析」');
        return false;
    }
    
    console.log('✅ 报告数据已加载');
    
    // 发送测试问题
    const testQuestion = 'Wie lange hält der Duft?';
    console.log('📝 测试问题:', testQuestion);
    
    const inputBox = document.getElementById('rufusInput');
    if (inputBox) {
        inputBox.value = testQuestion;
        console.log('✅ 问题已填入输入框');
        
        if (typeof window.amz_qalab_sendRufusQuestion === 'function') {
            console.log('🚀 发送问题...');
            window.amz_qalab_sendRufusQuestion();
            console.log('✅ 问题已发送，请观察控制台日志和 UI 变化');
            console.log('');
            console.log('🔍 关键日志标识:');
            console.log('  - [Rufus Simulator] 🤖 使用 AI 模式生成回答');
            console.log('  - [Rufus AI] 开始调用 LLM...');
            console.log('  - [Rufus AI] LLM 回答长度: XXX');
        } else {
            console.error('❌ amz_qalab_sendRufusQuestion 未注册');
            return false;
        }
    } else {
        console.error('❌ 找不到输入框');
        return false;
    }
    
    console.log('========================================');
    return true;
};

// 完整测试流程
window.fullTest = function() {
    console.log('\n🚀 开始完整测试流程...\n');
    
    // 1. 基础检查
    if (!quickCheck()) {
        console.error('❌ 基础检查失败，停止测试');
        return;
    }
    
    // 2. 等待 1 秒后测试切换
    setTimeout(() => {
        console.log('\n⏱️ 1 秒后测试模式切换...\n');
        testToggle();
        
        // 3. 再等待 2 秒后测试 AI
        setTimeout(() => {
            console.log('\n⏱️ 2 秒后测试 AI 回答...\n');
            testAI();
        }, 2000);
    }, 1000);
};

console.log('✅ 脚本加载完成，运行 quickCheck() 开始检查');
