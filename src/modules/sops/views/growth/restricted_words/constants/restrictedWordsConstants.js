// 欧洲本土化高危词库常量
// 基于亚马逊欧洲站多年运营经验整理

// 风险等级定义
export const RISK_LEVELS = {
  1: { label: '提示', icon: 'ℹ️', color: 'blue' },
  2: { label: '注意', icon: '⚠️', color: 'yellow' },
  3: { label: '警告', icon: '⚡', color: 'orange' },
  4: { label: '严重', icon: '🚫', color: 'red' },
  5: { label: '致命', icon: '☠️', color: 'red' }
};

// 词库分类
export const WORD_CATEGORIES = {
  MAT: { label: '材质成分', icon: 'fa-shirt', color: 'purple' },
  CMP: { label: '合规声明', icon: 'fa-certificate', color: 'amber' },
  ENV: { label: '环保声明', icon: 'fa-leaf', color: 'green' },
  MED: { label: '医疗健康', icon: 'fa-heart-pulse', color: 'red' },
  ELE: { label: '电子产品', icon: 'fa-bolt', color: 'blue' },
  TOY: { label: '母婴玩具', icon: 'fa-baby', color: 'pink' },
  FOD: { label: '食品接触', icon: 'fa-utensils', color: 'orange' },
  MKT: { label: '营销话术', icon: 'fa-bullhorn', color: 'indigo' },
  GEO: { label: '地理标识', icon: 'fa-map-marker', color: 'teal' },
  IPR: { label: '知识产权', icon: 'fa-copyright', color: 'slate' }
};

// 欧洲站点
export const EU_SITES = ['DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'BE', 'UK'];

// 高危词库数据库
export const RESTRICTED_WORDS_DATABASE = [
  // === MAT 材质成分 (18) ===
  {
    id: 'MAT-001',
    keyword: 'Bamboo',
    variants: ['Bambus', 'Bambou', 'Bambù', 'Bambú'],
    category: 'MAT',
    subCategory: '纺织标签',
    riskLevel: 5,
    affectedSites: ['DE', 'FR', 'IT', 'ES', 'UK'],
    commonProducts: ['内裤', '袜子', '床品'],
    riskDescription: '德国纺织标签法禁止使用"Bamboo"，必须标注实际成分',
    legalBasis: 'Textilkennzeichnungsverordnung (EU) 1007/2011',
    alternatives: ['Viscose (Bamboo)', 'Bamboo Viscose', 'Regenerated Cellulose'],
    tips: '竹纤维本质是粘胶纤维，必须写化学成分'
  },
  {
    id: 'MAT-002',
    keyword: 'Lycra',
    variants: ['Elastan', 'Élasthanne', 'Elastam'],
    category: 'MAT',
    riskLevel: 4,
    affectedSites: ['DE', 'FR', 'IT', 'ES'],
    commonProducts: ['弹力裤', '运动服'],
    riskDescription: 'Lycra是杜邦商标，需写通用名称',
    legalBasis: 'EU 1007/2011',
    alternatives: ['Elastane', 'Spandex'],
    tips: 'Lycra®仅在获得授权时可用'
  },
  {
    id: 'MAT-003',
    keyword: 'PU Leather',
    variants: ['Kunstleder', 'Cuir synthétique'],
    category: 'MAT',
    riskLevel: 4,
    affectedSites: ['DE', 'UK'],
    commonProducts: ['手机壳', '包包', '鞋子'],
    riskDescription: '容易误导消费者以为是真皮',
    legalBasis: 'Misleading Advertising Directive',
    alternatives: ['Synthetic Leather', 'Faux Leather', 'Vegan Leather'],
    tips: '严禁写"Real Leather"或"Genuine Leather"'
  },
  {
    id: 'MAT-004',
    keyword: 'Genuine Leather',
    variants: ['Echtes Leder', 'Cuir véritable'],
    category: 'MAT',
    riskLevel: 5,
    affectedSites: ['DE', 'FR', 'IT'],
    commonProducts: ['皮具'],
    riskDescription: '需提供真皮证明，否则涉及欺诈',
    legalBasis: 'Consumer Rights Directive',
    alternatives: ['如确实是真皮，需标注来源：Cowhide/Sheepskin'],
    tips: '除非有原产地证明，否则禁用'
  },
  {
    id: 'MAT-005',
    keyword: 'Organic Cotton',
    variants: ['Bio-Baumwolle', 'Coton bio'],
    category: 'MAT',
    riskLevel: 4,
    affectedSites: ['DE', 'FR', 'NL'],
    commonProducts: ['婴儿服'],
    riskDescription: '需GOTS/OCS认证',
    legalBasis: 'Organic Regulation (EU) 2018/848',
    alternatives: ['Cotton (如无认证)'],
    tips: '必须附上认证编号'
  },

  // === CMP 合规声明 (15) ===
  {
    id: 'CMP-001',
    keyword: 'CE Certified',
    variants: ['CE-zertifiziert', 'Certifié CE'],
    category: 'CMP',
    riskLevel: 5,
    affectedSites: ['DE', 'FR', 'IT', 'ES', 'UK'],
    commonProducts: ['电子产品', '玩具'],
    riskDescription: 'CE是法定要求不能作为卖点，违反UCPD',
    legalBasis: 'Unfair Commercial Practices Directive 2005/29/EC',
    alternatives: ['符合欧盟标准但不宣传CE'],
    tips: 'CE标志需贴在产品上，不能写在Listing'
  },
  {
    id: 'CMP-002',
    keyword: 'FDA Approved',
    variants: ['FDA-zugelassen', 'Approuvé FDA'],
    category: 'CMP',
    riskLevel: 4,
    affectedSites: ['DE', 'FR', 'IT', 'ES', 'UK'],
    commonProducts: ['厨具', '美妆'],
    riskDescription: 'FDA是美国机构，欧洲不认可',
    legalBasis: 'N/A',
    alternatives: ['LFGB (德国)', 'CPNP (化妆品)'],
    tips: '改用欧盟对应认证'
  },
  {
    id: 'CMP-003',
    keyword: 'RoHS Compliant',
    variants: ['RoHS-konform'],
    category: 'CMP',
    riskLevel: 3,
    affectedSites: ['DE', 'UK'],
    commonProducts: ['电子产品'],
    riskDescription: 'RoHS是基本要求，不能作为卖点',
    legalBasis: 'RoHS Directive 2011/65/EU',
    alternatives: ['不宣传，产品自带声明即可'],
    tips: '同CE一样，属于门槛非卖点'
  },
  {
    id: 'CMP-004',
    keyword: 'REACH Certified',
    variants: ['REACH-zertifiziert'],
    category: 'CMP',
    riskLevel: 4,
    affectedSites: ['DE', 'FR'],
    commonProducts: ['化学品接触产品'],
    riskDescription: 'REACH是法规而非认证',
    legalBasis: 'REACH Regulation (EC) 1907/2006',
    alternatives: ['REACH-compliant materials (不用Certified)'],
    tips: '可写符合REACH，不能写"认证"'
  },
  {
    id: 'CMP-005',
    keyword: 'Lifetime Warranty',
    variants: ['Lebenslange Garantie', 'Garantie à vie'],
    category: 'CMP',
    riskLevel: 5,
    affectedSites: ['DE', 'FR', 'IT'],
    commonProducts: ['工具', '箱包'],
    riskDescription: '需完整条款链接，否则属虚假广告',
    legalBasis: 'Consumer Rights Directive',
    alternatives: ['2-Year Warranty', '24-Month Manufacturer Guarantee'],
    tips: '若无法兑现终身保修，严禁使用'
  },

  // === ENV 环保声明 (12) ===
  {
    id: 'ENV-001',
    keyword: 'Eco-Friendly',
    variants: ['Umweltfreundlich', 'Écologique'],
    category: 'ENV',
    riskLevel: 4,
    affectedSites: ['DE', 'FR', 'NL'],
    commonProducts: ['日用品'],
    riskDescription: '需具体证明，否则属"绿色洗涤"',
    legalBasis: 'Green Claims Directive (草案)',
    alternatives: ['Recyclable', 'Made from recycled materials (需认证)'],
    tips: '德国对环保声明要求极严'
  },
  {
    id: 'ENV-002',
    keyword: 'Biodegradable',
    variants: ['Biologisch abbaubar', 'Biodégradable'],
    category: 'ENV',
    riskLevel: 5,
    affectedSites: ['DE', 'FR'],
    commonProducts: ['塑料袋', '餐具'],
    riskDescription: '需EN13432认证，否则违法',
    legalBasis: 'EN 13432 Compostability Standard',
    alternatives: ['Compostable (需OK compost标志)'],
    tips: '必须标注降解时间和条件'
  },
  {
    id: 'ENV-003',
    keyword: '100% Recyclable',
    variants: ['100% recyclebar'],
    category: 'ENV',
    riskLevel: 4,
    affectedSites: ['DE', 'NL'],
    commonProducts: ['包装'],
    riskDescription: '需证明材料可循环利用',
    legalBasis: 'Packaging Directive',
    alternatives: ['Recyclable packaging (不写100%)'],
    tips: '除非有回收体系证明'
  },

  // === MED 医疗健康 (15) ===
  {
    id: 'MED-001',
    keyword: 'Antibacterial',
    variants: ['Antibakteriell', 'Antibactérien'],
    category: 'MED',
    riskLevel: 5,
    affectedSites: ['DE', 'FR', 'IT', 'ES'],
    commonProducts: ['砧板', '毛巾', '口罩'],
    riskDescription: '需BPR注册号，否则属非法生物杀灭剂声明',
    legalBasis: 'Biocidal Products Regulation (EU) 528/2012',
    alternatives: ['不作抗菌声明，或写Antimicrobial treatment (需BPR编号)'],
    tips: '抗菌产品需欧盟授权'
  },
  {
    id: 'MED-002',
    keyword: 'UV Sterilization',
    variants: ['UV-Sterilisation', 'Stérilisation UV'],
    category: 'MED',
    riskLevel: 5,
    affectedSites: ['DE', 'FR'],
    commonProducts: ['消毒盒'],
    riskDescription: '涉及医疗器械声明，需MDR认证',
    legalBasis: 'Medical Device Regulation (EU) 2017/745',
    alternatives: ['UV-C Light (不写Sterilization)'],
    tips: 'Sterilization属医疗术语'
  },
  {
    id: 'MED-003',
    keyword: 'Medical Grade',
    variants: ['Medizinische Qualität', 'Qualité médicale'],
    category: 'MED',
    riskLevel: 5,
    affectedSites: ['DE', 'FR', 'IT'],
    commonProducts: ['硅胶', '口罩'],
    riskDescription: '需医疗器械认证',
    legalBasis: 'MDR 2017/745',
    alternatives: ['High-quality silicone', 'Food-grade material'],
    tips: '除非是注册医疗器械'
  },

  // === ELE 电子产品 (10) ===
  {
    id: 'ELE-001',
    keyword: 'Energy Saving',
    variants: ['Energiesparend', 'Économie d\'énergie'],
    category: 'ELE',
    riskLevel: 4,
    affectedSites: ['DE', 'FR'],
    commonProducts: ['灯具', '电器'],
    riskDescription: '需EPREL能效标签',
    legalBasis: 'Energy Labelling Regulation (EU) 2017/1369',
    alternatives: ['Low power consumption (标明功率)'],
    tips: '必须有能效等级标签'
  },
  {
    id: 'ELE-002',
    keyword: '110V Compatible',
    variants: [],
    category: 'ELE',
    riskLevel: 5,
    affectedSites: ['DE', 'FR', 'IT', 'ES'],
    commonProducts: ['电器'],
    riskDescription: '欧洲是220-240V，写110V会误导',
    legalBasis: 'Low Voltage Directive',
    alternatives: ['220-240V', 'EU Plug'],
    tips: '检查电压范围'
  },

  // === TOY 母婴玩具 (20) ===
  {
    id: 'TOY-001',
    keyword: 'EN71 Certified',
    variants: ['EN71-zertifiziert'],
    category: 'TOY',
    subCategory: '标准认证',
    riskLevel: 4,
    affectedSites: ['DE', 'FR', 'IT', 'ES', 'UK'],
    commonProducts: ['儿童玩具'],
    riskDescription: '需TIC机构直接提交报告 (2025新政)',
    legalBasis: 'Toy Safety Directive 2009/48/EC, 新规EU 2025/2509',
    alternatives: ['Tested to EN71 standards (附TIC报告)'],
    tips: '报告有效期1年，需年审'
  },
  {
    id: 'TOY-002',
    keyword: 'EN71-3 Safe',
    variants: [],
    category: 'TOY',
    subCategory: '标准认证',
    riskLevel: 5,
    affectedSites: ['DE', 'FR', 'IT', 'ES'],
    commonProducts: ['涂料玩具', '彩笔'],
    riskDescription: '涉及重金属迁移测试，严格要求',
    legalBasis: 'EN 71-3:2019+A2:2024',
    alternatives: ['Complies with EN71-3 migration limits'],
    tips: 'EN71-3更新至2024版，2025年6月生效'
  },
  {
    id: 'TOY-003',
    keyword: 'Third-Party Tested',
    variants: ['Getestet durch Dritte'],
    category: 'TOY',
    subCategory: 'TIC认证',
    riskLevel: 4,
    affectedSites: ['DE', 'FR', 'IT', 'ES', 'UK'],
    commonProducts: ['玩具'],
    riskDescription: '需TIC服务商Direct Validation',
    legalBasis: 'Amazon TIC Policy 2025',
    alternatives: ['Tested by ISO 17025 accredited lab'],
    tips: '实验室需在亚马逊认可名单'
  },
  {
    id: 'TOY-004',
    keyword: 'BPA Free',
    variants: ['BPA-frei', 'Sans BPA'],
    category: 'TOY',
    subCategory: '化学安全',
    riskLevel: 4,
    affectedSites: ['DE', 'FR'],
    commonProducts: ['奶瓶', '咬胶'],
    riskDescription: '需EN71-9测试报告',
    legalBasis: 'EN 71-9 Organic Chemical Compounds',
    alternatives: ['BPA-free materials (附检测报告)'],
    tips: '需证明材料中无双酚A'
  },
  {
    id: 'TOY-005',
    keyword: 'Phthalate Free',
    variants: ['Phthalatfrei', 'Sans phtalates'],
    category: 'TOY',
    subCategory: '化学安全',
    riskLevel: 5,
    affectedSites: ['DE', 'FR', 'IT'],
    commonProducts: ['软塑玩具'],
    riskDescription: '邻苯二甲酸盐严格限制',
    legalBasis: 'REACH Annex XVII, EN71-3',
    alternatives: ['Phthalate-free (需迁移测试)'],
    tips: '0.1%限值，超标直接下架'
  },
  {
    id: 'TOY-006',
    keyword: 'Lead Free',
    variants: ['Bleifrei', 'Sans plomb'],
    category: 'TOY',
    subCategory: '化学安全',
    riskLevel: 5,
    affectedSites: ['DE', 'FR', 'IT', 'ES'],
    commonProducts: ['涂层玩具'],
    riskDescription: '铅含量有严格限制',
    legalBasis: 'EN71-3',
    alternatives: ['Complies with EN71-3 lead limits (<90ppm)'],
    tips: '必须有迁移测试报告'
  },
  {
    id: 'TOY-007',
    keyword: 'Phenol Free',
    variants: ['Phenolfrei'],
    category: 'TOY',
    subCategory: '化学安全',
    riskLevel: 4,
    affectedSites: ['DE', 'FR'],
    commonProducts: ['0-36个月玩具'],
    riskDescription: 'EN71-15新增要求',
    legalBasis: 'EN 71-15 (draft)',
    alternatives: ['Phenol content below EN71-15 limits'],
    tips: '2025新标准'
  },
  {
    id: 'TOY-008',
    keyword: '0-3 Years',
    variants: ['0-36 Monate', '0-36 mois'],
    category: 'TOY',
    subCategory: '年龄标识',
    riskLevel: 5,
    affectedSites: ['DE', 'FR', 'IT', 'ES'],
    commonProducts: ['婴幼儿玩具'],
    riskDescription: '触发最严格小部件测试',
    legalBasis: 'EN71-1:2014+A1:2018',
    alternatives: ['标注准确年龄，附Choking Hazard警告'],
    tips: '3岁以下需通过小部件测试'
  },
  {
    id: 'TOY-009',
    keyword: 'Choking Hazard',
    variants: ['Erstickungsgefahr', 'Risque d\'étouffement'],
    category: 'TOY',
    subCategory: '警告标识',
    riskLevel: 4,
    affectedSites: ['DE', 'FR', 'IT', 'ES'],
    commonProducts: ['小部件玩具'],
    riskDescription: '必须按规定标注警告',
    legalBasis: 'Toy Safety Directive',
    alternatives: ['Warning: Not suitable for children under 3'],
    tips: '警告需清晰可见'
  },
  {
    id: 'TOY-010',
    keyword: 'Slime',
    variants: ['Schleim', 'Pâte gluante'],
    category: 'TOY',
    subCategory: '特殊类型',
    riskLevel: 5,
    affectedSites: ['DE', 'FR', 'IT'],
    commonProducts: ['史莱姆玩具'],
    riskDescription: '需EN71-5实验套装标准 + 硼砂限制',
    legalBasis: 'EN 71-5:2015, EN71-15',
    alternatives: ['需标注Boron含量'],
    tips: '硼迁移量<300mg/kg'
  },
  {
    id: 'TOY-011',
    keyword: 'Bath Toy',
    variants: ['Badespielzeug', 'Jouet de bain'],
    category: 'TOY',
    subCategory: '特殊类型',
    riskLevel: 5,
    affectedSites: ['DE', 'FR'],
    commonProducts: ['洗澡玩具'],
    riskDescription: '微生物安全EN71-20要求',
    legalBasis: 'EN 71-20 (draft)',
    alternatives: ['需防霉处理证明'],
    tips: '水接触玩具需特殊测试'
  },

  // === FOD 食品接触 (10) ===
  {
    id: 'FOD-001',
    keyword: 'Food Grade',
    variants: ['Lebensmittelecht', 'Contact alimentaire'],
    category: 'FOD',
    riskLevel: 4,
    affectedSites: ['DE', 'FR'],
    commonProducts: ['餐具', '保鲜盒'],
    riskDescription: '需LFGB测试',
    legalBasis: 'LFGB (German Food Law)',
    alternatives: ['LFGB tested', 'EU 10/2011 compliant'],
    tips: '德国站需LFGB，其他可用EU 10/2011'
  },

  // === MKT 营销话术 (12) ===
  {
    id: 'MKT-001',
    keyword: 'Best Seller',
    variants: ['Bestseller', 'Meilleur vendeur'],
    category: 'MKT',
    riskLevel: 3,
    affectedSites: ['DE', 'FR', 'UK'],
    commonProducts: ['所有类目'],
    riskDescription: '需证明，否则属虚假广告',
    legalBasis: 'UCPD',
    alternatives: ['Popular choice', 'Highly rated'],
    tips: '德国对Best/No.1等声明要求严格'
  },
  {
    id: 'MKT-002',
    keyword: 'German Quality',
    variants: ['Deutsche Qualität'],
    category: 'MKT',
    riskLevel: 5,
    affectedSites: ['DE'],
    commonProducts: ['所有类目'],
    riskDescription: '非德国制造禁用，涉及原产地欺诈',
    legalBasis: 'Made in Germany Protection',
    alternatives: ['High quality (不提国家)'],
    tips: '除非有德国原产地证明'
  },
  {
    id: 'MKT-003',
    keyword: '100% Satisfaction Guaranteed',
    variants: ['100% Zufriedenheitsgarantie'],
    category: 'MKT',
    riskLevel: 4,
    affectedSites: ['DE', 'FR'],
    commonProducts: ['所有类目'],
    riskDescription: '需明确退款政策',
    legalBasis: 'Consumer Rights Directive',
    alternatives: ['30-day return policy'],
    tips: '空洞承诺属虚假广告'
  },

  // === GEO 地理标识 (5) ===
  {
    id: 'GEO-001',
    keyword: 'Champagne',
    variants: [],
    category: 'GEO',
    riskLevel: 5,
    affectedSites: ['FR', 'DE', 'IT', 'ES', 'UK'],
    commonProducts: ['香槟酒'],
    riskDescription: '受PDO保护，仅法国香槟区产品可用',
    legalBasis: 'PDO Regulation (EU) 1151/2012',
    alternatives: ['Sparkling Wine'],
    tips: '地理标识受严格保护'
  },

  // === IPR 知识产权 (8) ===
  {
    id: 'IPR-001',
    keyword: 'Apple Compatible',
    variants: [],
    category: 'IPR',
    riskLevel: 4,
    affectedSites: ['DE', 'FR', 'UK'],
    commonProducts: ['手机配件'],
    riskDescription: '需MFi认证，否则侵权',
    legalBasis: 'Trademark Law',
    alternatives: ['Compatible with iPhone (如无MFi则标注Not MFi certified)'],
    tips: '品牌词需谨慎'
  }
];

// 辅助函数：按分类获取词条
export function getWordsByCategory(categoryCode) {
  return RESTRICTED_WORDS_DATABASE.filter(w => w.category === categoryCode);
}

// 辅助函数：按风险等级获取词条
export function getWordsByRiskLevel(level) {
  return RESTRICTED_WORDS_DATABASE.filter(w => w.riskLevel === level);
}

// 辅助函数：按站点获取词条
export function getWordsBySite(siteCode) {
  return RESTRICTED_WORDS_DATABASE.filter(w => w.affectedSites.includes(siteCode));
}
