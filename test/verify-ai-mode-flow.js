/**
 * AI 模式全流程验证脚本
 * 通过日志分析验证模式切换和 AI 调用是否生效
 * 
 * 使用方法：
 * 1. 在浏览器中打开 QA Lab 页面
 * 2. 打开浏览器开发者工具 (F12)
 * 3. 切换到 Console 标签页
 * 4. 将此脚本复制粘贴到控制台并执行
 * 5. 按照提示进行操作
 */

(function() {
    'use strict';
    
    console.log('%c='.repeat(80), 'color: #6366f1; font-weight: bold');
    console.log('%c🔍 Rufus AI 模式全流程验证工具', 'color: #6366f1; font-size: 16px; font-weight: bold');
    console.log('%c='.repeat(80), 'color: #6366f1; font-weight: bold');
    console.log('');
    
    // 验证状态
    const verificationState = {
        moduleLoaded: false,
        stateExists: false,
        simulatorExists: false,
        currentMode: null,
        llmConfigured: false,
        modeToggleWorks: false,
        aiCallWorks: false,
        logs: []
    };
    
    // 日志收集器
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    
    function captureLog(level, args) {
        const message = Array.from(args).map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        
        verificationState.logs.push({
            level,
            message,
            timestamp: Date.now()
        });
    }
    
    // 拦截日志
    console.log = function(...args) {
        captureLog('log', args);
        originalConsoleLog.apply(console, args);
    };
    
    console.warn = function(...args) {
        captureLog('warn', args);
        originalConsoleWarn.apply(console, args);
    };
    
    console.error = function(...args) {
        captureLog('error', args);
        originalConsoleError.apply(console, args);
    };
    
    // 步骤 1: 检查模块加载状态
    console.log('%c\n📋 步骤 1: 检查模块加载状态', 'color: #10b981; font-weight: bold; font-size: 14px');
    console.log('-'.repeat(80));
    
    try {
        // 检查 qalabState
        if (typeof window.qalabState !== 'undefined') {
            verificationState.stateExists = true;
            verificationState.currentMode = window.qalabState?.rufusMode || 'unknown';
            console.log('✅ qalabState 已加载');
            console.log('   当前模式:', verificationState.currentMode);
        } else {
            console.error('❌ qalabState 未找到');
        }
        
        // 检查 rufusSimulator
        if (typeof window.rufusSimulator !== 'undefined') {
            verificationState.simulatorExists = true;
            console.log('✅ rufusSimulator 已加载');
        } else {
            console.error('❌ rufusSimulator 未找到');
        }
        
        // 检查 DOM 元素
        const rufusMessages = document.getElementById('rufusMessages');
        const rufusInput = document.getElementById('rufusInput');
        const rufusModeToggle = document.getElementById('rufusModeToggle');
        
        if (rufusMessages) {
            console.log('✅ Rufus 消息容器已加载');
        } else {
            console.error('❌ Rufus 消息容器未找到');
        }
        
        if (rufusInput) {
            console.log('✅ Rufus 输入框已加载');
        } else {
            console.error('❌ Rufus 输入框未找到');
        }
        
        if (rufusModeToggle) {
            console.log('✅ 模式切换按钮已加载');
            console.log('   按钮文本:', rufusModeToggle.textContent.trim());
            console.log('   按钮类名:', rufusModeToggle.className);
        } else {
            console.error('❌ 模式切换按钮未找到');
        }
        
        verificationState.moduleLoaded = rufusMessages && rufusInput && rufusModeToggle;
        
    } catch (error) {
        console.error('❌ 模块检查失败:', error);
    }
    
    // 步骤 2: 检查 LLM 配置
    console.log('%c\n📋 步骤 2: 检查 LLM 配置状态', 'color: #10b981; font-weight: bold; font-size: 14px');
    console.log('-'.repeat(80));
    
    try {
        // 尝试从 localStorage 读取 LLM 配置
        const llmActiveProvider = localStorage.getItem('llm_active_provider');
        
        if (llmActiveProvider) {
            console.log('✅ 检测到活跃的 LLM 提供商:', llmActiveProvider);
            
            const llmConfigKey = `llm_config_${llmActiveProvider}`;
            const llmConfigStr = localStorage.getItem(llmConfigKey);
            
            if (llmConfigStr) {
                try {
                    const llmConfig = JSON.parse(llmConfigStr);
                    console.log('✅ LLM 配置已加载');
                    console.log('   提供商:', llmConfig.provider || 'N/A');
                    console.log('   端点:', llmConfig.endpoint || 'N/A');
                    console.log('   模型:', llmConfig.model || 'N/A');
                    console.log('   API Key:', llmConfig.apiKey ? `${llmConfig.apiKey.substring(0, 10)}...` : 'N/A');
                    
                    if (llmConfig.apiKey && llmConfig.endpoint && llmConfig.model) {
                        verificationState.llmConfigured = true;
                        console.log('✅ LLM 配置完整');
                    } else {
                        console.warn('⚠️ LLM 配置不完整');
                    }
                } catch (e) {
                    console.error('❌ LLM 配置解析失败:', e);
                }
            } else {
                console.warn('⚠️ 未找到 LLM 配置数据');
            }
        } else {
            console.warn('⚠️ 未配置 LLM 提供商');
            console.log('   请在设置中配置 LLM 服务');
        }
    } catch (error) {
        console.error('❌ LLM 配置检查失败:', error);
    }
    
    // 步骤 3: 测试模式切换
    console.log('%c\n📋 步骤 3: 测试模式切换功能', 'color: #10b981; font-weight: bold; font-size: 14px');
    console.log('-'.repeat(80));
    
    const testModeToggle = () => {
        const rufusModeToggle = document.getElementById('rufusModeToggle');
        
        if (!rufusModeToggle) {
            console.error('❌ 模式切换按钮未找到，无法测试');
            return;
        }
        
        console.log('🔄 开始测试模式切换...');
        
        // 记录初始状态
        const initialMode = window.qalabState?.rufusMode || 'unknown';
        console.log('   初始模式:', initialMode);
        
        // 清空日志
        verificationState.logs = [];
        
        // 模拟点击
        console.log('   模拟点击模式切换按钮...');
        rufusModeToggle.click();
        
        // 等待一小段时间让事件处理完成
        setTimeout(() => {
            const newMode = window.qalabState?.rufusMode || 'unknown';
            console.log('   切换后模式:', newMode);
            
            // 检查模式是否改变
            if (newMode !== initialMode) {
                console.log('✅ 模式切换成功:', initialMode, '->', newMode);
                verificationState.modeToggleWorks = true;
                
                // 检查相关日志
                const modeSwitchLogs = verificationState.logs.filter(log => 
                    log.message.includes('模式切换') || 
                    log.message.includes('QALab') ||
                    log.message.includes('Rufus')
                );
                
                if (modeSwitchLogs.length > 0) {
                    console.log('✅ 检测到模式切换日志:');
                    modeSwitchLogs.forEach(log => {
                        console.log(`   [${log.level}] ${log.message}`);
                    });
                } else {
                    console.warn('⚠️ 未检测到模式切换日志');
                }
                
                // 检查 UI 更新
                const buttonText = rufusModeToggle.textContent.trim();
                const buttonClass = rufusModeToggle.className;
                console.log('   按钮文本:', buttonText);
                console.log('   按钮类名:', buttonClass);
                
                if (newMode === 'ai' && buttonClass.includes('ai-mode')) {
                    console.log('✅ UI 已更新为 AI 模式');
                } else {
                    console.warn('⚠️ UI 状态与模式不匹配');
                }
                
            } else {
                console.error('❌ 模式切换失败，模式未改变');
            }
            
            // 切换回初始模式
            console.log('   切换回初始模式...');
            rufusModeToggle.click();
            
            setTimeout(() => {
                const finalMode = window.qalabState?.rufusMode || 'unknown';
                if (finalMode === initialMode) {
                    console.log('✅ 已恢复到初始模式:', finalMode);
                }
            }, 500);
            
        }, 500);
    };
    
    testModeToggle();
    
    // 步骤 4: 分析日志模式
    console.log('%c\n📋 步骤 4: 日志模式分析', 'color: #10b981; font-weight: bold; font-size: 14px');
    console.log('-'.repeat(80));
    
    setTimeout(() => {
        console.log('📊 日志统计:');
        console.log('   总日志数:', verificationState.logs.length);
        
        const logsByLevel = {
            log: verificationState.logs.filter(l => l.level === 'log').length,
            warn: verificationState.logs.filter(l => l.level === 'warn').length,
            error: verificationState.logs.filter(l => l.level === 'error').length
        };
        
        console.log('   普通日志:', logsByLevel.log);
        console.log('   警告日志:', logsByLevel.warn);
        console.log('   错误日志:', logsByLevel.error);
        
        // 关键日志检查
        const keyLogs = {
            modeSwitch: verificationState.logs.filter(l => l.message.includes('模式切换')),
            rufusInit: verificationState.logs.filter(l => l.message.includes('初始化') && l.message.includes('Rufus')),
            llmCall: verificationState.logs.filter(l => l.message.includes('LLM') || l.message.includes('大模型')),
            aiMode: verificationState.logs.filter(l => l.message.includes('AI 模式'))
        };
        
        console.log('\n🔍 关键日志检测:');
        console.log('   模式切换日志:', keyLogs.modeSwitch.length, '条');
        console.log('   Rufus 初始化日志:', keyLogs.rufusInit.length, '条');
        console.log('   LLM 调用日志:', keyLogs.llmCall.length, '条');
        console.log('   AI 模式日志:', keyLogs.aiMode.length, '条');
        
        if (keyLogs.modeSwitch.length > 0) {
            console.log('\n📝 模式切换日志详情:');
            keyLogs.modeSwitch.forEach(log => {
                console.log(`   [${log.level}] ${log.message}`);
            });
        }
        
    }, 1500);
    
    // 步骤 5: 生成验证报告
    console.log('%c\n📋 步骤 5: 生成验证报告', 'color: #10b981; font-weight: bold; font-size: 14px');
    console.log('-'.repeat(80));
    
    setTimeout(() => {
        console.log('\n');
        console.log('%c='.repeat(80), 'color: #6366f1; font-weight: bold');
        console.log('%c📊 验证报告', 'color: #6366f1; font-size: 16px; font-weight: bold');
        console.log('%c='.repeat(80), 'color: #6366f1; font-weight: bold');
        console.log('');
        
        const results = [
            { name: '模块加载', status: verificationState.moduleLoaded },
            { name: '状态管理', status: verificationState.stateExists },
            { name: '模拟器实例', status: verificationState.simulatorExists },
            { name: 'LLM 配置', status: verificationState.llmConfigured },
            { name: '模式切换', status: verificationState.modeToggleWorks }
        ];
        
        results.forEach(result => {
            const icon = result.status ? '✅' : '❌';
            const color = result.status ? 'color: #10b981' : 'color: #ef4444';
            console.log(`%c${icon} ${result.name}`, color);
        });
        
        console.log('');
        console.log('%c当前状态:', 'font-weight: bold');
        console.log('  模式:', verificationState.currentMode);
        console.log('  LLM:', verificationState.llmConfigured ? '已配置' : '未配置');
        
        const allPassed = results.every(r => r.status);
        
        console.log('');
        if (allPassed) {
            console.log('%c🎉 所有检查通过！AI 模式已正确配置', 'color: #10b981; font-size: 14px; font-weight: bold');
        } else {
            console.log('%c⚠️ 部分检查未通过，请查看上方详情', 'color: #f59e0b; font-size: 14px; font-weight: bold');
        }
        
        console.log('');
        console.log('%c下一步操作建议:', 'font-weight: bold');
        
        if (!verificationState.llmConfigured) {
            console.log('  1. 配置 LLM 服务（设置 -> LLM 配置）');
        }
        
        if (verificationState.modeToggleWorks) {
            console.log('  2. 加载分析报告（点击「智能分析」按钮）');
            console.log('  3. 切换到 AI 模式（点击模式切换按钮）');
            console.log('  4. 输入问题测试 AI 回答');
        } else {
            console.log('  2. 刷新页面重试（Ctrl+F5）');
            console.log('  3. 检查浏览器控制台错误信息');
        }
        
        console.log('');
        console.log('%c='.repeat(80), 'color: #6366f1; font-weight: bold');
        
        // 恢复原始日志函数
        console.log = originalConsoleLog;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
        
        // 提供交互式测试函数
        window.testAIMode = function() {
            console.log('%c\n🧪 开始 AI 模式交互测试', 'color: #a855f7; font-size: 14px; font-weight: bold');
            console.log('-'.repeat(80));
            
            const rufusModeToggle = document.getElementById('rufusModeToggle');
            const rufusInput = document.getElementById('rufusInput');
            
            if (!rufusModeToggle || !rufusInput) {
                console.error('❌ 必要元素未找到');
                return;
            }
            
            // 确保在 AI 模式
            if (window.qalabState?.rufusMode !== 'ai') {
                console.log('🔄 切换到 AI 模式...');
                rufusModeToggle.click();
                
                setTimeout(() => {
                    if (window.qalabState?.rufusMode === 'ai') {
                        console.log('✅ 已切换到 AI 模式');
                        sendTestQuestion();
                    } else {
                        console.error('❌ 切换到 AI 模式失败');
                    }
                }, 500);
            } else {
                sendTestQuestion();
            }
            
            function sendTestQuestion() {
                console.log('📝 发送测试问题...');
                
                const testQuestion = '这个产品的持久度如何？';
                rufusInput.value = testQuestion;
                
                console.log('   问题:', testQuestion);
                console.log('   等待回答...');
                console.log('   请观察以下特征:');
                console.log('   1. 思考状态显示「正在连接大模型...」');
                console.log('   2. 思考状态显示「正在分析报告内容...」');
                console.log('   3. 思考状态显示「正在生成智能回答...」');
                console.log('   4. 消息头部显示「🤖 AI 模式」徽章');
                console.log('   5. 控制台显示 LLM 调用日志');
                
                // 触发发送
                const sendBtn = document.querySelector('[data-action="amz_qalab_sendRufusQuestion"]');
                if (sendBtn) {
                    sendBtn.click();
                } else {
                    // 尝试触发回车事件
                    const event = new KeyboardEvent('keydown', { key: 'Enter' });
                    rufusInput.dispatchEvent(event);
                }
            }
        };
        
        console.log('\n💡 提示: 运行 testAIMode() 进行交互式 AI 模式测试');
        console.log('');
        
    }, 2000);
    
})();
