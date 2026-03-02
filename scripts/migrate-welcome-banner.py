#!/usr/bin/env python3
"""
批量迁移 Welcome Banner 到所有模块页面
"""
import os
import re
from pathlib import Path

# 定义需要处理的页面配置
PAGES_CONFIG = {
    # SOPs 模块 - 运营与推广体系
    "src/modules/sops/views/growth/listing_seo/template.html": {
        "icon": "fa-magnifying-glass-chart",
        "title": "Listing 极致优化 (SEO) SOP",
        "description": "标题公式、五点埋词逻辑、A+排版规范、移动端确认 - 采集竞品 → 分析报告 → AI生成文案",
        "gradient": "#10b981, #059669",
        "meta": ["运营与推广体系", "SEO优化", "更新日期：2024-01"]
    },
    "src/modules/sops/views/growth/ppc_advertising/template.html": {
        "icon": "fa-chart-line",
        "title": "PPC 广告投放与优化 SOP",
        "description": "广告命名规范、否词筛选标准、ACOS目标调价策略 - 命名：ASIN_开启日期_匹配模式",
        "gradient": "#10b981, #059669",
        "meta": ["运营与推广体系", "PPC广告", "更新日期：2024-01"]
    },
    "src/modules/sops/views/growth/promotion_submission/template.html": {
        "icon": "fa-tags",
        "title": "促销活动提报 SOP",
        "description": "Coupon/PED/LD/7DD提报门槛、利润核算确保折后不亏 - 必须核算折后利润",
        "gradient": "#10b981, #059669",
        "meta": ["运营与推广体系", "促销活动", "更新日期：2024-01"]
    },
    "src/modules/sops/views/growth/competitor_monitoring/template.html": {
        "icon": "fa-binoculars",
        "title": "竞品监控与分析 SOP",
        "description": "每日记录竞品价格、BSR排名、Review变化 - 核心竞品日更跟踪",
        "gradient": "#10b981, #059669",
        "meta": ["运营与推广体系", "竞品分析", "更新日期：2024-01"]
    },
    "src/modules/sops/views/growth/restricted_words/template.html": {
        "icon": "fa-book-dead",
        "title": "欧洲本土化高危词库 SOP",
        "description": "115+ 合规词条、智能搜索、TIC认证要求 - Listing 合规必查",
        "gradient": "#10b981, #059669",
        "meta": ["运营与推广体系", "合规检查", "更新日期：2024-01"]
    },
    
    # SOPs 模块 - 供应链与物流体系
    "src/modules/sops/views/backend/fba_shipping/template.html": {
        "icon": "fa-truck-fast",
        "title": "FBA 发货标准操作 SOP",
        "description": "货件计划创建、箱标规范、装箱单核对、各站点限重 - 欧洲站单箱≤22kg",
        "gradient": "#f59e0b, #d97706",
        "meta": ["供应链与物流体系", "FBA发货", "更新日期：2024-01"]
    },
    "src/modules/sops/views/backend/procurement_qc/template.html": {
        "icon": "fa-clipboard-check",
        "title": "采购与质检 (QC) SOP",
        "description": "下单模板、AQL抽检标准、跌落测试、入库前贴标 - 配件完整性必检",
        "gradient": "#f59e0b, #d97706",
        "meta": ["供应链与物流体系", "质量管理", "更新日期：2024-01"]
    },
    "src/modules/sops/views/backend/inventory_replenishment/template.html": {
        "icon": "fa-cubes",
        "title": "库存预警与补货 SOP",
        "description": "安全库存公式、补货周期计算、周报输出规范 - 安全库存 = 日均销量 × 物流天数 × 1.5",
        "gradient": "#f59e0b, #d97706",
        "meta": ["供应链与物流体系", "库存管理", "更新日期：2024-01"]
    },
    
    # SOPs 模块 - 账号安全与风控体系
    "src/modules/sops/views/safety/account_security/template.html": {
        "icon": "fa-shield-halved",
        "title": "账号登录与环境安全 SOP",
        "description": "登录设备规范、IP隔离原则、紫鸟浏览器/VPS使用标准 - 红线：违规即清退",
        "gradient": "#ef4444, #dc2626",
        "meta": ["账号安全与风控体系", "环境安全", "更新日期：2024-01"]
    },
    "src/modules/sops/views/safety/permission_management/template.html": {
        "icon": "fa-user-lock",
        "title": "后台权限管理 SOP",
        "description": "子账号授权范围、最小权限原则、核心权限屏蔽 - Payments/Settings 权限仅限Boss",
        "gradient": "#ef4444, #dc2626",
        "meta": ["账号安全与风控体系", "权限管理", "更新日期：2024-01"]
    },
    "src/modules/sops/views/safety/brand_infringement/template.html": {
        "icon": "fa-trademark",
        "title": "品牌与侵权审核 SOP",
        "description": "USPTO查重流程、图片版权确认、侵权词库过滤 - Listing修改必过词库",
        "gradient": "#ef4444, #dc2626",
        "meta": ["账号安全与风控体系", "品牌保护", "更新日期：2024-01"]
    },
    "src/modules/sops/views/safety/performance_notification/template.html": {
        "icon": "fa-bell",
        "title": "绩效通知处理 SOP",
        "description": "\"小红旗\"处理流程、标准上报机制、禁止私自回复 - 工作群反馈 + 登记信息",
        "gradient": "#ef4444, #dc2626",
        "meta": ["账号安全与风控体系", "绩效管理", "更新日期：2024-01"]
    },
    "src/modules/sops/views/safety/product_compliance/template.html": {
        "icon": "fa-file-shield",
        "title": "敏感产品合规销售 SOP",
        "description": "欧洲敏感货合规要求：生物杀虫剂、电子3C、儿童玩具、化妆品 - 欧洲五国全覆盖",
        "gradient": "#ef4444, #dc2626",
        "meta": ["账号安全与风控体系", "产品合规", "更新日期：2024-01"]
    },
    "src/modules/sops/views/safety/eu_gpsr_compliance/template.html": {
        "icon": "fa-shield-dog",
        "title": "欧洲GPSR合规 SOP",
        "description": "EU General Product Safety Regulation 全面合规指南（2024-12-13生效） - 截止日：2024-12-13",
        "gradient": "#ef4444, #dc2626",
        "meta": ["账号安全与风控体系", "GPSR合规", "更新日期：2024-01"]
    },
    
    # SOPs 模块 - 客服与客户体验体系
    "src/modules/sops/views/service/email_templates/template.html": {
        "icon": "fa-envelope-open-text",
        "title": "邮件回复模板 SOP",
        "description": "物流延误、产品破损、退换货请求、发票索取场景库 - SLA: 24h内必回复",
        "gradient": "#3b82f6, #2563eb",
        "meta": ["客服与客户体验体系", "邮件模板", "更新日期：2024-01"]
    },
    "src/modules/sops/views/service/negative_review/template.html": {
        "icon": "fa-comment-dots",
        "title": "差评处理与分析 SOP",
        "description": "每日监控、VOC分析表登记、差评归类反馈供应链 - 质量问题/物流问题/描述不符",
        "gradient": "#3b82f6, #2563eb",
        "meta": ["客服与客户体验体系", "差评管理", "更新日期：2024-01"]
    },
    "src/modules/sops/views/service/qa_maintenance/template.html": {
        "icon": "fa-comments",
        "title": "QA 问答维护 SOP",
        "description": "定期检查前台QA、未回复问题官方解答 - 每周巡检一次",
        "gradient": "#3b82f6, #2563eb",
        "meta": ["客服与客户体验体系", "QA维护", "更新日期：2024-01"]
    },
    
    # Amazon 智库 - 知识早知道
    "src/modules/amz_hub/views/knowledge/eu_insights/template.html": {
        "icon": "fa-globe-europe",
        "title": "市场洞察",
        "description": "欧洲市场分析、消费者行为、品类趋势洞察 - 深入了解欧洲电商市场",
        "gradient": "#3b82f6, #6366f1",
        "meta": ["Amazon知识早知道", "市场分析", "更新日期：2024-01"]
    },
    "src/modules/amz_hub/views/knowledge/seo_strategy/template.html": {
        "icon": "fa-magnifying-glass-chart",
        "title": "SEO 策略",
        "description": "关键词研究、Listing优化、搜索排名提升策略 - 系统化SEO方法论",
        "gradient": "#3b82f6, #6366f1",
        "meta": ["Amazon知识早知道", "SEO策略", "更新日期：2024-01"]
    },
    "src/modules/amz_hub/views/knowledge/ecosystem/template.html": {
        "icon": "fa-network-wired",
        "title": "A10 & COSMO",
        "description": "Amazon搜索算法机制、排名因素、生态系统解析 - 理解Amazon算法核心",
        "gradient": "#3b82f6, #6366f1",
        "meta": ["Amazon知识早知道", "算法解析", "更新日期：2024-01"]
    },
    
    # Amazon 智库 - 入门实操宝典
    "src/modules/amz_hub/views/practice/quality_listing/template.html": {
        "icon": "fa-star",
        "title": "教你打造优质Listing",
        "description": "标题、五点、主图、A+页面全方位优化指南 - 从零开始打造高转化Listing",
        "gradient": "#10b981, #059669",
        "meta": ["入门实操宝典", "Listing优化", "更新日期：2024-01"]
    },
    "src/modules/amz_hub/views/practice/marketing_calendar/template.html": {
        "icon": "fa-calendar-alt",
        "title": "EU营销日历",
        "description": "欧洲全年营销节点、促销时机、备货计划 - 把握每个营销机会",
        "gradient": "#10b981, #059669",
        "meta": ["入门实操宝典", "营销日历", "更新日期：2024-01"]
    },
    "src/modules/amz_hub/views/practice/promotions/template.html": {
        "icon": "fa-gift",
        "title": "销售活动/促销工具",
        "description": "Coupon、Lightning Deal、Prime Day等促销工具使用 - 掌握各类促销工具",
        "gradient": "#10b981, #059669",
        "meta": ["入门实操宝典", "促销工具", "更新日期：2024-01"]
    },
    
    # Amazon 智库 - 运营提升全攻略
    "src/modules/amz_hub/views/advanced/new_product_30days/template.html": {
        "icon": "fa-rocket",
        "title": "新品30天极速突围",
        "description": "新品上架后30天的关键运营策略，快速提升排名与销量 - 新品冷启动完整方案",
        "gradient": "#a855f7, #9333ea",
        "meta": ["运营提升全攻略", "新品运营", "更新日期：2024-01"]
    },
    "src/modules/amz_hub/views/advanced/conversion_optimization/template.html": {
        "icon": "fa-chart-line",
        "title": "链接转化率低自查优化的五大方面",
        "description": "流量质量、价格策略、页面优化、Review管理、竞品分析 - 系统化提升转化率",
        "gradient": "#a855f7, #9333ea",
        "meta": ["运营提升全攻略", "转化优化", "更新日期：2024-01"]
    },
    
    # 更多模块 - 探索
    "src/modules/more/views/explore/agents/template.html": {
        "icon": "fa-robot",
        "title": "智能体",
        "description": "探索和使用各种智能体，提升工作效率和自动化水平 - AI 驱动的智能助手",
        "gradient": "#10b981, #059669",
        "meta": ["探索", "智能体", "建设中"]
    },
    "src/modules/more/views/explore/prompts/template.html": {
        "icon": "fa-message",
        "title": "提示词",
        "description": "管理和使用各种提示词模板，优化AI交互体验 - 提示词模板库",
        "gradient": "#10b981, #059669",
        "meta": ["探索", "提示词", "建设中"]
    },
    "src/modules/more/views/explore/workflows/template.html": {
        "icon": "fa-diagram-project",
        "title": "工作流",
        "description": "创建和管理自动化工作流，简化复杂业务流程 - 自动化流程管理",
        "gradient": "#10b981, #059669",
        "meta": ["探索", "工作流", "建设中"]
    },
}


def generate_welcome_banner(config):
    """生成 Welcome Banner HTML"""
    gradient_colors = config["gradient"].split(", ")
    meta_html = "\n                ".join([f"<span><i class=\"fas fa-tag mr-1\"></i>{meta}</span>" for meta in config["meta"]])
    
    return f"""    <!-- Welcome Banner -->
    <div class="wb-container" style="--wb-gradient-1: {gradient_colors[0]}; --wb-gradient-2: {gradient_colors[1]};">
        <div class="wb-orb wb-orb-1"></div>
        <div class="wb-orb wb-orb-2"></div>
        <div class="wb-content">
            <div class="wb-icon">
                <i class="fas {config['icon']}"></i>
            </div>
            <h1 class="wb-title">{config['title']}</h1>
            <p class="wb-description">{config['description']}</p>
            <div class="wb-meta">
                {meta_html}
            </div>
        </div>
    </div>"""


def migrate_page(file_path, config):
    """迁移单个页面"""
    if not os.path.exists(file_path):
        print(f"⚠️  文件不存在: {file_path}")
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查是否已经有 Welcome Banner
    if 'wb-container' in content:
        print(f"✓ 已应用: {file_path}")
        return True
    
    # 生成新的 Welcome Banner
    new_banner = generate_welcome_banner(config)
    
    # 查找并替换旧的 header
    # 匹配各种可能的 header 格式
    patterns = [
        # 匹配 <div class="mb-6"><div class="sop-detail-header ... 格式
        r'<div class="mb-6">\s*<div class="sop-detail-header[^>]*>.*?</div>\s*</div>',
        # 匹配 <header ... 格式
        r'<header[^>]*>.*?</header>',
        # 匹配 <!-- Header --> ... 格式
        r'<!-- Header[^>]*-->.*?</div>\s*</div>',
    ]
    
    replaced = False
    for pattern in patterns:
        if re.search(pattern, content, re.DOTALL):
            content = re.sub(pattern, new_banner, content, count=1, flags=re.DOTALL)
            replaced = True
            break
    
    if not replaced:
        print(f"⚠️  未找到匹配的 header: {file_path}")
        return False
    
    # 写回文件
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ 已迁移: {file_path}")
    return True


def main():
    """主函数"""
    print("开始批量迁移 Welcome Banner...\n")
    
    success_count = 0
    fail_count = 0
    
    for file_path, config in PAGES_CONFIG.items():
        if migrate_page(file_path, config):
            success_count += 1
        else:
            fail_count += 1
    
    print(f"\n迁移完成:")
    print(f"✓ 成功: {success_count} 个页面")
    print(f"✗ 失败: {fail_count} 个页面")


if __name__ == "__main__":
    main()
