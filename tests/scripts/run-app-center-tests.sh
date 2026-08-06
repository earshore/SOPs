#!/bin/bash
# tests/scripts/run-app-center-tests.sh
# ================================================================
# 🧪 工作台完整测试套件执行脚本
# 按照测试优先级顺序执行所有测试
# ================================================================

set -e

echo "🎯 工作台测试套件"
echo "════════════════════════════════════════════════════════════"
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 执行测试函数
run_test() {
  local test_name=$1
  local test_file=$2
  
  echo -e "${BLUE}▶ 测试: ${test_name}${NC}"
  echo "  文件: ${test_file}"
  echo ""
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  if npx playwright test "${test_file}" --reporter=list; then
    echo -e "${GREEN}✅ ${test_name} - 通过${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ ${test_name} - 失败${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  
  echo ""
  echo "────────────────────────────────────────────────────────────"
  echo ""
}

# ============================================================
# 第一阶段: 基础功能测试
# ============================================================
echo -e "${YELLOW}📋 第一阶段: 基础功能测试${NC}"
echo ""

run_test "工作台概览" "tests/e2e/app-center-overview.spec.ts"
run_test "Scraper 模块" "tests/e2e/scraper.spec.ts"
run_test "AI Analysis 模块" "tests/e2e/ai-analysis.spec.ts"
run_test "Promptlab 模块" "tests/e2e/promptlab.spec.ts"

# ============================================================
# 第二阶段: Keyword Hunter 测试
# ============================================================
echo -e "${YELLOW}📋 第二阶段: Keyword Hunter 测试${NC}"
echo ""

run_test "关键词输入" "tests/e2e/keyword-hunter-input.spec.ts"
run_test "关键词处理" "tests/e2e/keyword-hunter-process.spec.ts"
run_test "关键词分析" "tests/e2e/keyword-hunter-analysis.spec.ts"

# ============================================================
# 第三阶段: 集成测试
# ============================================================
echo -e "${YELLOW}📋 第三阶段: 集成测试${NC}"
echo ""

run_test "跨模块集成" "tests/e2e/app-center-integration.spec.ts"
run_test "完整用户流程" "tests/e2e/app-center-full-suite.spec.ts"

# ============================================================
# 第四阶段: 性能测试
# ============================================================
echo -e "${YELLOW}📋 第四阶段: 性能测试${NC}"
echo ""

run_test "Scraper 性能" "tests/e2e/scraper-performance.spec.ts"
run_test "AI Analysis 性能" "tests/e2e/ai-analysis-performance.spec.ts"
run_test "Promptlab 性能" "tests/e2e/promptlab-performance.spec.ts"

# ============================================================
# 测试结果汇总
# ============================================================
echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${BLUE}📊 测试结果汇总${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "  总测试数: ${TOTAL_TESTS}"
echo -e "  ${GREEN}通过: ${PASSED_TESTS}${NC}"
echo -e "  ${RED}失败: ${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}🎉 所有测试通过！${NC}"
  exit 0
else
  echo -e "${RED}⚠️  有 ${FAILED_TESTS} 个测试失败${NC}"
  echo ""
  echo "查看详细报告:"
  echo "  npx playwright show-report tests/playwright-report"
  exit 1
fi
