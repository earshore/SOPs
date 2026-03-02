#!/usr/bin/env python3
"""
批量更新 Welcome Banner 徽章主题样式

根据页面类型自动添加对应的徽章类名和图标
"""

import re
from pathlib import Path
from typing import Dict, List, Tuple

# 页面分类映射表
PAGE_CATEGORIES = {
    # AI 智能类 (蓝色)
    'ai': {
        'class': 'wb-badge-ai',
        'pages': [
            'app_center/views/master_analysis/qalab',
        ],
        'icon_text_map': {
            'AI': 'fa-clipboard-question',
        }
    },
    
    # 增长运营类 (绿色)
    'growth': {
        'class': 'wb-badge-growth',
        'pages': [
            'sops/views/growth/npi_tracker',
            'sops/views/growth/ppc_advertising',
            'sops/views/growth/listing_seo',
            'sops/views/growth/promotion_submission',
        ],
        'icon_text_map': {
            'GROWTH': 'fa-chart-line',
            'SEO': 'fa-rocket',
            'NPI': 'fa-seedling',
            'PROMO': 'fa-tags',
        }
    },
    
    # 安全合规类 (红色)
    'safety': {
        'class': 'wb-badge-safety',
        'pages': [
            'sops/views/safety/account_security',
            'sops/views/safety/brand_infringement',
            'sops/views/safety/eu_gpsr_compliance',
            'sops/views/safety/performance_notification',
            'sops/views/safety/product_compliance',
            'sops/views/safety/permission_management',
        ],
        'icon_text_map': {
            'SAFE': 'fa-shield-halved',
            'SECURE': 'fa-lock',
            'ALERT': 'fa-exclamation-triangle',
            'COMPLIANCE': 'fa-certificate',
        }
    },
    
    # 客服服务类 (紫色)
    'service': {
        'class': 'wb-badge-service',
        'pages': [
            'sops/views/service/qa_maintenance',
            'sops/views/service/negative_review',
            'sops/views/service/email_templates',
        ],
        'icon_text_map': {
            'SERVICE': 'fa-headset',
            'SUPPORT': 'fa-comments',
            'EMAIL': 'fa-envelope',
        }
    },
    
    # 后端供应链类 (橙色)
    'supply': {
        'class': 'wb-badge-supply',
        'pages': [
            'sops/views/backend/inventory_replenishment',
            'sops/views/backend/fba_shipping',
            'sops/views/backend/procurement_qc',
        ],
        'icon_text_map': {
            'SUPPLY': 'fa-boxes',
            'SHIP': 'fa-truck',
            'STOCK': 'fa-warehouse',
        }
    },
    
    # 数据分析类 (青色)
    'analytics': {
        'class': 'wb-badge-analytics',
        'pages': [
            'sops/views/growth/competitor_monitoring',
            'sops/views/growth/restricted_words',
            'app_center/views/master_analysis/scraper',
        ],
        'icon_text_map': {
            'DATA': 'fa-chart-bar',
            'ANALYZE': 'fa-magnifying-glass-chart',
            'MONITOR': 'fa-magnifying-glass-chart',
        }
    },
    
    # 专业工具类 (琥珀色)
    'pro': {
        'class': 'wb-badge-pro',
        'pages': [
            'app_center/views/master_analysis/promptlab',
            'app_center/views/master_analysis/ai_analysis',
        ],
        'icon_text_map': {
            'MASTER': 'fa-flask',
            'PRO': 'fa-circle-up',
            'PREMIUM': 'fa-gem',
        }
    },
    
    # 概览导航类 (灰色)
    'hub': {
        'class': 'wb-badge-hub',
        'pages': [
            'app_center/views/overview',
            'sops/views/overview',
            'amz_hub/views/overview',
            'amz_hub/views/advanced/new_product_30days',
            'more/views/overview',
        ],
        'icon_text_map': {
            'HUB': 'fa-star',
            'DOCS': 'fa-book',
            'MORE': 'fa-grid',
            'GUIDE': 'fa-lightbulb',
        }
    },
}

# 特殊页面的自定义配置
SPECIAL_PAGES = {
    'app_center/views/keyword_hunter/input': {
        'keep_original': True  # 保持原有的 STEP 1 徽章
    },
    'app_center/views/keyword_hunter/process': {
        'keep_original': True  # 保持原有的 STEP 2 徽章
    },
    'app_center/views/keyword_hunter/analysis': {
        'keep_original': True  # 保持原有的 STEP 3 徽章
    },
}


def get_page_category(page_path: str) -> Tuple[str, Dict]:
    """根据页面路径获取分类信息"""
    for category, config in PAGE_CATEGORIES.items():
        for page in config['pages']:
            if page in page_path:
                return category, config
    return None, None


def get_badge_text_from_page(page_path: str) -> str:
    """根据页面路径推断徽章文字"""
    if 'npi_tracker' in page_path:
        return 'GROWTH'
    elif 'ppc_advertising' in page_path:
        return 'GROWTH'
    elif 'listing_seo' in page_path:
        return 'SEO'
    elif 'promotion_submission' in page_path:
        return 'PROMO'
    elif 'account_security' in page_path:
        return 'SAFE'
    elif 'brand_infringement' in page_path:
        return 'SAFE'
    elif 'eu_gpsr_compliance' in page_path:
        return 'COMPLIANCE'
    elif 'performance_notification' in page_path:
        return 'ALERT'
    elif 'product_compliance' in page_path:
        return 'SAFE'
    elif 'permission_management' in page_path:
        return 'SECURE'
    elif 'qa_maintenance' in page_path:
        return 'SERVICE'
    elif 'negative_review' in page_path:
        return 'SUPPORT'
    elif 'email_templates' in page_path:
        return 'EMAIL'
    elif 'inventory_replenishment' in page_path:
        return 'STOCK'
    elif 'fba_shipping' in page_path:
        return 'SHIP'
    elif 'procurement_qc' in page_path:
        return 'SUPPLY'
    elif 'competitor_monitoring' in page_path:
        return 'MONITOR'
    elif 'restricted_words' in page_path:
        return 'DATA'
    elif 'scraper' in page_path:
        return 'DATA'
    elif 'promptlab' in page_path:
        return 'MASTER'
    elif 'ai_analysis' in page_path:
        return 'PRO'
    elif 'qalab' in page_path:
        return 'AI'
    elif 'new_product_30days' in page_path:
        return 'GUIDE'
    elif 'overview' in page_path:
        if 'app_center' in page_path:
            return 'HUB'
        elif 'sops' in page_path:
            return 'DOCS'
        elif 'amz_hub' in page_path:
            return 'HUB'
        elif 'more' in page_path:
            return 'MORE'
    return 'AI'  # 默认


def update_badge_in_file(file_path: Path, dry_run: bool = False) -> bool:
    """更新单个文件中的徽章样式"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original_content = content
        
        # 检查是否是特殊页面
        page_path = str(file_path.relative_to(Path('src/modules')))
        if any(special in page_path for special in SPECIAL_PAGES.keys()):
            if SPECIAL_PAGES.get(page_path, {}).get('keep_original'):
                print(f"⏭️  跳过特殊页面: {file_path}")
                return False
        
        # 获取页面分类
        category, config = get_page_category(page_path)
        if not category:
            print(f"⚠️  未找到分类: {file_path}")
            return False
        
        badge_class = config['class']
        badge_text = get_badge_text_from_page(page_path)
        icon_class = config['icon_text_map'].get(badge_text, 'fa-sparkles')
        
        # 查找并更新徽章
        # 模式 1: <span class="wb-badge">
        pattern1 = r'<span class="wb-badge">\s*<i class="[^"]+"></i>AI\s*</span>'
        replacement1 = f'<span class="wb-badge {badge_class}">\n                    <i class="{icon_class}"></i>{badge_text}\n                </span>'
        
        if re.search(pattern1, content):
            content = re.sub(pattern1, replacement1, content)
            
            if content != original_content:
                if not dry_run:
                    file_path.write_text(content, encoding='utf-8')
                print(f"✅ 更新成功: {file_path}")
                print(f"   类别: {category} | 徽章: {badge_text} | 图标: {icon_class}")
                return True
        
        return False
        
    except Exception as e:
        print(f"❌ 处理失败 {file_path}: {e}")
        return False


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='批量更新 Welcome Banner 徽章主题样式')
    parser.add_argument('--dry-run', action='store_true', help='预览模式，不实际修改文件')
    args = parser.parse_args()
    
    print("=" * 60)
    print("Welcome Banner 徽章主题批量更新工具")
    print("=" * 60)
    print()
    
    if args.dry_run:
        print("🔍 预览模式 (不会修改文件)")
        print()
    
    # 查找所有需要更新的文件
    src_dir = Path('src/modules')
    template_files = list(src_dir.rglob('template.html'))
    
    print(f"📁 找到 {len(template_files)} 个模板文件")
    print()
    
    # 统计
    updated_count = 0
    skipped_count = 0
    
    # 处理每个文件
    for file_path in sorted(template_files):
        # 检查文件是否包含 wb-badge
        content = file_path.read_text(encoding='utf-8')
        if 'wb-badge' not in content:
            continue
        
        if update_badge_in_file(file_path, dry_run=args.dry_run):
            updated_count += 1
        else:
            skipped_count += 1
    
    # 输出统计
    print()
    print("=" * 60)
    print("📊 更新统计")
    print("=" * 60)
    print(f"✅ 成功更新: {updated_count} 个文件")
    print(f"⏭️  跳过: {skipped_count} 个文件")
    print()
    
    if args.dry_run:
        print("💡 提示: 移除 --dry-run 参数以实际应用更改")
    else:
        print("✨ 所有更新已完成！")


if __name__ == '__main__':
    main()
