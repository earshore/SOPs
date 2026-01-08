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


//marketing canlendar

// ==================== AMZF Data (移植) ====================
export const amzf_countries = [
    { code: 'DE', name: '德国', flag: '🇩🇪' },
    { code: 'FR', name: '法国', flag: '🇫🇷' },
    { code: 'IT', name: '意大利', flag: '🇮🇹' },
    { code: 'ES', name: '西班牙', flag: '🇪🇸' },
    { code: 'NL', name: '荷兰', flag: '🇳🇱' },
    { code: 'PL', name: '波兰', flag: '🇵🇱' },
    { code: 'GB', name: '英国', flag: '🇬🇧' },
    { code: 'SE', name: '瑞典', flag: '🇸🇪' }
];
export const amzf_months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
export const amzf_events = [
    // ==================== January (一月) ====================
    { 
        id: 1, name: '元旦', nameEn: 'New Year', emoji: '🎊', date: '1月1日', month: 1, 
        countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'holiday', 
        strategy: '新年装饰品、派对用品、健身器材、规划类文具热销。主推"新年新决心"主题。', 
        tags: ['装饰品','派对用品','健身','文具'] 
    },
    { 
        id: 2, name: '主显节/三王节', nameEn: 'Epiphany', emoji: '👑', date: '1月6日', month: 1, 
        countries: ['IT','ES','PL','SE'], type: 'holiday', 
        strategy: '西班牙三王节(Los Reyes Magos)比圣诞更重要，是儿童收礼物的正日子！意大利Befana女巫主题热销。', 
        tags: ['玩具','礼品','儿童用品'] 
    },
    { 
        id: 3, name: '冬季大促', nameEn: 'Winter Sales', emoji: '❄️', date: '1月初-2月中', month: 1, 
        countries: ['FR','IT','ES'], type: 'shopping', 
        strategy: '法国Soldes法定大促期，折扣力度大。清库存良机，服装、家居品类主力出货。', 
        tags: ['服装','家居','清仓'] 
    },

    // ==================== February (二月) ====================
    { 
        id: 4, name: '情人节', nameEn: "Valentine’s Day", emoji: '💝', date: '2月14日', month: 2, 
        countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'holiday', 
        strategy: '赞颂爱情的节日。珠宝首饰、巧克力、美妆、成人用品及情侣定制礼物需求激增。', 
        tags: ['珠宝','礼品','情侣款','巧克力'] 
    },
    { 
        id: 5, name: '狂欢节', nameEn: 'Carnival', emoji: '🎭', date: '2月-3月初', month: 2, 
        countries: ['DE','IT','NL'], type: 'cultural', 
        strategy: '德国科隆、意大利威尼斯狂欢节。面具、奇装异服(Cosplay)、派对彩绘、装饰品需求高峰。', 
        tags: ['面具','服饰','派对用品'] 
    },
    { 
        id: 6, name: '斋月开始', nameEn: 'Ramadan Start', emoji: '🌙', date: '2月28日', month: 2, 
        countries: ['FR','DE','GB'], type: 'cultural', 
        strategy: '2025年斋月开始。针对穆斯林社区推广家居装饰（灯笼）、餐具、祈祷垫及开斋礼品。', 
        tags: ['家居','灯饰','餐具'] 
    },

    // ==================== March (三月) ====================
    { 
        id: 7, name: '国际妇女节', nameEn: "Women’s Day", emoji: '👩', date: '3月8日', month: 3, 
        countries: ['DE','IT','PL'], type: 'holiday', 
        strategy: '意大利有送含羞草的传统。美妆护肤、珠宝、鲜花、女性自我呵护类产品销量上涨。', 
        tags: ['美妆','护肤','珠宝'] 
    },
    { 
        id: 8, name: '父亲节(意/西)', nameEn: "Father’s Day IT/ES", emoji: '👨‍👧', date: '3月19日', month: 3, 
        countries: ['IT','ES'], type: 'holiday', 
        strategy: '圣约瑟夫日。男士配饰、剃须刀、电子小工具、领带等经典父亲节礼物。', 
        tags: ['男士配饰','电子产品','工具'] 
    },
    { 
        id: 9, name: '开斋节', nameEn: 'Eid al-Fitr', emoji: '🕌', date: '3月30-31日', month: 3, 
        countries: ['FR','DE','GB'], type: 'cultural', 
        strategy: '斋月结束的盛大庆祝。互赠礼物、糖果盒、新衣、家庭聚会用品需求大爆发。', 
        tags: ['礼品','糖果','服饰'] 
    },
    { 
        id: 10, name: '母亲节(英国)', nameEn: "Mother’s Day UK", emoji: '👩‍👧', date: '3月30日', month: 3, 
        countries: ['GB'], type: 'holiday', 
        strategy: '2025年英国母亲节在3月底。礼品、园艺工具、定制相框、美容仪热销。', 
        tags: ['礼品','珠宝','园艺','美妆'] 
    },

    // ==================== April (四月) ====================
    { 
        id: 11, name: '复活节', nameEn: 'Easter', emoji: '🐰', date: '4月20日', month: 4, 
        countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'holiday', 
        strategy: '2025年复活节较晚。巧克力彩蛋、兔子装饰、园艺用品、春季轻薄服装热销。', 
        tags: ['巧克力','装饰品','园艺','春装'] 
    },
    { 
        id: 12, name: '国王节', nameEn: "King’s Day", emoji: '🧡', date: '4月27日', month: 4, 
        countries: ['NL'], type: 'holiday', 
        strategy: '荷兰最盛大的街头派对，全民穿橙色。橙色服饰、假发、面部彩绘、户外派对用品激增。', 
        tags: ['橙色服饰','派对','户外用品'] 
    },
    { 
        id: 13, name: '瓦尔普吉斯之夜', nameEn: 'Walpurgis Night', emoji: '🔥', date: '4月30日', month: 4, 
        countries: ['SE','DE'], type: 'cultural', 
        strategy: '迎接春天的篝火晚会。户外烧烤装备、野餐垫、派对道具需求旺盛。', 
        tags: ['派对用品','烧烤','户外'] 
    },

    // ==================== May (五月) ====================
    { 
        id: 14, name: '劳动节', nameEn: 'Labour Day', emoji: '⚒️', date: '5月1日', month: 5, 
        countries: ['DE','FR','IT','ES','NL','PL','SE'], type: 'holiday', 
        strategy: '欧洲多国放假，短途旅行和户外活动高峰。旅行收纳、便携电子设备热销。', 
        tags: ['户外','旅行','野餐'] 
    },
    { 
        id: 15, name: '母亲节(西班牙)', nameEn: "Mother’s Day ES", emoji: '💐', date: '5月4日', month: 5, 
        countries: ['ES'], type: 'holiday', 
        strategy: '西班牙母亲节(5月首个周日)。主推珠宝、香水、定制化礼品。', 
        tags: ['珠宝','香水','定制礼品'] 
    },
    { 
        id: 16, name: '母亲节(德/意/荷)', nameEn: "Mother’s Day DE/IT/NL", emoji: '💐', date: '5月11日', month: 5, 
        countries: ['DE','IT','NL'], type: 'holiday', 
        strategy: '主流欧洲国家母亲节。鲜花周边、家居装饰、小家电是热门选择。', 
        tags: ['家居','美妆','小家电'] 
    },
    { 
        id: 17, name: '度假金发放', nameEn: 'Holiday Money', emoji: '💰', date: '5月中-6月', month: 5, 
        countries: ['NL'], type: 'financial', 
        strategy: '荷兰员工收到额外"第13个月工资"。消费力最强时段，适合推高客单价电子、家电、旅行装备。', 
        tags: ['高客单价','电子','家电'] 
    },
    { 
        id: 18, name: '母亲节(法/瑞)', nameEn: "Mother’s Day FR/SE", emoji: '💐', date: '5月25日', month: 5, 
        countries: ['FR','SE'], type: 'holiday', 
        strategy: '法国和瑞典的母亲节较晚(5月最后周日)。需针对这两个国家单独延长母亲节广告投放。', 
        tags: ['珠宝','鲜花','美妆'] 
    },
    { 
        id: 19, name: '母亲节(波兰)', nameEn: "Mother’s Day PL", emoji: '💐', date: '5月26日', month: 5, 
        countries: ['PL'], type: 'holiday', 
        strategy: '波兰母亲节是固定日期。礼品类商品需提前备货至波兰仓。', 
        tags: ['礼品','鲜花','珠宝'] 
    },
    { 
        id: 20, name: '父亲节(德国)', nameEn: "Father’s Day DE", emoji: '🍺', date: '5月29日', month: 5, 
        countries: ['DE'], type: 'holiday', 
        strategy: '耶稣升天节即德国父亲节。男士们拉着手推车徒步喝酒。啤酒周边、户外装备、烧烤架热销。', 
        tags: ['啤酒用品','户外','男士礼品'] 
    },

    // ==================== June (六月) ====================
    { 
        id: 21, name: '父亲节(法/荷/英)', nameEn: "Father’s Day Global", emoji: '👔', date: '6月15日', month: 6, 
        countries: ['FR','NL','GB'], type: 'holiday', 
        strategy: '主流父亲节日期。电子产品、工具套装、运动手表、男士护理品热销。', 
        tags: ['电子产品','工具','运动','男士护理'] 
    },
    { 
        id: 22, name: '仲夏节', nameEn: 'Midsummer', emoji: '🌻', date: '6月20-21日', month: 6, 
        countries: ['SE'], type: 'cultural', 
        strategy: '瑞典年度最重要节日之一。花环制作材料、户外家具、野餐餐具、伏特加酒具热销。', 
        tags: ['花环','野餐','户外家具'] 
    },
    { 
        id: 23, name: '父亲节(波兰)', nameEn: "Father’s Day PL", emoji: '👔', date: '6月23日', month: 6, 
        countries: ['PL'], type: 'holiday', 
        strategy: '波兰父亲节是固定日期。DIY工具、汽车配件、电子礼品需求大。', 
        tags: ['工具','汽车配件','电子'] 
    },
    { 
        id: 24, name: '夏季大促', nameEn: 'Summer Sales', emoji: '☀️', date: '6月底-8月', month: 6, 
        countries: ['FR','IT','ES'], type: 'shopping', 
        strategy: '官方夏促期(Soldes/Saldi)。换季清仓，夏季服饰、空调扇、户外用品低价走量。', 
        tags: ['服装','家居','清仓'] 
    },

    // ==================== July (七月) ====================
    { 
        id: 25, name: 'Prime Day', nameEn: 'Amazon Prime Day', emoji: '📦', date: '7月中旬', month: 7, 
        countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'shopping', 
        strategy: '亚马逊年度大促。全品类参与，建议提前2个月备货，重点关注电子、智能家居、时尚品类。', 
        tags: ['全品类','大促','备货'] 
    },
    { 
        id: 26, name: '法国国庆日', nameEn: 'Bastille Day', emoji: '🇫🇷', date: '7月14日', month: 7, 
        countries: ['FR'], type: 'holiday', 
        strategy: '蓝白红三色主题装饰、烟花周边、户外聚会用品。', 
        tags: ['装饰品','派对','野餐'] 
    },

    // ==================== August (八月) ====================
    { 
        id: 27, name: '圣母升天节', nameEn: 'Assumption Day', emoji: '⛪', date: '8月15日', month: 8, 
        countries: ['FR','IT','ES','PL'], type: 'holiday', 
        strategy: '南欧及波兰公共假期，也是夏季长假的最高峰。沙滩用品、泳装、旅行包销量持续。', 
        tags: ['旅行','泳装','防晒'] 
    },
    { 
        id: 28, name: '返校季', nameEn: 'Back to School', emoji: '📚', date: '8月中-9月初', month: 8, 
        countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'season', 
        strategy: '书包、文具盒、计算器、笔记本电脑、童装鞋帽。不同国家开学时间略有差异，建议通投。', 
        tags: ['书包','文具','电子产品','服装'] 
    },

    // ==================== September (九月) ====================
    { 
        id: 29, name: '儿童节(德/荷)', nameEn: 'Children’s Day DE/NL', emoji: '🧸', date: '9月20日/25日', month: 9, 
        countries: ['DE','NL'], type: 'holiday', 
        strategy: '德国(9.20)和荷兰(9.25)的儿童节。玩具、益智游戏、乐高、拼图等礼品需求小高峰。', 
        tags: ['玩具','游戏','文具'] 
    },
    { 
        id: 30, name: '慕尼黑啤酒节', nameEn: 'Oktoberfest', emoji: '🍺', date: '9月20日-10月5日', month: 9, 
        countries: ['DE'], type: 'cultural', 
        strategy: '为期两周的啤酒狂欢。巴伐利亚传统服饰(Dirndl/Lederhosen)、啤酒杯、派对装饰全欧热销。', 
        tags: ['传统服饰','啤酒用品','派对'] 
    },

    // ==================== October (十月) ====================
    { 
        id: 31, name: '德国统一日', nameEn: 'German Unity Day', emoji: '🇩🇪', date: '10月3日', month: 10, 
        countries: ['DE'], type: 'holiday', 
        strategy: '德国国庆假期。短途旅游装备、户外徒步用品。', 
        tags: ['旅行','户外'] 
    },
    { 
        id: 32, name: '万圣节', nameEn: 'Halloween', emoji: '🎃', date: '10月31日', month: 10, 
        countries: ['DE','FR','IT','ES','NL','GB','SE'], type: 'cultural', 
        strategy: '南瓜灯、骷髅装饰、Cosplay服饰、特效化妆品、糖果袋。英国和德国市场尤为火爆。', 
        tags: ['装饰','变装','糖果','派对'] 
    },

    // ==================== November (十一月) ====================
    { 
        id: 33, name: '诸圣节', nameEn: 'All Saints Day', emoji: '🕯️', date: '11月1日', month: 11, 
        countries: ['FR','IT','ES','PL'], type: 'holiday', 
        strategy: '祭祀缅怀逝者。人造花(菊花)、墓地蜡烛、纪念饰品。波兰市场需求极大。', 
        tags: ['蜡烛','鲜花'] 
    },
    { 
        id: 34, name: '父亲节(瑞典)', nameEn: "Father’s Day SE", emoji: '🇸🇪', date: '11月9日', month: 11, 
        countries: ['SE'], type: 'holiday', 
        strategy: '北欧父亲节在冬季。保暖内衣、冬帽、室内娱乐设备、威士忌酒具是好选择。', 
        tags: ['冬装','男士礼品','室内娱乐'] 
    },
    { 
        id: 35, name: '光棍节', nameEn: 'Singles Day', emoji: '🛒', date: '11月11日', month: 11, 
        countries: ['DE','FR','IT','ES','NL','GB'], type: 'shopping', 
        strategy: '虽然源于中国，但在欧洲（尤其西班牙/法国）知名度提升。适合推电子产品、快时尚。', 
        tags: ['电子产品','时尚','促销'] 
    },
    { 
        id: 36, name: '儿童节(法/意/西)', nameEn: 'Children’s Day South EU', emoji: '🎡', date: '11月20日', month: 11, 
        countries: ['FR','IT','ES'], type: 'holiday', 
        strategy: '世界儿童日。虽然不如圣诞隆重，但是玩具品类在黑五前的预热良机。', 
        tags: ['玩具','礼品'] 
    },
    { 
        id: 37, name: '黑色星期五', nameEn: 'Black Friday', emoji: '🖤', date: '11月28日', month: 11, 
        countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'shopping', 
        strategy: '全年最疯狂大促！电子、家电、时尚、家居全线爆发。务必保证库存充足。', 
        tags: ['全品类','大促','电子','家居'] 
    },

    // ==================== December (十二月) ====================
    { 
        id: 38, name: '网络星期一', nameEn: 'Cyber Monday', emoji: '💻', date: '12月1日', month: 12, 
        countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'shopping', 
        strategy: '黑五返场，侧重线上品类。电脑硬件、软件、游戏配件、智能家居转化率高。', 
        tags: ['电子产品','数码','软件'] 
    },
    { 
        id: 39, name: '圣尼古拉斯节', nameEn: 'St. Nicholas/Sinterklaas', emoji: '🎅', date: '12月5-6日', month: 12, 
        countries: ['NL','DE','PL'], type: 'holiday', 
        strategy: '荷兰(12月5日)最重要的送礼节日！德国/波兰(12月6日)鞋子里放糖果。玩具、巧克力是绝对主力。', 
        tags: ['玩具','巧克力','儿童礼品'] 
    },
    { 
        id: 40, name: '圣卢西亚节', nameEn: 'St. Lucia Day', emoji: '🕯️', date: '12月13日', month: 12, 
        countries: ['SE','IT'], type: 'cultural', 
        strategy: '瑞典和意大利北部传统。白色长袍、蜡烛头冠、烘焙模具、姜饼。', 
        tags: ['蜡烛','装饰','烘焙'] 
    },
    { 
        id: 41, name: '圣诞节', nameEn: 'Christmas', emoji: '🎄', date: '12月25日', month: 12, 
        countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'holiday', 
        strategy: '礼物交换高峰。所有礼品类目（玩具、电子、美妆、服饰）的最后冲刺。注意物流截单时间。', 
        tags: ['装饰','礼品','玩具','电子'] 
    },
    { 
        id: 42, name: '节礼日', nameEn: 'Boxing Day', emoji: '🎁', date: '12月26日', month: 12, 
        countries: ['GB','DE','NL','SE'], type: 'shopping', 
        strategy: '英国传统购物狂欢日。圣诞后清仓 + 新年礼物采购。适合捆绑销售和清库存。', 
        tags: ['清仓','促销','礼品'] 
    },
    { 
        id: 43, name: '跨年夜', nameEn: 'New Year Eve', emoji: '🥂', date: '12月31日', month: 12, 
        countries: ['DE','FR','IT','ES','NL','PL','GB','SE'], type: 'holiday', 
        strategy: '香槟杯、派对气球、彩带、荧光棒、2026数字造型眼镜。', 
        tags: ['派对','酒具','装饰'] 
    }
];