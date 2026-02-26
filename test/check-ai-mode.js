/**
 * AI 模式配置检查脚本
 * 帮助用户诊断为什么看不到 AI 模式的调用过程
 */

console.log('🔍 Rufus AI 模式配置检查\n');
console.log('='.repeat(70));

console.log('\n📋 检查清单:\n');

const checks = [
    {
        name: '1. 代码实现检查',
        items: [
            { file: 'src/modules/app_center/views/master_analysis/qalab/rufusSimulator.ts', desc: 'AI 模式核心实现' },
            { file: 'src/modules/app_center/views/master_analysis/qalab/actions.ts', desc: '模式切换和问答逻辑' },
            { file: 'src/services/llmService.ts', desc: 'LLM 调用服务' }
        ]
    },
    {
        name: '2. UI 组件检查',
        items: [
            { selector: '#rufusModeToggle', desc: '模式切换按钮' },
            { selector: '#rufusMessages', desc: '消息容器' },
            { selector: '#rufusInput', desc: '输入框' }
        ]
    },
    {
        name: '3. 样式检查',
        items: [
            { class: '.mode-toggle', desc: '模式切换按钮样式' },
            { class: '.message-mode-badge', desc: '消息模式徽章样式' },
            { class: '.ai-mode', desc: 'AI 模式样式' }
        ]
    }
];

checks.forEach(check => {
    console.log(`\n${check.name}:`);
    check.items.forEach(item => {
        const key = item.file || item.selector || item.class;
        console.log(`  ✓ ${key}`);
        console.log(`    ${item.desc}`);
    });
});

console.log('\n' + '='.repeat(70));
console.log('\n🎯 用户操作指南:\n');

console.log('步骤 1: 配置 LLM 服务');
console.log('  1. 点击页面右上角的设置按钮 ⚙️');
console.log('  2. 进入「LLM 配置」选项卡');
console.log('  3. 点击「添加提供商」');
console.log('  4. 填写配置信息:');
console.log('     - 提供商名称: 如 OpenAI, Claude, DeepSeek 等');
console.log('     - API 端点: 如 https://api.openai.com/v1');
console.log('     - API Key: 您的 API 密钥');
console.log('     - 模型: 如 gpt-4, claude-3-sonnet 等');
console.log('  5. 点击「激活」按钮');
console.log('  6. 保存配置\n');

console.log('步骤 2: 使用 AI 模式');
console.log('  1. 返回 QA Lab 页面');
console.log('  2. 找到 Rufus AI 对话框');
console.log('  3. AI 模式已默认启用');
console.log('  4. 如果配置正确,会显示「AI 模式已就绪」提示\n');

console.log('步骤 3: 测试 AI 回答');
console.log('  1. 确保已加载分析报告(点击「智能分析」按钮)');
console.log('  2. 在 Rufus 输入框中输入问题,例如:');
console.log('     - "这个产品的持久度如何?"');
console.log('     - "香味是什么样的?"');
console.log('     - "性价比怎么样?"');
console.log('  3. 按回车或点击发送按钮');
console.log('  4. 观察以下 AI 模式特征:\n');

console.log('🤖 AI 模式的可见特征:');
console.log('  ✓ 思考状态显示「正在连接大模型...」');
console.log('  ✓ 思考状态显示「正在分析报告内容...」');
console.log('  ✓ 思考状态显示「正在生成智能回答...」');
console.log('  ✓ 消息头部显示「🤖 AI 模式」徽章');
console.log('  ✓ 回答完成后显示「AI 回答生成成功」提示');
console.log('  ✓ 回答内容更自然、更符合用户意图\n');



console.log('='.repeat(70));
console.log('\n🔍 调试方法:\n');

console.log('如果看不到 AI 模式的交互过程,请按 F12 打开浏览器开发者工具:\n');

console.log('1. 查看 Console 标签页,寻找以下日志:');
console.log('   [QALab] 模式切换: rule -> ai');
console.log('   [QALab] 🤖 使用 AI 模式生成回答');
console.log('   [Rufus AI] 开始生成 AI 回答');
console.log('   [Rufus AI] 活跃的 LLM 提供商: xxx');
console.log('   [Rufus AI] 开始调用 LLM...');
console.log('   [Rufus AI] LLM 回答长度: xxx\n');

console.log('2. 如果看到错误日志:');
console.log('   ❌ "未配置 LLM 服务" → 需要先配置 LLM');
console.log('   ❌ "LLM 配置不完整" → 检查 API Key 等配置');
console.log('   ❌ "API Key 认证失败" → API Key 可能无效');
console.log('   ❌ "网络请求失败" → 检查网络连接或代理设置\n');

console.log('3. 查看 Network 标签页:');
console.log('   - 筛选 XHR/Fetch 请求');
console.log('   - 查找发往 LLM API 端点的请求');
console.log('   - 检查请求状态码(200 表示成功)\n');

console.log('='.repeat(70));
console.log('\n💡 常见问题解决:\n');

console.log('问题 1: 点击模式切换按钮没有反应');
console.log('  解决: 检查浏览器控制台是否有 JavaScript 错误\n');

console.log('问题 2: 切换到 AI 模式后提示"未配置 LLM"');
console.log('  解决: 按照步骤 1 配置 LLM 服务\n');



console.log('问题 4: 看不到"正在连接大模型"等状态提示');
console.log('  解决: 清除浏览器缓存(Ctrl+Shift+Delete),硬刷新(Ctrl+F5)\n');

console.log('问题 5: LLM 调用超时');
console.log('  解决: 检查网络连接,或增加超时时间配置\n');

console.log('='.repeat(70));
console.log('\n✨ 验证成功的标志:\n');

console.log('当您看到以下现象时,说明 AI 模式工作正常:');
console.log('  1. ✅ 思考过程显示三个阶段的状态消息');
console.log('  2. ✅ 消息头部有「🤖 AI 模式」徽章(紫色)');
console.log('  3. ✅ 控制台有完整的 LLM 调用日志');
console.log('  4. ✅ 回答内容更智能、更符合上下文');
console.log('  5. ✅ 显示「AI 回答生成成功」的成功提示\n');

console.log('='.repeat(70));
console.log('\n📞 如果问题仍未解决:\n');

console.log('请提供以下信息以便进一步诊断:');
console.log('  1. 浏览器控制台的完整日志(Console 标签页)');
console.log('  2. 网络请求记录(Network 标签页截图)');
console.log('  3. LLM 配置信息(隐藏 API Key)');
console.log('  4. 具体的错误提示信息');
console.log('  5. 使用的浏览器版本\n');

console.log('='.repeat(70));
console.log('\n✅ 检查脚本执行完成!\n');
console.log('💡 提示: 这是一个指导文档,请按照上述步骤在浏览器中操作\n');
