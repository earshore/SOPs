// src/modules/sops/views/growth/npi_tracker/data/mockData.js
// ================================================================
// 🎯 NPI Tracker 模拟数据
// 用于演示和测试，生产环境应从API加载
// ================================================================

/**
 * 模拟产品数据
 * @type {Array<Object>}
 */
export const MOCK_PRODUCTS = [
    {
        stage: 'new-test',
        arrival_date: '2024-01-15',
        product_attr: '明星产品',
        sku: 'DE-WIDGET-001',
        cn_name: '多功能收纳盒',
        store: '1组-Altear',
        asin: 'B0CXXXXXXX1',
        fnsku: 'X001234567',
        site: 'DE',
        qty_shipped: 500,
        inventory_days: 45,
        is_pan_eu: true,
        check_content: true,
        check_sensitive: true,
        check_creative: false,
        check_ebc: true,
        delivery_fee: 4.5,
        market_avg_price: 19.99,
        sessions: 1250,
        ctr_7d: 0.68,
        cvr_7d: 12.5,
        acoas: 35,
        organic_ratio: 45,
        vine_status: '15/30',
        ads_strategy: 'mixed',
        decision: 'keep',
        next_step: ['加VINE (0评论)'],
        break_even: 12.0
    },
    {
        stage: 'growth',
        arrival_date: '2024-01-08',
        product_attr: '潜力款',
        sku: 'FR-GADGET-002',
        cn_name: '便携充电器',
        store: '1组-Altear',
        asin: 'B0CXXXXXXX2',
        fnsku: 'X001234568',
        site: 'FR',
        qty_shipped: 300,
        inventory_days: 28,
        is_pan_eu: true,
        check_content: true,
        check_sensitive: true,
        check_creative: true,
        check_ebc: true,
        delivery_fee: 3.2,
        market_avg_price: 14.99,
        sessions: 890,
        ctr_7d: 0.45,
        cvr_7d: 8.2,
        acoas: 42,
        organic_ratio: 38,
        vine_status: '30/30',
        ads_strategy: 'manual',
        decision: 'keep',
        next_step: ['降价/Coupon (CVR低)'],
        break_even: 9.5
    },
    {
        stage: 'stable',
        arrival_date: '2023-10-01',
        product_attr: '稳定款',
        sku: 'GB-HOME-003',
        cn_name: '厨房收纳架',
        store: '1组-Altear',
        asin: 'B0CXXXXXXX3',
        fnsku: 'X001234570',
        site: 'GB',
        qty_shipped: 800,
        inventory_days: 35,
        is_pan_eu: false,
        check_content: true,
        check_sensitive: true,
        check_creative: true,
        check_ebc: true,
        delivery_fee: 5.2,
        market_avg_price: 24.99,
        sessions: 2100,
        ctr_7d: 0.85,
        cvr_7d: 15.2,
        acoas: 18,
        organic_ratio: 62,
        vine_status: '30/30',
        ads_strategy: 'manual',
        decision: 'keep',
        next_step: [],
        break_even: 14.0
    },
    {
        stage: 'clearance',
        arrival_date: '2023-11-20',
        product_attr: '清仓品',
        sku: 'IT-OLD-004',
        cn_name: '旧款手机壳',
        store: '1组-Altear',
        asin: 'B0CXXXXXXX4',
        fnsku: 'X001234569',
        site: 'IT',
        qty_shipped: 200,
        inventory_days: 95,
        is_pan_eu: true,
        check_content: true,
        check_sensitive: true,
        check_creative: true,
        check_ebc: false,
        delivery_fee: 2.8,
        market_avg_price: 9.99,
        sessions: 120,
        ctr_7d: 0.25,
        cvr_7d: 3.1,
        acoas: 85,
        organic_ratio: 15,
        vine_status: '30/30',
        ads_strategy: 'auto',
        decision: 'kill',
        next_step: ['清仓 (扶不起)'],
        break_even: 7.0
    },
    {
        stage: 'new-test',
        arrival_date: '2024-01-20',
        product_attr: '测款',
        sku: 'ES-NEW-005',
        cn_name: '户外背包',
        store: '10组-Aiacbof Sarl',
        asin: 'B0CXXXXXXX5',
        fnsku: 'X001234571',
        site: 'ES',
        qty_shipped: 200,
        inventory_days: 10,
        is_pan_eu: true,
        check_content: false,
        check_sensitive: true,
        check_creative: false,
        check_ebc: false,
        delivery_fee: 6.5,
        market_avg_price: 39.99,
        sessions: 450,
        ctr_7d: 0.52,
        cvr_7d: 5.8,
        acoas: 65,
        organic_ratio: 20,
        vine_status: '0/30',
        ads_strategy: 'auto',
        decision: 'keep',
        next_step: ['加VINE (0评论)'],
        break_even: 18.0
    }
];

/**
 * 产品阶段配置
 */
export const STAGE_CONFIG = {
    'new-test': { label: '新品-测款', color: 'bg-blue-100 text-blue-700' },
    'growth': { label: '成长期', color: 'bg-emerald-100 text-emerald-700' },
    'stable': { label: '稳定期', color: 'bg-purple-100 text-purple-700' },
    'clearance': { label: '清仓期', color: 'bg-red-100 text-red-700' }
};

/**
 * 站点标志
 */
export const SITE_FLAGS = {
    'DE': '🇩🇪', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸', 'GB': '🇬🇧',
    'NL': '🇳🇱', 'SE': '🇸🇪', 'PL': '🇵🇱', 'BE': '🇧🇪'
};

/**
 * 站点域名
 */
export const SITE_DOMAINS = {
    'DE': 'amazon.de', 'FR': 'amazon.fr', 'IT': 'amazon.it', 'ES': 'amazon.es', 'GB': 'amazon.co.uk',
    'NL': 'amazon.nl', 'SE': 'amazon.se', 'PL': 'amazon.pl', 'BE': 'amazon.com.be'
};

/**
 * 店铺列表
 */
export const STORE_LIST = [
    '全部店铺',
    '1组-Altear',
    '10组-Aiacbof Sarl',
    '2组-Beltrix',
    '3组-Celtron'
];

/**
 * 站点列表
 */
export const SITE_LIST = [
    { code: 'DE', name: '德国', flag: '🇩🇪' },
    { code: 'FR', name: '法国', flag: '🇫🇷' },
    { code: 'IT', name: '意大利', flag: '🇮🇹' },
    { code: 'ES', name: '西班牙', flag: '🇪🇸' },
    { code: 'GB', name: '英国', flag: '🇬🇧' },
    { code: 'NL', name: '荷兰', flag: '🇳🇱' },
    { code: 'PL', name: '波兰', flag: '🇵🇱' },
    { code: 'SE', name: '瑞典', flag: '🇸🇪' }
];

export default {
    MOCK_PRODUCTS,
    STAGE_CONFIG,
    SITE_FLAGS,
    SITE_DOMAINS,
    STORE_LIST,
    SITE_LIST
};
