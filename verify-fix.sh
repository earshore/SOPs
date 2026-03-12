#!/bin/bash

echo "=================================="
echo "EU营销日历下拉框修复验证"
echo "=================================="
echo ""

echo "📋 检查修改的文件..."
echo ""

# 检查文件是否存在
files=(
    "src/modules/amz_hub/views/practice/marketing_calendar/template.html"
    "src/modules/amz_hub/views/practice/marketing_calendar/index.ts"
    "src/modules/amz_hub/amz_hub_style.css"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (文件不存在)"
    fi
done

echo ""
echo "🔍 检查关键修复内容..."
echo ""

# 检查CSS修复
if grep -q "position: fixed" "src/modules/amz_hub/views/practice/marketing_calendar/template.html"; then
    echo "✅ CSS: position 已改为 fixed"
else
    echo "❌ CSS: position 未改为 fixed"
fi

if grep -q "z-index: 99999" "src/modules/amz_hub/views/practice/marketing_calendar/template.html"; then
    echo "✅ CSS: z-index 已提升至 99999"
else
    echo "❌ CSS: z-index 未提升"
fi

# 检查JavaScript修复
if grep -q "getBoundingClientRect" "src/modules/amz_hub/views/practice/marketing_calendar/index.ts"; then
    echo "✅ JS: 已添加动态位置计算"
else
    echo "❌ JS: 未添加动态位置计算"
fi

if grep -q "window.*resize" "src/modules/amz_hub/views/practice/marketing_calendar/index.ts"; then
    echo "✅ JS: 已添加 resize 事件监听"
else
    echo "❌ JS: 未添加 resize 事件监听"
fi

if grep -q "window.*scroll" "src/modules/amz_hub/views/practice/marketing_calendar/index.ts"; then
    echo "✅ JS: 已添加 scroll 事件监听"
else
    echo "❌ JS: 未添加 scroll 事件监听"
fi

# 检查容器样式
if grep -q "overflow: visible" "src/modules/amz_hub/amz_hub_style.css"; then
    echo "✅ CSS: 容器 overflow 已设置为 visible"
else
    echo "❌ CSS: 容器 overflow 未设置"
fi

echo ""
echo "📝 测试文件检查..."
echo ""

test_files=(
    "test-standalone-dropdown.html"
    "test-eu-calendar-dropdown-fix.html"
    "test-dropdown-automated.js"
    "docs/EU-CALENDAR-DROPDOWN-FIX.md"
    "EU-CALENDAR-DROPDOWN-FIX-README.md"
    "DROPDOWN-FIX-CHECKLIST.md"
)

for file in "${test_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "⚠️  $file (可选文件)"
    fi
done

echo ""
echo "=================================="
echo "✅ 代码修复检查完成"
echo "=================================="
echo ""
echo "📌 下一步操作："
echo "1. 打开 test-standalone-dropdown.html 进行独立测试"
echo "2. 或启动开发服务器: npm run dev"
echo "3. 访问实际页面进行最终验证"
echo ""
