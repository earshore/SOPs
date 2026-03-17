import { exec } from 'child_process';
import { platform } from 'os';

// 尝试多个端口
const ports = [5173, 5174, 5175, 5176];
const maxRetries = 15;
const retryDelay = 500;

async function findWorkingPort() {
    console.log('🔍 正在检测开发服务器...');
    
    for (let retry = 0; retry < maxRetries; retry++) {
        for (const port of ports) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1000);
                
                const response = await fetch(`http://localhost:${port}`, {
                    method: 'HEAD',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok || response.status === 404) {
                    console.log(`✓ 检测到服务器运行在端口 ${port}`);
                    return port;
                }
            } catch (e) {
                // 端口不可用或超时，继续尝试
            }
        }
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    return null;
}

// 等待并打开浏览器
setTimeout(async () => {
    const workingPort = await findWorkingPort();
    
    if (!workingPort) {
        console.log('⚠️  无法检测到开发服务器，请手动访问 http://localhost:5173');
        return;
    }
    
    const url = `http://localhost:${workingPort}`;
    let cmd;
    
    if (platform() === 'win32') {
        // Windows: 使用 PowerShell 启动 Chrome
        cmd = `powershell -Command "Start-Process chrome.exe -ArgumentList '--incognito','${url}'"`;
    } else if (platform() === 'darwin') {
        // macOS
        cmd = `open -a "Google Chrome" --args --incognito ${url}`;
    } else {
        // Linux
        cmd = `google-chrome --incognito ${url} || chromium --incognito ${url} || xdg-open ${url}`;
    }
    
    exec(cmd, (error) => {
        if (error) {
            console.error('❌ 无法打开浏览器:', error.message);
            console.log('请手动访问:', url);
        } else {
            console.log(`✓ 已在 Chrome 无痕模式中打开: ${url}`);
        }
    });
}, 2000);
