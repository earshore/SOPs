@echo off
REM ================================================================
REM 🎭 Playwright 安装脚本 (Windows)
REM ================================================================

echo.
echo ========================================
echo   Playwright 安装向导
echo ========================================
echo.

echo [1/3] 检查 Node.js 版本...
node --version
if errorlevel 1 (
    echo 错误: 未找到 Node.js
    echo 请先安装 Node.js ^>= 18.0.0
    pause
    exit /b 1
)

echo.
echo [2/3] 安装 Playwright 依赖...
call npm install @playwright/test --save-dev
if errorlevel 1 (
    echo 错误: 安装失败
    pause
    exit /b 1
)

echo.
echo [3/3] 安装 Playwright 浏览器...
call npx playwright install
if errorlevel 1 (
    echo 错误: 浏览器安装失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 下一步:
echo   1. 启动开发服务器: npm run dev
echo   2. 运行环境检查: npm run playwright:check
echo   3. 运行启动测试: npm run test:startup
echo.

pause
