@echo off
REM 验证构建修复脚本
echo ========================================
echo 开始验证构建修复
echo ========================================

echo.
echo [1/4] 清理旧构建...
if exist dist rmdir /s /q dist

echo.
echo [2/4] 执行生产构建...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo 构建失败!
    exit /b 1
)

echo.
echo [3/4] 检查关键文件...
if not exist "dist/index.html" (
    echo 错误: dist/index.html 不存在!
    exit /b 1
)
if not exist "dist/assets/css/main-*.css" (
    echo 错误: 主 CSS 文件不存在!
    exit /b 1
)
if not exist "dist/assets/js/main-*.js" (
    echo 错误: 主 JS 文件不存在!
    exit /b 1
)

echo.
echo [4/4] 启动预览服务器...
echo 请在浏览器中访问 http://localhost:4173 验证页面显示
echo 按 Ctrl+C 停止服务器
call npm run preview

echo.
echo ========================================
echo 验证完成
echo ========================================
