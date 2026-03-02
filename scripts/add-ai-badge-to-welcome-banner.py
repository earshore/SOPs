#!/usr/bin/env python3
"""
为简化版 Welcome Banner 添加 AI 徽章
"""

import re
from pathlib import Path

# 需要处理的文件列表
files_to_update = [
    # SOPs 流程中心
    "src/modules/sops/views/overview/template.html",
    "src/modules/sops/views/service/qa_maintenance/template.html",
    "src/modules/sops/views/service/email_templates/template.html",
    "src/modules/sops/views/service/negative_review/template.html",
    "src/modules/sops/views/growth/promotion_submission/template.html",
    "src/modules/sops/views/growth/listing_seo/template.html",
    "src/modules/sops/views/growth/restricted_words/template.html",
    "src/modules/sops/views/growth/ppc_advertising/template.html",
    "src/modules/sops/views/growth/npi_tracker/template.html",
    "src/modules/sops/views/growth/competitor_monitoring/template.html",
    "src/modules/sops/views/backend/inventory_replenishment/template.html",
    "src/modules/sops/views/backend/fba_shipping/template.html",
    "src/modules/sops/views/backend/procurement_qc/template.html",
    "src/modules/sops/views/safety/account_security/template.html",
    "src/modules/sops/views/safety/product_compliance/template.html",
    "src/modules/sops/views/safety/brand_infringement/template.html",
    "src/modules/sops/views/safety/eu_gpsr_compliance/template.html",
    "src/modules/sops/views/safety/performance_notification/template.html",
    "src/modules/sops/views/safety/permission_management/template.html",
    
    # Amazon 智库
    "src/modules/amz_hub/views/overview/template.html",
    "src/modules/amz_hub/views/advanced/new_product_30days/template.html",
    "src/modules/amz_hub/views/advanced/product_lifecycle/template.html",
    "src/modules/amz_hub/views/advanced/competitor_analysis/template.html",
    "src/modules/amz_hub/views/basic/keyword_research/template.html",
    "src/modules/amz_hub/views/basic/listing_optimization/template.html",
    "src/modules/amz_hub/views/basic/review_management/template.html",
    "src/modules/amz_hub/views/tools/asin_lookup/template.html",
    "src/modules/amz_hub/views/tools/fee_calculator/template.html",
    "src/modules/amz_hub/views/tools/keyword_tracker/template.html",
    
    # 更多模块
    "src/modules/more/views/overview/template.html",
    "src/modules/more/views/settings/account/template.html",
    "src/modules/more/views/settings/team/template.html",
    "src/modules/more/views/settings/notifications/template.html",
    "src/modules/more/views/help/documentation/template.html",
    "src/modules/more/views/help/faq/template.html",
    "src/modules/more/views/help/contact/template.html",
    "src/modules/more/views/about/changelog/template.html",
]


def add_ai_badge_to_title(content: str) -> str:
    """
    在 <h1 class="wb-title"> 后面添加 AI 徽章
    
    原始:
    <h1 class="wb-title">标题文本</h1>
    
    修改后:
    <div class="wb-title-row">
        <h1 class="wb-title">标题文本</h1>
        <span class="wb-badge">
            <i class="fa-solid fa-sparkles"></i>AI
        </span>
    </div>
    """
    
    # 匹配 <h1 class="wb-title">...</h1>
    pattern = r'(<h1 class="wb-title">)(.*?)(</h1>)'
    
    def replace_func(match):
        opening_tag = match.group(1)
        title_text = match.group(2)
        closing_tag = match.group(3)
        
        # 构建新的HTML结构
        new_html = f'''<div class="wb-title-row">
                {opening_tag}{title_text}{closing_tag}
                <span class="wb-badge">
                    <i class="fa-solid fa-sparkles"></i>AI
                </span>
            </div>'''
        
        return new_html
    
    # 执行替换
    modified_content = re.sub(pattern, replace_func, content, flags=re.DOTALL)
    
    return modified_content


def process_file(file_path: str) -> bool:
    """处理单个文件"""
    path = Path(file_path)
    
    if not path.exists():
        print(f"⚠️  文件不存在: {file_path}")
        return False
    
    try:
        # 读取文件
        content = path.read_text(encoding='utf-8')
        
        # 检查是否已经有 wb-title-row (避免重复处理)
        if 'wb-title-row' in content:
            print(f"⏭️  已处理过: {file_path}")
            return False
        
        # 检查是否有 wb-title
        if 'wb-title' not in content:
            print(f"⚠️  未找到 wb-title: {file_path}")
            return False
        
        # 添加 AI 徽章
        modified_content = add_ai_badge_to_title(content)
        
        # 检查是否有修改
        if modified_content == content:
            print(f"⚠️  未发生修改: {file_path}")
            return False
        
        # 写回文件
        path.write_text(modified_content, encoding='utf-8')
        print(f"✅ 已添加 AI 徽章: {file_path}")
        return True
        
    except Exception as e:
        print(f"❌ 处理失败 {file_path}: {e}")
        return False


def main():
    """主函数"""
    print("=" * 80)
    print("为简化版 Welcome Banner 添加 AI 徽章")
    print("=" * 80)
    print()
    
    success_count = 0
    total_count = len(files_to_update)
    
    for file_path in files_to_update:
        if process_file(file_path):
            success_count += 1
    
    print()
    print("=" * 80)
    print(f"处理完成: {success_count}/{total_count} 个文件已更新")
    print("=" * 80)


if __name__ == "__main__":
    main()
