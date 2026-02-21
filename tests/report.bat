@echo off
REM tests/report.bat
REM ================================================================
REM 📊 Playwright 测试报告管理器 - Windows 批处理脚本
REM ================================================================

setlocal enabledelayedexpansion

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="-h" goto help
if "%1"=="--help" goto help

REM 执行报告管理器
node tests/report-manager.js %*
goto end

:help
echo.
echo 📊 Playwright 测试报告管理器
echo.
echo 用法:
echo   tests\report.bat ^<命令^>
echo.
echo 命令:
echo   generate    生成测试报告摘要
echo   open        在浏览器中打开 HTML 报告
echo   summary     显示测试摘要
echo   clean       清理测试报告
echo   archive     归档当前报告
echo   serve       启动报告服务器
echo   help        显示帮助信息
echo.
echo 示例:
echo   tests\report.bat generate
echo   tests\report.bat open
echo   tests\report.bat summary
echo   tests\report.bat clean
echo   tests\report.bat archive
echo   tests\report.bat serve
echo.

:end
endlocal
