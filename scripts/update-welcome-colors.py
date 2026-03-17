#!/usr/bin/env python3
"""
Welcome Banner 配色方案批量更新脚本

根据模块类别自动更新所有 welcome banner 的背景色配色，
确保文字可读性符合 WCAG AA 标准。

使用方法:
    python scripts/update-welcome-colors.py [--dry-run]

参数:
    --dry-run: 预览模式，不实际修改文件，仅显示将要进行的更改
"""

import re
import os
from pathlib import Path
from typing import Dict, Tuple

# 配色方案定义
COLOR_SCHEMES: Dict[str, Tuple[str, str]] = {
    # AI & 技术类 (蓝色系)
    'ai_tech': (
        'rgba(239, 246, 255, 0.95)',  # blue-50
        'rgba(219, 234, 254, 0.90)'   # blue-100
    ),

    # 分析类 (青色系)
    'analysis': (
        'rgba(236, 254, 255, 0.95)',  # cyan-50
        'rgba(207, 250, 254, 0.90)'   # cyan-100
    ),

    # 增长类 (翡翠绿)
    'growth': (
        'rgba(236, 253, 245, 0.95)',  # emerald-50
        'rgba(209, 250, 229, 0.90)'   # emerald-100
    ),

    # 安全类 (柔和橙色)
    'safety': (
        'rgba(255, 247, 237, 0.95)',  # orange-50
        'rgba(255, 237, 213, 0.90)'   # orange-100
    ),

    # 服务类 (淡紫色)
    'service': (
        'rgba(250, 245, 255, 0.95)',  # purple-50
        'rgba(243, 232, 255, 0.90)'   # purple-100
    ),

    # 后端供应链类 (琥珀金)
    'backend': (
        'rgba(255, 251, 235, 0.95)',  # amber-50
        'rgba(254, 243, 199, 0.90)'   # amber-100
    ),

    # 知识中心类 (石板灰)
    'knowledge': (
        'rgba(248, 250, 252, 0.95)',  # slate-50
        'rgba(241, 245, 249, 0.90)'   # slate-100
    ),

    # 探索类 (靛蓝)
    'explore': (
        'rgba(238, 242, 255, 0.95)',  # indigo-50
        'rgba(224, 231, 255, 0.90)'   # indigo-100
    ),
}

# 模块路径到配色方案的映射
MODULE_CATEGORY_MAP: Dict[str, str] = {
    # AI & 技术类
    'app_center/views/master_analysis/ai_analysis': 'ai_tech',
    'app_center/views/master_analysis/scraper': 'ai_tech',
    'app_center/views/master_analysis/promptlab': 'ai_tech',
    'app_center/views/master_analysis/qalab': 'ai_tech',
    'app_center/views/overview': 'ai_tech',

    # 分析类
    'app_center/views/keyword_hunter/analysis': 'analysis',
    'app_center/views/keyword_hunter/input': 'analysis',
    'app_center/views/keyword_hunter/process': 'analysis',

    # 增长类
    'sops/views/growth/competitor_monitoring': 'growth',
    'sops/views/growth/listing_seo': 'growth',
    'sops/views/growth/npi_tracker': 'growth',
    'sops/views/growth/ppc_advertising': 'growth',
    'sops/views/growth/promotion_submission': 'growth',
    'sops/views/growth/restricted_words': 'growth',

    # 安全类
    'sops/views/safety/account_security': 'safety',
    'sops/views/safety/brand_infringement': 'safety',
    'sops/views/safety/eu_gpsr_compliance': 'safety',
    'sops/views/safety/performance_notification': 'safety',
    'sops/views/safety/permission_management': 'safety',
    'sops/views/safety/product_compliance': 'safety',

    # 服务类
    'sops/views/service/email_templates': 'service',
    'sops/views/service/negative_review': 'service',
    'sops/views/service/qa_maintenance': 'service',

    # 后端供应链类
    'sops/views/backend/fba_shipping': 'backend',
    'sops/views/backend/inventory_replenishment': 'backend',
    'sops/views/backend/procurement_qc': 'backend',
    'sops/views/overview': 'backend',

    # 知识中心类
    'amz_hub/views/advanced/conversion_optimization': 'knowledge',
    'amz_hub/views/advanced/new_product_30days': 'knowledge',
    'amz_hub/views/knowledge/ecosystem': 'knowledge',
    'amz_hub/views/knowledge/eu_insights': 'knowledge',
    'amz_hub/views/knowledge/seo_strategy': 'knowledge',
    'amz_hub/views/overview': 'knowledge',
    'amz_hub/views/practice/marketing_calendar': 'knowledge',
    'amz_hub/views/practice/promotions': 'knowledge',
    'amz_hub/views/practice/quality_listing': 'knowledge',

    # 探索类
    'more/views/explore/agents': 'explore',
    'more/views/explore/prompts': 'explore',
    'more/views/explore/workflows': 'explore',
    'more/views/overview': 'explore',
}


def get_module_path_from_file(file_path: Path) -> str:
    """从文件路径提取模块路径"""
    parts = file_path.parts
    try:
        modules_idx = parts.index('modules')
        # 提取 modules 之后到 template.html 之前的路径
        module_parts = parts[modules_idx + 1:-1]
        return '/'.join(module_parts)
    except (ValueError, IndexError):
        return ''


def update_welcome_banner_colors(file_path: Path, dry_run: bool = False) -> bool:
    """
    更新单个文件中的 welcome banner 配色

    Args:
        file_path: HTML 文件路径
        dry_run: 是否为预览模式

    Returns:
        是否进行了更新
    """
    # 获取模块路径
    module_path = get_module_path_from_file(file_path)

    # 查找对应的配色方案
    category = MODULE_CATEGORY_MAP.get(module_path)
    if not category:
        print(f"[WARN] 未找到配色方案: {module_path}")
        return False

    color_scheme = COLOR_SCHEMES[category]

    # 读取文件内容
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"[ERROR] 读取文件失败 {file_path}: {e}")
        return False

    # 匹配 wb-container 的 style 属性（支持额外的 class）
    pattern = r'(<div class="[^"]*wb-container[^"]*"[^>]*style=")([^"]*)(">)'

    def replace_colors(match):
        prefix = match.group(1)
        old_style = match.group(2)
        suffix = match.group(3)

        # 构建新的 style 属性
        new_style = f"--wb-gradient-1: {color_scheme[0]}; --wb-gradient-2: {color_scheme[1]};"

        return f"{prefix}{new_style}{suffix}"

    # 检查是否有匹配
    if not re.search(pattern, content):
        print(f"[WARN] 未找到 wb-container: {file_path}")
        return False

    # 替换配色
    new_content = re.sub(pattern, replace_colors, content)

    # 检查是否有变化
    if new_content == content:
        print(f"[INFO] 无需更新: {module_path}")
        return False

    # 预览模式或实际写入
    if dry_run:
        print(f"[PREVIEW] {module_path}")
        print(f"   类别: {category}")
        print(f"   配色: {color_scheme[0]} -> {color_scheme[1]}")
    else:
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"[OK] 已更新: {module_path}")
            print(f"   类别: {category}")
        except Exception as e:
            print(f"[ERROR] 写入文件失败 {file_path}: {e}")
            return False

    return True


def main():
    """主函数"""
    import sys

    # 设置 UTF-8 编码输出（Windows 兼容）
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    # 检查是否为预览模式
    dry_run = '--dry-run' in sys.argv

    if dry_run:
        print("=" * 70)
        print("[PREVIEW] 预览模式 - 不会实际修改文件")
        print("=" * 70)
        print()
    else:
        print("=" * 70)
        print("[UPDATE] Welcome Banner 配色方案批量更新")
        print("=" * 70)
        print()

    # 获取项目根目录
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    modules_dir = project_root / 'src' / 'modules'

    if not modules_dir.exists():
        print(f"[ERROR] 模块目录不存在: {modules_dir}")
        return

    # 查找所有包含 wb-container 的 HTML 文件
    html_files = list(modules_dir.rglob('template.html'))

    # 过滤出包含 wb-container 的文件
    target_files = []
    for html_file in html_files:
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                if 'wb-container' in f.read():
                    target_files.append(html_file)
        except Exception:
            continue

    print(f"[INFO] 找到 {len(target_files)} 个包含 welcome banner 的文件\n")

    # 统计信息
    updated_count = 0
    skipped_count = 0
    error_count = 0

    # 批量更新
    for file_path in sorted(target_files):
        try:
            if update_welcome_banner_colors(file_path, dry_run):
                updated_count += 1
            else:
                skipped_count += 1
        except Exception as e:
            print(f"[ERROR] 处理文件出错 {file_path}: {e}")
            error_count += 1
        print()

    # 输出统计信息
    print("=" * 70)
    print("[SUMMARY] 更新统计")
    print("=" * 70)
    print(f"[OK] {'将要更新' if dry_run else '已更新'}: {updated_count} 个文件")
    print(f"[SKIP] 跳过: {skipped_count} 个文件")
    if error_count > 0:
        print(f"[ERROR] 错误: {error_count} 个文件")
    print()

    if dry_run:
        print("[TIP] 运行 'python scripts/update-welcome-colors.py' 执行实际更新")
    else:
        print("[DONE] 配色方案更新完成！")
        print("[TIP] 建议在浏览器中测试各个模块，确保文字清晰可读")


if __name__ == '__main__':
    main()
