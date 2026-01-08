// 1. 欧洲国家画像数据
export const AMZ_COUNTRY_DATA = {
    // --- 成熟大站点 ---
    'de': { 
        name: '德国', 
        traits: '严谨、注重参数、低退货容忍度、环保意识极强。', 
        tips: '文案避免空洞形容词，强调TUV认证、保修条款和具体材质参数。Review中常见抱怨点为物流包装和说明书不清晰。', 
        radarData: [90, 85, 40, 60, 95] 
    },
    'uk': { 
        name: '英国', 
        traits: '礼貌、幽默、价格敏感度中等、重视配送时效。', 
        tips: '使用英式拼写 (Colour, Organise)。文案语调可适当轻松。特别关注 Prime 配送标识。', 
        radarData: [70, 60, 80, 70, 75] 
    },
    'fr': { 
        name: '法国', 
        traits: '追求美感、感性消费、重视母语纯正度。', 
        tips: '图片审美必须高。绝对不能使用机翻法语，法国人对语言错误容忍度极低。包装设计很重要。', 
        radarData: [75, 50, 65, 90, 60] 
    },
    'it': { 
        name: '意大利', 
        traits: '热情、重视设计感、价格敏感度较高。', 
        tips: '强调产品的时尚感和设计风格。客户服务回复速度要快。', 
        radarData: [60, 40, 85, 80, 50] 
    },
    'es': { 
        name: '西班牙', 
        traits: '价格极其敏感、喜欢促销、家庭观念重。', 
        tips: '强调性价比 (Value for money)。促销活动和Coupon效果最好。', 
        radarData: [50, 30, 95, 60, 55] 
    },

    // --- 新兴/拓展站点 (已补充) ---
    'nl': { 
        name: '荷兰', 
        traits: '务实直爽、英语极好但偏好母语、精打细算、不仅看价格也看质量。', 
        tips: '物流必须快（对标本土Bol.com）。文案要直接（No Nonsense），强调环保和实用性。虽然有钱，但非常喜欢比价。', 
        radarData: [80, 80, 85, 65, 85] 
    },
    'se': { 
        name: '瑞典', 
        traits: '高信任社会、极度环保主义、偏好极简北欧风、高客单价接受度。', 
        tips: '产品必须符合可持续发展标准。设计风格需简洁冷淡。任何隐形费用都会导致差评。', 
        radarData: [85, 90, 45, 85, 90] 
    },
    'pl': { 
        name: '波兰', 
        traits: '电商发展极快、价格敏感度极高、年轻化。', 
        tips: '主要竞争对手是Allegro。低价策略渗透效果好。必须使用波兰语客服，不要试图用英语沟通。', 
        radarData: [55, 35, 90, 50, 60] 
    },
    'be': { 
        name: '比利时', 
        traits: '语言复杂（荷/法双语）、生活标准高、低调谦逊。', 
        tips: '必须提供双语（法/荷）Listing和说明书。相比荷兰人更含蓄，避免过于激进的营销措辞。', 
        radarData: [75, 75, 65, 70, 80] 
    },
    'tr': { 
        name: '土耳其', 
        traits: '年轻人口多、通胀导致的价格极度敏感、喜欢分期付款。', 
        tips: '退货率通常较高（尤其是时尚类）。紧跟当地流行趋势。注意汇率波动对定价的影响。', 
        radarData: [50, 25, 95, 65, 45] 
    }
};


// 2. A10 图表配置数据 (从原 amz_hubDisplay.js 提取)
export const A10_CHART_DATA = {
    labels: ['自然销量 (Organic)', '转化率 (CVR)', '站外/引流 (Off-site)', 'PPC 广告', '点击率 (CTR)', '其他'],
    datasets: [{
        data: [35, 25, 20, 10, 5, 5],
        backgroundColor: ['#1E293B', '#F59E0B', '#10B981', '#6366F1', '#3B82F6', '#94A3B8'],
        borderWidth: 0,
        hoverOffset: 4
    }]
};

// 3. SEO 关键词雷达图数据
export const SEO_RADAR_DATA = {
    labels: ['语义相关性', '流量准确性', '长尾挖掘力', '转化意图', '竞争程度'],
    datasets: [{
        label: 'Review/Listing 扒词',
        data: [95, 40, 90, 85, 30], 
        fill: true,
        backgroundColor: 'rgba(234, 88, 12, 0.2)', // Orange
        borderColor: '#EA580C',
        pointBackgroundColor: '#EA580C'
    }, {
        label: 'ABA 报告数据',
        data: [60, 95, 50, 70, 90], 
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.2)', // Blue
        borderColor: '#3B82F6',
        pointBackgroundColor: '#3B82F6'
    }]
};