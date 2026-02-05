// src/modules/amz_hub/constants/amz_hub_constants.js

// 1. 欧洲国家画像数据
export const AMZ_COUNTRY_DATA = {
    // --- 成熟大站�?---
    'de': {
        name: '德国',
        traits: '严谨、注重参数、低退货容忍度、环保意识极强�?,
        tips: '文案避免空洞形容词，强调TUV认证、保修条款和具体材质参数。Review中常见抱怨点为物流包装和说明书不清晰�?,
        radarData: [90, 85, 40, 60, 95]
    },
    'uk': {
        name: '英国',
        traits: '礼貌、幽默、价格敏感度中等、重视配送时效�?,
        tips: '使用英式拼写 (Colour, Organise)。文案语调可适当轻松。特别关�?Prime 配送标识�?,
        radarData: [70, 60, 80, 70, 75]
    },
    'fr': {
        name: '法国',
        traits: '追求美感、感性消费、重视母语纯正度�?,
        tips: '图片审美必须高。绝对不能使用机翻法语，法国人对语言错误容忍度极低。包装设计很重要�?,
        radarData: [75, 50, 65, 90, 60]
    },
    'it': {
        name: '意大�?,
        traits: '热情、重视设计感、价格敏感度较高�?,
        tips: '强调产品的时尚感和设计风格。客户服务回复速度要快�?,
        radarData: [60, 40, 85, 80, 50]
    },
    'es': {
        name: '西班�?,
        traits: '价格极其敏感、喜欢促销、家庭观念重�?,
        tips: '强调性价�?(Value for money)。促销活动和Coupon效果最好�?,
        radarData: [50, 30, 95, 60, 55]
    },

    // --- 新兴/拓展站点 (已补�? ---
    'nl': {
        name: '荷兰',
        traits: '务实直爽、英语极好但偏好母语、精打细算、不仅看价格也看质量�?,
        tips: '物流必须快（对标本土Bol.com）。文案要直接（No Nonsense），强调环保和实用性。虽然有钱，但非常喜欢比价�?,
        radarData: [80, 80, 85, 65, 85]
    },
    'se': {
        name: '瑞典',
        traits: '高信任社会、极度环保主义、偏好极简北欧风、高客单价接受度�?,
        tips: '产品必须符合可持续发展标准。设计风格需简洁冷淡。任何隐形费用都会导致差评�?,
        radarData: [85, 90, 45, 85, 90]
    },
    'pl': {
        name: '波兰',
        traits: '电商发展极快、价格敏感度极高、年轻化�?,
        tips: '主要竞争对手是Allegro。低价策略渗透效果好。必须使用波兰语客服，不要试图用英语沟通�?,
        radarData: [55, 35, 90, 50, 60]
    },
    'be': {
        name: '比利�?,
        traits: '语言复杂（荷/法双语）、生活标准高、低调谦逊�?,
        tips: '必须提供双语（法/荷）Listing和说明书。相比荷兰人更含蓄，避免过于激进的营销措辞�?,
        radarData: [75, 75, 65, 70, 80]
    },
    'tr': {
        name: '土耳其',
        traits: '年轻人口多、通胀导致的价格极度敏感、喜欢分期付款�?,
        tips: '退货率通常较高（尤其是时尚类）。紧跟当地流行趋势。注意汇率波动对定价的影响�?,
        radarData: [50, 25, 95, 65, 45]
    }
};


// 2. A10 图表配置数据 (从原 amz_hubDisplay.js 提取)
export const A10_CHART_DATA = {
    labels: ['自然销�?(Organic)', '转化�?(CVR)', '站外/引流 (Off-site)', 'PPC 广告', '点击�?(CTR)', '其他'],
    datasets: [{
        data: [35, 25, 20, 10, 5, 5],
        backgroundColor: ['#1E293B', '#F59E0B', '#10B981', '#6366F1', '#3B82F6', '#94A3B8'],
        borderWidth: 0,
        hoverOffset: 4
    }]
};

// 3. SEO 关键词雷达图数据
export const SEO_RADAR_DATA = {
    labels: ['语义相关�?, '流量准确�?, '长尾挖掘�?, '转化意图', '竞争程度'],
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


//marketing canlendar

// ==================== AMZF Data (移植) ====================
export const amzf_countries = [
    { code: 'DE', name: '德国', flag: '<span class="fi fi-de"></span>' },
    { code: 'FR', name: '法国', flag: '<span class="fi fi-fr"></span>' },
    { code: 'IT', name: '意大�?, flag: '<span class="fi fi-it"></span>' },
    { code: 'ES', name: '西班�?, flag: '<span class="fi fi-es"></span>' },
    { code: 'NL', name: '荷兰', flag: '<span class="fi fi-nl"></span>' },
    { code: 'PL', name: '波兰', flag: '<span class="fi fi-pl"></span>' },
    { code: 'GB', name: '英国', flag: '<span class="fi fi-gb"></span>' },
    { code: 'SE', name: '瑞典', flag: '<span class="fi fi-se"></span>' },
    { code: 'BE', name: '比利�?, flag: '<span class="fi fi-be"></span>' },
    { code: 'IE', name: '爱尔�?, flag: '<span class="fi fi-ie"></span>' }
];
export const amzf_months = ['一�?, '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一�?, '十二�?];
export const amzf_events = [
    // ==================== January (一�? ====================
    {
        id: 1, name: '元旦', nameEn: 'New Year', emoji: '<i class="fas fa-glass-cheers" style="color: #FF9800;"></i>', date: '1�?�?, month: 1,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'GB', 'SE'], type: 'holiday',
        description: '每年年底和新年伊始都会有许多庆祝活动。这一天标志着新一年的开始，人们通常会购买促销商品、送礼以及与家人和朋友一起庆祝�?,
        strategy: '新年装饰品、派对用品、健身器材、规划类文具热销。主�?新年新决�?主题�?,
        tags: ['装饰�?, '派对用品', '健身', '文具']
    },
    {
        id: 2, name: '主显�?三王�?, nameEn: 'Epiphany', emoji: '<i class="fas fa-crown" style="color: #FFD700;"></i>', date: '1�?�?, month: 1,
        countries: ['IT', 'ES', 'PL', 'SE'], type: 'holiday',
        description: '按照传统，孩子们会在这一天收到礼物。在西班牙等地，这是比圣诞节更重要的儿童收礼节日�?,
        strategy: '西班牙三王节(Los Reyes Magos)比圣诞更重要，是儿童收礼物的正日子！意大利Befana女巫主题热销�?,
        tags: ['玩具', '礼品', '儿童用品']
    },
    {
        id: 3, name: '冬季大促', nameEn: 'Winter Sales', emoji: '<i class="fas fa-snowflake" style="color: #00BFFF;"></i>', date: '1月初-2月中', month: 1,
        countries: ['FR', 'IT', 'ES'], type: 'shopping',
        description: '法国及南欧国家的法定冬季打折季，商家会清理当季库存，为消费者提供极大的折扣优惠�?,
        strategy: '法国Soldes法定大促期，折扣力度大。清库存良机，服装、家居品类主力出货�?,
        tags: ['服装', '家居', '清仓']
    },

    // ==================== February (二月) ====================
    {
        id: 4, name: '情人�?, nameEn: "Valentine’s Day", emoji: '<i class="fas fa-heart" style="color: #E91E63;"></i>', date: '2�?4�?, month: 2,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'GB', 'SE'], type: 'holiday',
        description: '赞颂爱情与表达爱慕之情的节日。在这一天，情侣通常会互赠糖果、鲜花和其他礼物�?,
        strategy: '赞颂爱情的节日。珠宝首饰、巧克力、美妆、成人用品及情侣定制礼物需求激增�?,
        tags: ['珠宝', '礼品', '情侣�?, '巧克�?]
    },
    {
        id: 5, name: '狂欢�?, nameEn: 'Carnival', emoji: '<i class="fas fa-theater-masks" style="color: #9C27B0;"></i>', date: '2�?3月初', month: 2,
        countries: ['DE', 'IT', 'NL'], type: 'cultural',
        description: '大斋期前的传统狂欢庆典，以盛大的游行、面具舞会、街头派对和奇装异服为特色�?,
        strategy: '德国科隆、意大利威尼斯狂欢节。面具、奇装异�?Cosplay)、派对彩绘、装饰品需求高峰�?,
        tags: ['面具', '服饰', '派对用品']
    },
    {
        id: 6, name: '斋月开�?, nameEn: 'Ramadan Start', emoji: '<i class="fas fa-moon" style="color: #673AB7;"></i>', date: '2�?8�?, month: 2,
        countries: ['FR', 'DE', 'GB'], type: 'cultural',
        description: '斋戒月是精神反思和成长的时刻，人们会帮助有需要的人，并且与亲人共度时光。整个斋戒月期间，穆斯林会在白天封斋�?,
        strategy: '2026年斋月从2�?8日开始。针对穆斯林社区推广家居装饰(灯笼)、餐具、祈祷垫及开斋礼品�?,
        tags: ['家居', '灯饰', '餐具']
    },

    // ==================== March (三月) ====================
    {
        id: 7, name: '国际妇女�?, nameEn: "Women’s Day", emoji: '<i class="fas fa-venus" style="color: #FF69B4;"></i>', date: '3�?�?, month: 3,
        countries: ['DE', 'IT', 'PL'], type: 'holiday',
        description: '庆祝女性在经济、政治和社会领域做出的重要贡献。在意大利等地，人们有赠送含羞草花的传统�?,
        strategy: '意大利有送含羞草的传统。美妆护肤、珠宝、鲜花、女性自我呵护类产品销量上涨�?,
        tags: ['美妆', '护肤', '珠宝']
    },
    {
        id: 8, name: '父亲�?�?�?', nameEn: "Father’s Day IT/ES", emoji: '<i class="fas fa-user-tie" style="color: #3F51B5;"></i>', date: '3�?9�?, month: 3,
        countries: ['IT', 'ES'], type: 'holiday',
        description: '父亲节是赞颂父亲、父爱、父系纽带以及父亲的社会影响力的特殊节日。赠送礼物是常见的庆祝方式�?,
        strategy: '圣约瑟夫日。男士配饰、剃须刀、电子小工具、领带等经典父亲节礼物�?,
        tags: ['男士配饰', '电子产品', '工具']
    },
    {
        id: 9, name: '开斋节', nameEn: 'Eid al-Fitr', emoji: '<i class="fas fa-mosque" style="color: #4CAF50;"></i>', date: '3�?9�?, month: 3,
        countries: ['FR', 'DE', 'GB'], type: 'cultural',
        description: '这是庆祝斋戒月结束的宗教节日。庆祝活动包括慈善捐赠、互赠礼物、与家人和朋友聚会以及享用节日大餐�?,
        strategy: '2026年开斋节�?�?9日。斋月结束的盛大庆祝,互赠礼物、糖果盒、新衣、家庭聚会用品需求大爆发�?,
        tags: ['礼品', '糖果', '服饰']
    },
    {
        id: 10, name: '母亲�?英国/爱尔�?', nameEn: "Mother’s Day UK", emoji: '<i class="fas fa-female" style="color: #F44336;"></i>', date: '3�?5�?, month: 3,
        countries: ['GB', 'IE'], type: 'holiday',
        description: '赞颂母亲、母爱、母系纽带以及母亲的社会影响力的节日。赠送礼物是常见的庆祝方式，顾客通常会提前几周挑选礼物�?,
        strategy: '2026年英国和爱尔兰母亲节(Mothering Sunday)�?�?5日。礼品、园艺工具、定制相框、美容仪热销�?,
        tags: ['礼品', '珠宝', '园艺', '美妆']
    },

    // ==================== April (四月) ====================
    {
        id: 11, name: '复活�?, nameEn: 'Easter', emoji: '<i class="fas fa-egg" style="color: #FFC107;"></i>', date: '4�?�?, month: 4,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'GB', 'SE'], type: 'holiday',
        description: '人们通常会用五颜六色的复活节彩蛋、巧克力、糖果和礼物来庆祝复活节�?,
        strategy: '2026年复活节�?�?日。巧克力彩蛋、兔子装饰、园艺用品、春季轻薄服装热销�?,
        tags: ['巧克�?, '装饰�?, '园艺', '春装']
    },
    {
        id: 12, name: '国王�?, nameEn: "King’s Day", emoji: '<i class="fas fa-crown" style="color: #FF9800;"></i>', date: '4�?7�?, month: 4,
        countries: ['NL'], type: 'holiday',
        description: '庆祝荷兰国王威廉-亚历山大的生日。人们身着橙色服装，参加街头派对、跳蚤市场和音乐活动�?,
        strategy: '荷兰最盛大的街头派对，全民穿橙色。橙色服饰、假发、面部彩绘、户外派对用品激增�?,
        tags: ['橙色服饰', '派对', '户外用品']
    },
    {
        id: 13, name: '瓦尔普吉斯之�?, nameEn: 'Walpurgis Night', emoji: '<i class="fas fa-fire" style="color: #FF5722;"></i>', date: '4�?0�?, month: 4,
        countries: ['SE', 'DE'], type: 'cultural',
        description: '瑞典和德国的传统节日，人们在这一天点燃巨大的篝火，载歌载舞以迎接春天的到来�?,
        strategy: '迎接春天的篝火晚会。户外烧烤装备、野餐垫、派对道具需求旺盛�?,
        tags: ['派对用品', '烧烤', '户外']
    },

    // ==================== May (五月) ====================
    {
        id: 14, name: '劳动�?, nameEn: 'Labour Day', emoji: '<i class="fas fa-hammer" style="color: #795548;"></i>', date: '5�?�?, month: 5,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'SE'], type: 'holiday',
        description: '庆祝劳动者贡献的公共假日，也是许多欧洲人享受春日户外时光、进行短途旅行的日子�?,
        strategy: '欧洲多国放假，短途旅行和户外活动高峰。旅行收纳、便携电子设备热销�?,
        tags: ['户外', '旅行', '野餐']
    },
    {
        id: 15, name: '母亲�?西班�?', nameEn: "Mother’s Day ES", emoji: '<i class="fas fa-heart" style="color: #E91E63;"></i>', date: '5�?�?, month: 5,
        countries: ['ES'], type: 'holiday',
        description: '赞颂母亲、母爱、母系纽带以及母亲的社会影响力的节日。赠送礼物是常见的庆祝方式�?,
        strategy: '2026年西班牙母亲节在5�?�?5月首个周�?。主推珠宝、香水、定制化礼品�?,
        tags: ['珠宝', '香水', '定制礼品']
    },
    {
        id: 16, name: '母亲�?�?�?�?�?', nameEn: "Mother’s Day DE/IT/NL", emoji: '<i class="fas fa-heart" style="color: #E91E63;"></i>', date: '5�?0�?, month: 5,
        countries: ['DE', 'IT', 'NL', 'BE'], type: 'holiday',
        description: '赞颂母亲、母爱、母系纽带以及母亲的社会影响力的节日。顾客通常会在活动开始前几周就开始为他们所爱的人挑选礼物�?,
        strategy: '2026年主流欧洲国家母亲节�?�?0�?5月第二个周日)。鲜花周边、家居装饰、小家电是热门选择�?,
        tags: ['家居', '美妆', '小家�?]
    },
    {
        id: 17, name: '度假金发�?, nameEn: 'Holiday Money', emoji: '<i class="fas fa-coins" style="color: #FFD700;"></i>', date: '5月中-6�?, month: 5,
        countries: ['NL'], type: 'financial',
        description: 'Holiday Money 标志着每个财政年结束时，荷兰的雇员可以从其雇主那里领取到一笔款项。这几乎相当于额外一个月的工资�?,
        strategy: '荷兰员工收到额外"�?3个月工资"。消费力最强时段，适合推高客单价电子、家电、旅行装备�?,
        tags: ['高客单价', '电子', '家电']
    },
    {
        id: 18, name: '母亲�?�?�?', nameEn: "Mother’s Day FR/SE", emoji: '<i class="fas fa-heart" style="color: #E91E63;"></i>', date: '5�?1�?, month: 5,
        countries: ['FR', 'SE'], type: 'holiday',
        description: '赞颂母亲、母爱、母系纽带以及母亲的社会影响力的节日。赠送礼物是常见的庆祝方式�?,
        strategy: '2026年法国和瑞典的母亲节�?�?1�?5月最后周�?。需针对这两个国家单独延长母亲节广告投放�?,
        tags: ['珠宝', '鲜花', '美妆']
    },
    {
        id: 19, name: '母亲�?波兰)', nameEn: "Mother’s Day PL", emoji: '<i class="fas fa-heart" style="color: #E91E63;"></i>', date: '5�?6�?, month: 5,
        countries: ['PL'], type: 'holiday',
        description: '赞颂母亲、母爱、母系纽带以及母亲的社会影响力的节日。世界各地的母亲节的日期有所不同，最常见的是�?3 月或 5 月�?,
        strategy: '波兰母亲节是固定日期。礼品类商品需提前备货至波兰仓�?,
        tags: ['礼品', '鲜花', '珠宝']
    },
    {
        id: 20, name: '父亲�?德国)', nameEn: "Father’s Day DE", emoji: '<i class="fas fa-beer" style="color: #FFC107;"></i>', date: '5�?1�?, month: 5,
        countries: ['DE'], type: 'holiday',
        description: '德国的父亲节（Vatertag）通常在耶稣升天节庆祝。按照传统，男士们会组织徒步旅行，并享用啤酒和美食�?,
        strategy: '2026年耶稣升天�?德国父亲�?�?�?1日。男士们拉着手推车徒步喝酒。啤酒周边、户外装备、烧烤架热销�?,
        tags: ['啤酒用品', '户外', '男士礼品']
    },

    // ==================== June (六月) ====================
    {
        id: 21, name: '父亲�?�?�?�?�?', nameEn: "Father’s Day Global", emoji: '<i class="fas fa-beer" style="color: #FFC107;"></i>', date: '6�?1�?, month: 6,
        countries: ['FR', 'NL', 'GB', 'IE'], type: 'holiday',
        description: '父亲节是赞颂父亲、父爱、父系纽带以及父亲的社会影响力的特殊节日。赠送礼物是常见的庆祝方式�?,
        strategy: '2026年主流父亲节�?�?1�?6月第三个周日)。电子产品、工具套装、运动手表、男士护理品热销�?,
        tags: ['电子产品', '工具', '运动', '男士护理']
    },
    {
        id: 22, name: '仲夏�?, nameEn: 'Midsummer', emoji: '<i class="fas fa-sun" style="color: #FF9800;"></i>', date: '6�?0-21�?, month: 6,
        countries: ['SE'], type: 'cultural',
        description: '瑞典年度最重要节日之一，庆祝夏至。人们围绕五月柱跳舞，制作花环，并享用腌鲱鱼等传统美食�?,
        strategy: '瑞典年度最重要节日之一。花环制作材料、户外家具、野餐餐具、伏特加酒具热销�?,
        tags: ['花环', '野餐', '户外家具']
    },
    {
        id: 23, name: '父亲�?波兰)', nameEn: "Father’s Day PL", emoji: '<i class="fas fa-tools" style="color: #607D8B;"></i>', date: '6�?3�?, month: 6,
        countries: ['PL'], type: 'holiday',
        description: '父亲节是赞颂父亲、父爱、父系纽带以及父亲的社会影响力的特殊节日�?,
        strategy: '波兰父亲节是固定日期。DIY工具、汽车配件、电子礼品需求大�?,
        tags: ['工具', '汽车配件', '电子']
    },
    {
        id: 24, name: '夏季大促', nameEn: 'Summer Sales', emoji: '<i class="fas fa-tags" style="color: #F44336;"></i>', date: '6月底-8�?, month: 6,
        countries: ['FR', 'IT', 'ES'], type: 'shopping',
        description: '在夏季末举办的季节性销售活动，帮助零售商出售当季剩余库存，并为顾客提供促销优惠�?,
        strategy: '官方夏促�?Soldes/Saldi)。换季清仓，夏季服饰、空调扇、户外用品低价走量�?,
        tags: ['服装', '家居', '清仓']
    },

    // ==================== July (七月) ====================<i class="fa-brands fa-amazon"></i>
    {
        id: 25, name: 'Prime Day', nameEn: 'Amazon Prime Day', emoji: '<i class="fa-brands fa-amazon" style="color: #00A8E1;"></i>', date: '7月中�?, month: 7,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'GB', 'SE'], type: 'shopping',
        description: '亚马逊年度盛大的会员购物节，为Prime会员提供涵盖所有品类的独家折扣和限时优惠�?,
        strategy: '亚马逊年度大促。全品类参与，建议提�?个月备货，重点关注电子、智能家居、时尚品类�?,
        tags: ['全品�?, '大促', '备货']
    },
    {
        id: 26, name: '法国国庆�?, nameEn: 'Bastille Day', emoji: '<i class="fas fa-flag" style="color: #0055A4;"></i>', date: '7�?4�?, month: 7,
        countries: ['FR'], type: 'holiday',
        description: '纪念1789年攻占巴士底狱。庆祝活动包括阅兵式、舞会以及盛大的烟花表演�?,
        strategy: '蓝白红三色主题装饰、烟花周边、户外聚会用品�?,
        tags: ['装饰�?, '派对', '野餐']
    },

    // ==================== August (八月) ====================
    {
        id: 27, name: '圣母升天�?, nameEn: 'Assumption Day', emoji: '<i class="fas fa-church" style="color: #9E9E9E;"></i>', date: '8�?5�?, month: 8,
        countries: ['FR', 'IT', 'ES', 'PL'], type: 'holiday',
        description: '天主教重要节日，纪念圣母玛利亚升天。许多欧洲国家将其定为公共假日，人们通常会扫墓，点燃蜡烛并献上菊花�?,
        strategy: '南欧及波兰公共假期，也是夏季长假的最高峰。沙滩用品、泳装、旅行包销量持续�?,
        tags: ['旅行', '泳装', '防晒']
    },
    {
        id: 28, name: '返校�?, nameEn: 'Back to School', emoji: '<i class="fas fa-school" style="color: #FFC107;"></i>', date: '8月中-9月初', month: 8,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'GB', 'SE'], type: 'season',
        description: '学生返校前是人们购买学习用品和服装的高峰期�?,
        strategy: '书包、文具盒、计算器、笔记本电脑、童装鞋帽。不同国家开学时间略有差异，建议通投�?,
        tags: ['书包', '文具', '电子产品', '服装']
    },

    // ==================== September (九月) ====================
    {
        id: 29, name: '儿童�?�?�?', nameEn: 'Children’s Day DE/NL', emoji: '<i class="fas fa-child" style="color: #4CAF50;"></i>', date: '9�?0�?25�?, month: 9,
        countries: ['DE', 'NL'], type: 'holiday',
        description: '每年都会庆祝儿童节，以关爱儿童，提高人们对儿童教育和福利的认识�?,
        strategy: '德国(9.20)和荷�?9.25)的儿童节。玩具、益智游戏、乐高、拼图等礼品需求小高峰�?,
        tags: ['玩具', '游戏', '文具']
    },
    {
        id: 30, name: '慕尼黑啤酒节', nameEn: 'Oktoberfest', emoji: '<i class="fas fa-beer" style="color: #FF9800;"></i>', date: '9�?9�?10�?�?, month: 9,
        countries: ['DE'], type: 'cultural',
        description: '在慕尼黑举行的一年一度的啤酒节，为期两周。数百万游客身着巴伐利亚传统服饰，享用啤酒和美食�?,
        strategy: '2026年第191届慕尼黑啤酒节从9�?9日至10�?日。巴伐利亚传统服�?Dirndl/Lederhosen)、啤酒杯、派对装饰全欧热销�?,
        tags: ['传统服饰', '啤酒用品', '派对']
    },

    // ==================== October (十月) ====================
    {
        id: 31, name: '德国统一�?, nameEn: 'German Unity Day', emoji: '<i class="fas fa-star" style="color: #FFD700;"></i>', date: '10�?�?, month: 10,
        countries: ['DE'], type: 'holiday',
        description: '纪念1990年德国重新统一的国庆日，也是德国的公共假日�?,
        strategy: '德国国庆假期。短途旅游装备、户外徒步用品�?,
        tags: ['旅行', '户外']
    },
    {
        id: 32, name: '万圣�?, nameEn: 'Halloween', emoji: '<i class="fas fa-ghost" style="color: #607D8B;"></i>', date: '10�?1�?, month: 10,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'GB', 'SE'], type: 'cultural',
        description: '10 �?31 日万圣节是西方基督教盛宴前夜举行的庆祝活动。按照传统，人们会打扮成妖魔鬼怪、玩“不给糖就捣蛋”的游戏，并享用化妆舞会�?,
        strategy: '南瓜灯、骷髅装饰、Cosplay服饰、特效化妆品、糖果袋。英国和德国市场尤为火爆�?,
        tags: ['装饰', '变装', '糖果', '派对']
    },

    // ==================== November (十一�? ====================
    {
        id: 33, name: '诸圣�?, nameEn: 'All Saints Day', emoji: '<i class="fas fa-cross" style="color: #795548;"></i>', date: '11�?�?, month: 11,
        countries: ['FR', 'IT', 'ES', 'PL'], type: 'holiday',
        description: '缅怀圣人和逝去亲人的宗教节日。人们通常会扫墓，点燃蜡烛并献上菊花�?,
        strategy: '祭祀缅怀逝者。人造花(菊花)、墓地蜡烛、纪念饰品。波兰市场需求极大�?,
        tags: ['蜡烛', '鲜花']
    },
    {
        id: 34, name: '父亲�?瑞典)', nameEn: "Father’s Day SE", emoji: '<i class="fas fa-user-tie" style="color: #006AA7;"></i>', date: '11�?�?, month: 11,
        countries: ['SE'], type: 'holiday',
        description: '父亲节是赞颂父亲、父爱、父系纽带以及父亲的社会影响力的特殊节日。赠送礼物是常见的庆祝方式�?,
        strategy: '2026年瑞典父亲节�?1�?�?11月第二个周日)。北欧父亲节在冬�?保暖内衣、冬帽、室内娱乐设备、威士忌酒具是好选择�?,
        tags: ['冬装', '男士礼品', '室内娱乐']
    },
    {
        id: 35, name: '光棍�?, nameEn: 'Singles Day', emoji: '<i class="fas fa-shopping-bag" style="color: #E91E63;"></i>', date: '11�?1�?, month: 11,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'GB'], type: 'shopping',
        description: '双十一（代�?11 �?11 日举行的活动），也称为“光棍节”，是单身一族们庆祝的非官方假日和购物日�?,
        strategy: '虽然源于中国，但在欧洲（尤其西班�?法国）知名度提升。适合推电子产品、快时尚�?,
        tags: ['电子产品', '时尚', '促销']
    },
    {
        id: 36, name: '儿童�?�?�?�?', nameEn: 'Children’s Day South EU', emoji: '<i class="fas fa-child" style="color: #FFC107;"></i>', date: '11�?0�?, month: 11,
        countries: ['FR', 'IT', 'ES'], type: 'holiday',
        description: '每年都会庆祝儿童节，以关爱儿童，提高人们对儿童教育和福利的认识�?,
        strategy: '世界儿童日。虽然不如圣诞隆重，但是玩具品类在黑五前的预热良机�?,
        tags: ['玩具', '礼品']
    },
    {
        id: 37, name: '黑色星期�?, nameEn: 'Black Friday', emoji: '<i class="fas fa-tag" style="color: #212121;"></i>', date: '11�?7�?, month: 11,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'GB', 'SE'], type: 'shopping',
        description: '这场促销活动为期四天，通常发生在美国感恩节之后（一般是 11 月的第四个星期五）。它标志着圣诞购物季的开始�?,
        strategy: '2026年黑色星期五�?1�?7日。全年最疯狂大促!电子、家电、时尚、家居全线爆发。务必保证库存充足�?,
        tags: ['全品�?, '大促', '电子', '家居']
    },

    // ==================== December (十二�? ====================
    {
        id: 38, name: '网络星期一', nameEn: 'Cyber Monday', emoji: '<i class="fas fa-laptop" style="color: #3F51B5;"></i>', date: '11�?0�?, month: 12,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'GB', 'SE'], type: 'shopping',
        description: '紧随黑色星期五之后的在线购物日，通常以电子产品和在线独家优惠为主�?,
        strategy: '2026年网络星期一�?1�?0日。黑五返�?侧重线上品类。电脑硬件、软件、游戏配件、智能家居转化率高�?,
        tags: ['电子产品', '数码', '软件']
    },
    {
        id: 39, name: '圣尼古拉斯节', nameEn: 'St. Nicholas/Sinterklaas', emoji: '<i class="fas fa-gift" style="color: #D32F2F;"></i>', date: '12�?-6�?, month: 12,
        countries: ['NL', 'DE', 'PL'], type: 'holiday',
        description: '圣尼古拉节是重要的儿童节日，圣人“Sinterklaas”会为孩子们带来礼物。庆祝形式包括赠送礼物和购买特有的糖果�?,
        strategy: '荷兰(12�?�?最重要的送礼节日！德�?波兰(12�?�?鞋子里放糖果。玩具、巧克力是绝对主力�?,
        tags: ['玩具', '巧克�?, '儿童礼品']
    },
    {
        id: 40, name: '圣卢西亚�?, nameEn: 'St. Lucia Day', emoji: '<i class="fas fa-fire" style="color: #FF9800;"></i>', date: '12�?3�?, month: 12,
        countries: ['SE', 'IT'], type: 'cultural',
        description: '按照传统，在这一天，许多孩子都会收到礼物，尤其是在瑞典和意大利北部�?,
        strategy: '瑞典和意大利北部传统。白色长袍、蜡烛头冠、烘焙模具、姜饼�?,
        tags: ['蜡烛', '装饰', '烘焙']
    },
    {
        id: 41, name: '圣诞�?, nameEn: 'Christmas', emoji: '<i class="fas fa-tree" style="color: #2E7D32;"></i>', date: '12�?5�?, month: 12,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'GB', 'SE'], type: 'holiday',
        description: '年终假日的重要活动。这些活动的标志性消费行为有购买促销商品、送礼以及与家人和朋友一起庆祝�?,
        strategy: '礼物交换高峰。所有礼品类目（玩具、电子、美妆、服饰）的最后冲刺。注意物流截单时间�?,
        tags: ['装饰', '礼品', '玩具', '电子']
    },
    {
        id: 42, name: '节礼�?, nameEn: 'Boxing Day', emoji: '<i class="fas fa-box" style="color: #8D6E63;"></i>', date: '12�?6�?, month: 12,
        countries: ['GB', 'DE', 'NL', 'SE'], type: 'shopping',
        description: '节礼日是在圣诞节次日庆祝的节日。虽然节礼日最初是向穷人赠送礼物的节日，但如今，人们普遍地将节礼日称为购物假日�?,
        strategy: '英国传统购物狂欢日。圣诞后清仓 + 新年礼物采购。适合捆绑销售和清库存�?,
        tags: ['清仓', '促销', '礼品']
    },
    {
        id: 43, name: '跨年�?, nameEn: 'New Year Eve', emoji: '<i class="fas fa-glass-cheers" style="color: #E91E63;"></i>', date: '12�?1�?, month: 12,
        countries: ['DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'GB', 'SE'], type: 'holiday',
        description: '新年伊始的前夜，人们举办聚会、观看烟花，庆祝过去一年的结束和新一年的到来�?,
        strategy: '香槟杯、派对气球、彩带、荧光棒�?026数字造型眼镜�?,
        tags: ['派对', '酒具', '装饰']
    }
];