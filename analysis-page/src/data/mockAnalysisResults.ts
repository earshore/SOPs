/**
 * 基于真实数据生成的模拟分析结果
 * 这些结果模拟 AI 实际返回的分析内容
 */

import { AnalysisResult } from '../types/analysis';
import { analysisTargets } from './analysisTargets';
import { Product } from './sampleData';

export function generateRealDataResults(targetIds: string[], product: Product): AnalysisResult[] {
  const results: AnalysisResult[] = [];
  const getTarget = (id: string) => analysisTargets.find(t => t.id === id);

  // 统计评论数据
  const fiveStarReviews = product.customer_reviews.filter(r => r.star_rating === 5);
  const lowStarReviews = product.customer_reviews.filter(r => r.star_rating <= 3);

  if (targetIds.includes('title-keywords')) {
    const target = getTarget('title-keywords')!;
    results.push({
      targetId: 'title-keywords',
      title: '标题核心词根',
      source: 'Listings',
      icon: target.icon,
      color: target.color,
      stats: [
        { label: '核心词根数', value: '8个' },
        { label: '品牌词占比', value: '12%' },
        { label: '优化潜力', value: '中高' }
      ],
      highlights: [
        { text: 'Perfume Men / Cologne for Men - 核心类目词，决定主流量入口', type: 'info' },
        { text: 'Long Lasting - 功能核心词，直击用户核心需求', type: 'success' },
        { text: 'Nightclub Essential - 场景差异化词，精准定位夜店人群', type: 'success' },
        { text: 'Aromatic Woody Notes - 香调描述词，吸引偏好用户', type: 'info' }
      ],
      details: [
        { category: '一级核心词（类目）', items: ['Perfume Men', 'Cologne for Men', 'Fragrance', 'Men Perfume'] },
        { category: '二级功能词', items: ['Long Lasting', '50ml/1.7oz', 'Aromatic', 'Woody Notes'] },
        { category: '场景/人群词', items: ['Nightclub Essential', 'Daily Elegance', 'Ideal Occasions', 'Gent\'s'] },
        { category: '香调词', items: ['Mint', 'Lemon', 'Woody', 'Aromatic'] },
        { category: '已剔除品牌词', items: ['Ycz', 'YCZ', 'CLUB GENT\'S AROMA'] }
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
        { label: '功能型卖点', value: '40%' },
        { label: '场景型卖点', value: '35%' },
        { label: '信任型卖点', value: '25%' }
      ],
      highlights: [
        { text: '核心差异化：夜店/Club场景 + 6小时持久留香', type: 'success' },
        { text: '礼品定位明确：黑色包装+蓝色玻璃瓶，强调送礼场景', type: 'info' },
        { text: '持久时间承诺 "mehr als 6 Stunden" 需关注是否兑现', type: 'warning' }
      ],
      details: [
        { category: '功能维度', items: ['50ml便携装', '6小时+持久', '芳香木质调', '无残留配方', '肌肤安全'] },
        { category: '场景维度', items: ['夜店/Club', '旅行携带', '日常通勤', '礼品赠送', '各类场合'] },
        { category: '痛点解决', items: ['随时补香需求', '送礼选择困难', '敏感肌顾虑', '香水留痕问题'] },
        { category: '情感钩子', items: ['散发自信', '令人难忘', '吸引注意力', '神秘优雅'] },
        { category: '信任背书', items: ['品牌信誉YCZ', '品质保证', '售后服务承诺'] }
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
        { label: '差评数', value: `${lowStarReviews.length}条` },
        { label: '致命问题', value: '2个' },
        { label: '风险等级', value: '中高' }
      ],
      highlights: [
        { text: '"It\'s a scam" / "It\'s not perfume" - 产品真实性遭质疑（严重）', type: 'danger' },
        { text: '"doesn\'t stay for long" - 留香时间与承诺不符（Listing承诺6小时+）', type: 'danger' },
        { text: '"Expensive for the amount" - 性价比质疑（50ml定价偏高）', type: 'warning' }
      ],
      details: [
        { category: '核心退货原因', items: ['产品真实性质疑', '留香时间短', '性价比不足'] },
        { category: '用户原话', items: ['"Do not get this product"', '"It\'s a scam"', '"doesn\'t stay for long"', '"Expensive for the amount"'] },
        { category: '期望落差', items: ['期望真香水→质疑假货', '期望持久留香→实际短暂', '期望物有所值→感觉太贵'] },
        { category: '改进建议', items: ['强化正品证明', '调整持久时间话术', '增加容量感知', '提供留香技巧'] }
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
        { label: '5星好评', value: `${fiveStarReviews.length}条` },
        { label: '惊喜触发词', value: '3个' },
        { label: '文案素材', value: '4条' }
      ],
      highlights: [
        { text: '"Great smell" / "Smells great" - 香味获得高度认可', type: 'success' },
        { text: '"Très bon" - 跨语言好评，品质获法语区认可', type: 'success' },
        { text: '"Ich finde das Parfum super" - 德语区正面评价', type: 'success' }
      ],
      details: [
        { category: '超预期瞬间', items: ['开瓶闻香那一刻', '收到实物包装', '香味品质认可'] },
        { category: '情感触发词', items: ['super', 'great', 'très bon', 'smells great'] },
        { category: '高转化文案素材', items: ['Great smell that impresses', '多国用户一致好评的香味', '打开那一刻就知道选对了'] },
        { category: '可复用评价', items: ['Smells great 👃 👍', 'Parfum super', 'Très bon'] }
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
        { label: '识别犹豫点', value: '4个' },
        { label: 'Q&A优化项', value: '4条' },
        { label: '转化潜力', value: '高' }
      ],
      highlights: [
        { text: '香味是否正宗？ → "Great smell" 多人验证', type: 'warning' },
        { text: '50ml够用多久？ → 需明确每日使用预估', type: 'warning' },
        { text: '是否适合送礼？ → Listing已覆盖礼品定位', type: 'info' }
      ],
      details: [
        { category: '购前疑虑', items: ['香味是否如描述', '留香时间真实性', '容量是否够用', '是否正品', '是否适合送礼'] },
        { category: '需要强化的信任点', items: ['真实留香测试数据', '每日用量说明', '正品防伪标识', '退换货保障'] },
        { category: 'Q&A优化建议', items: ['Q: 香味持续多久？建议如实回答2-4小时', 'Q: 50ml能用多久？提供每日1-2次约60天', 'Q: 如何辨别正品？展示防伪验证方式'] },
        { category: '评论中的答案', items: ['香味确实好闻', '包装精美适合送礼', '但留香时间有争议'] }
      ]
    });
  }

  if (targetIds.includes('buyer-profile')) {
    const target = getTarget('buyer-profile')!;
    const countries = [...new Set(product.customer_reviews.map(r => r.origin_country))];
    results.push({
      targetId: 'buyer-profile',
      title: '画像与场景侧写',
      source: 'Reviews',
      icon: target.icon,
      color: target.color,
      stats: [
        { label: '覆盖国家', value: `${countries.length}个` },
        { label: '核心人群', value: '2类' },
        { label: '使用场景', value: '3个' }
      ],
      highlights: [
        { text: '核心用户：追求品味的年轻男性，关注社交场合形象', type: 'info' },
        { text: '国际化市场：德国、加拿大、英国多地区购买', type: 'info' },
        { text: '送礼场景：明确有礼品购买需求', type: 'success' }
      ],
      details: [
        { category: '买家身份', items: ['25-40岁男性', '夜生活爱好者', '社交活跃人群', '品味追求者', '礼品采购者'] },
        { category: '地理分布', items: countries },
        { category: '使用场景', items: ['夜店/酒吧社交', '日常通勤', '约会场合', '特殊节日', '送礼场景'] },
        { category: '购买动机', items: ['打造个人魅力', '社交场合加分', '寻找特别礼物', '尝试新香味'] },
        { category: '语言偏好', items: ['德语区用户', '英语区用户', '法语区用户'] }
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
        { label: '词汇覆盖率', value: '72%' },
        { label: '未覆盖词', value: '5个' },
        { label: '优化空间', value: '中' }
      ],
      highlights: [
        { text: '商家说 "Long Lasting 6+ hours" → 买家说 "doesn\'t stay long"', type: 'danger' },
        { text: '商家说 "Aromatic Woody" → 买家直接说 "smell" / "smells great"', type: 'warning' },
        { text: '买家用 "scam" 质疑 → Listing缺乏真实性证明词汇', type: 'danger' }
      ],
      details: [
        { category: '商家高频词（Listing）', items: ['Long Lasting', 'Aromatic Woody', 'Elegant', 'Premium', '6+ hours', 'Club Fragrance'] },
        { category: '买家高频词（Reviews）', items: ['smell', 'great', 'super', 'scam', 'expensive', 'doesn\'t stay'] },
        { category: '鸿沟词汇（需关注）', items: ['scam → 需增加正品证明', 'expensive → 需强调价值感', 'doesn\'t stay → 需调整持久承诺'] },
        { category: 'Listing优化建议', items: ['增加 "authentic/genuine" 正品词', '减少过度承诺词汇', '加入真实用户评价词', '简化香调描述用词'] }
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
        { label: '断层问题', value: '2个' },
        { label: '虚标风险', value: '中高' },
        { label: '需修正项', value: '3处' }
      ],
      highlights: [
        { text: '宣称 "mehr als 6 Stunden持久" → 用户反馈 "doesn\'t stay for long"（严重断层）', type: 'danger' },
        { text: '定位 "Premium/Excellence" → 用户质疑 "It\'s a scam"（信任断层）', type: 'danger' },
        { text: '宣称 "Aromatic Woody香调" → 用户认可 "Great smell"（符合预期）', type: 'success' }
      ],
      details: [
        { category: '严重断层', items: ['留香时间6小时+ vs 实际留香短暂', '品牌信誉承诺 vs 被质疑为假货'] },
        { category: '轻微偏差', items: ['50ml定价 vs 用户觉得贵', '容量感知不足'] },
        { category: '符合预期', items: ['香味品质获认可', '包装设计符合描述'] },
        { category: '修正建议', items: ['将"6+ hours"改为"2-4小时"或删除', '增加正品验证/授权证明', '提供用量指南增加价值感', '收集更多正面评价展示'] }
      ]
    });
  }

  return results;
}
