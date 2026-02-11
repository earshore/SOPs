import { AnalysisResult } from '../types/analysis';
import { analysisTargets } from './analysisTargets';

export const generateMockResults = (targetIds: string[], _asin: string): AnalysisResult[] => {
  const results: AnalysisResult[] = [];

  const getTarget = (id: string) => analysisTargets.find(t => t.id === id);

  if (targetIds.includes('title-keywords')) {
    const target = getTarget('title-keywords')!;
    results.push({
      targetId: 'title-keywords',
      title: '标题核心词根',
      source: 'Listings',
      icon: target.icon,
      color: target.color,
      stats: [
        { label: '核心词根识别率', value: '87%' },
        { label: '高权重词根', value: '12个' },
        { label: '品牌词占比', value: '15%' }
      ],
      highlights: [
        { text: 'wireless charger - 核心类目词，搜索量最高', type: 'info' },
        { text: 'fast charging - 功能核心词，高转化属性', type: 'info' },
        { text: 'magnetic - 差异化特征词，建议重点布局', type: 'success' },
        { text: 'MagSafe compatible - 兼容性词根，精准人群', type: 'info' }
      ],
      details: [
        { category: '一级核心词', items: ['wireless charger', 'charging pad', 'phone charger'] },
        { category: '二级修饰词', items: ['fast', 'magnetic', 'portable', '15W', 'slim'] },
        { category: '场景词', items: ['desk', 'bedside', 'car', 'travel', 'office'] },
        { category: '人群词', items: ['iPhone 15', 'iPhone 14', 'Samsung', 'Android'] }
      ]
    });
  }

  if (targetIds.includes('selling-points')) {
    const target = getTarget('selling-points')!;
    results.push({
      targetId: 'selling-points',
      title: '卖点结构拆解',
      source: 'Listings',
      icon: target.icon,
      color: target.color,
      stats: [
        { label: '功能型卖点', value: '45%' },
        { label: '场景型卖点', value: '30%' },
        { label: '痛点解决型', value: '25%' }
      ],
      highlights: [
        { text: '差异化核心：磁吸定位 + 散热设计', type: 'success' },
        { text: '主打人群：iPhone 12及以上用户', type: 'info' },
        { text: '核心场景：桌面/床头无线充电', type: 'info' }
      ],
      details: [
        { category: '功能维度', items: ['15W快充', '磁吸对准', '多重保护', 'LED指示灯', '超薄设计'] },
        { category: '场景维度', items: ['办公桌面', '床头柜', '旅行携带', '车载使用', '礼品赠送'] },
        { category: '痛点解决', items: ['线缆杂乱', '充电慢', '发热严重', '对准困难', '占用空间'] }
      ]
    });
  }

  if (targetIds.includes('fatal-flaws')) {
    const target = getTarget('fatal-flaws')!;
    results.push({
      targetId: 'fatal-flaws',
      title: '致命劝退点',
      source: 'Reviews',
      icon: target.icon,
      color: target.color,
      stats: [
        { label: '产品缺陷提及率', value: '23%' },
        { label: '退货主因数', value: '3个' },
        { label: '可修复问题', value: '2个' }
      ],
      highlights: [
        { text: '充电速度虚标 - 实测仅7.5W，远低于宣称15W', type: 'danger' },
        { text: '磁吸力偏弱 - 手机轻触即脱落，带壳更严重', type: 'danger' },
        { text: '发热自动断电 - 充电30分钟后频繁中断', type: 'danger' }
      ],
      details: [
        { category: '高频差评词', items: ['slow charging', 'weak magnet', 'overheating', 'stopped working', 'falls off'] },
        { category: '退货根因', items: ['速度不达标', '磁力不足', '质量问题', '兼容性差'] },
        { category: '情绪标签', items: ['失望', '被欺骗感', '愤怒', '不推荐', '浪费钱'] }
      ]
    });
  }

  if (targetIds.includes('wow-moments')) {
    const target = getTarget('wow-moments')!;
    results.push({
      targetId: 'wow-moments',
      title: '惊喜顿悟时刻',
      source: 'Reviews',
      icon: target.icon,
      color: target.color,
      stats: [
        { label: '"超预期"提及', value: '156次' },
        { label: '高情感场景', value: '5个' },
        { label: '可复用素材', value: '12条' }
      ],
      highlights: [
        { text: '"没想到这么快就充满了" - 充电速度超预期', type: 'success' },
        { text: '"磁吸力比官方的还强" - 产品质量惊喜', type: 'success' },
        { text: '"颜值完全超出预期" - 外观设计加分', type: 'success' }
      ],
      details: [
        { category: '超预期瞬间', items: ['开箱颜值惊艳', '充电速度快', '磁吸定位精准', '静音无噪音', '发热控制好'] },
        { category: '情感触发词', items: ['surprised', 'amazed', 'love it', 'better than expected', 'worth every penny', 'game changer'] },
        { category: '高转化文案', items: ['一放就吸住', '睡前放上去，早起就满电', '比官方还好用', '性价比之王'] }
      ]
    });
  }

  if (targetIds.includes('hesitation-points')) {
    const target = getTarget('hesitation-points')!;
    results.push({
      targetId: 'hesitation-points',
      title: '购买前犹豫点',
      source: 'Reviews',
      icon: target.icon,
      color: target.color,
      stats: [
        { label: '犹豫转化点', value: '7个' },
        { label: '高频疑虑', value: '5类' },
        { label: 'Q&A优化项', value: '5条' }
      ],
      highlights: [
        { text: '担心不兼容手机壳 → 实测支持2mm薄壳', type: 'warning' },
        { text: '担心充电太慢 → 实际2小时充满很快', type: 'warning' },
        { text: '担心做工差 → 质感意外的好', type: 'warning' }
      ],
      details: [
        { category: '购前疑虑', items: ['手机壳兼容性', '充电速度', '产品质量', '散热性能', '品牌可靠性'] },
        { category: '疑虑消除证据', items: ['支持2mm以内手机壳', '实测充电数据', '开箱视频展示', '散热测试结果'] },
        { category: 'Q&A优化建议', items: ['明确手机壳厚度限制', '列出实测充电时间', '强调质保政策', '提供温度测试数据'] }
      ]
    });
  }

  if (targetIds.includes('buyer-profile')) {
    const target = getTarget('buyer-profile')!;
    results.push({
      targetId: 'buyer-profile',
      title: '画像与场景侧写',
      source: 'Reviews',
      icon: target.icon,
      color: target.color,
      stats: [
        { label: '核心用户画像', value: '4类' },
        { label: '使用场景', value: '6个' },
        { label: '购买动机', value: '5种' }
      ],
      highlights: [
        { text: '职场白领 - 桌面充电站，追求整洁办公', type: 'info' },
        { text: '年轻女性 - 床头便捷充电，颜值控', type: 'info' },
        { text: '礼品购买者 - 送给家人朋友，包装精美加分', type: 'info' }
      ],
      details: [
        { category: '买家身份', items: ['iPhone用户', '职场办公人群', '品质生活追求者', '科技爱好者', '礼品采购者'] },
        { category: '使用场景', items: ['办公桌面日常充电', '床头睡前充电', '旅行便携使用', '送礼场景', '车载使用', '多设备充电'] },
        { category: '购买动机', items: ['告别线缆杂乱', '升级充电体验', '颜值即正义', '朋友推荐', '看到广告种草'] }
      ]
    });
  }

  if (targetIds.includes('vocab-gap')) {
    const target = getTarget('vocab-gap')!;
    results.push({
      targetId: 'vocab-gap',
      title: '词汇鸿沟分析',
      source: 'Reviews',
      icon: target.icon,
      color: target.color,
      stats: [
        { label: '词汇覆盖率', value: '68%' },
        { label: '未覆盖高频词', value: '9个' },
        { label: '优化潜力', value: '中高' }
      ],
      highlights: [
        { text: '商家说 "rapid charging" → 买家说 "fast"', type: 'warning' },
        { text: '商家说 "premium quality" → 买家说 "solid"', type: 'warning' },
        { text: '商家未提及 → 买家常说 "nightstand"', type: 'danger' }
      ],
      details: [
        { category: '买家高频词（Listing未覆盖）', items: ['nightstand', 'overnight', 'desk setup', 'clean look', 'one-handed', 'daily driver'] },
        { category: '商家 vs 买家用词对比', items: ['rapid charging → fast/quick', 'premium quality → solid/sturdy', 'innovative design → sleek/minimal', 'advanced tech → works great'] },
        { category: 'Listing优化建议', items: ['标题增加"nightstand"', '卖点突出"one-handed"', '描述融入"desk setup"', '增加"daily use"场景词'] }
      ]
    });
  }

  if (targetIds.includes('promise-reality')) {
    const target = getTarget('promise-reality')!;
    results.push({
      targetId: 'promise-reality',
      title: '承诺/现实断层',
      source: 'Reviews',
      icon: target.icon,
      color: target.color,
      stats: [
        { label: '断层风险点', value: '3个' },
        { label: '虚标程度', value: '中等' },
        { label: '需修正项', value: '4处' }
      ],
      highlights: [
        { text: '宣称15W快充 → 实测仅7.5W（严重断层）', type: 'danger' },
        { text: '宣称超强磁力 → 带壳易脱落（部分属实）', type: 'warning' },
        { text: '宣称静音设计 → 确实无噪音（符合预期）', type: 'success' }
      ],
      details: [
        { category: '严重断层', items: ['充电功率虚标（15W→7.5W）', '磁吸力描述夸大', '充电时间不符'] },
        { category: '轻微偏差', items: ['手机壳兼容性限制', '充电时间略长', '发热比预期高'] },
        { category: '符合预期', items: ['静音设计', 'LED指示灯', '包装质量', '外观颜值'] },
        { category: '修正建议', items: ['标注实际功率范围', '明确手机壳厚度', '提供真实充电时间', '调整磁力措辞'] }
      ]
    });
  }

  return results;
};
