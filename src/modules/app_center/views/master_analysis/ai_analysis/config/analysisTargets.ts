/**
 * AI智能分析 - 分析目标配置
 */

import { AnalysisTarget } from '../types';

export const analysisTargets: AnalysisTarget[] = [
  {
    id: 'title-keywords',
    name: '标题核心词根',
    description: '分析竞品标题，剔除品牌与修饰词，提取决定流量属性的绝对核心词根。',
    source: 'Listings',
    icon: 'fa-solid fa-font',
    color: 'blue',
  },
  {
    id: 'selling-points',
    name: '卖点结构拆解',
    description: '将五点描述解构为"功能-场景-痛点"矩阵，识别竞品主打的差异化策略。',
    source: 'Listings',
    icon: 'fa-solid fa-layer-group',
    color: 'cyan',
  },
  {
    id: 'fatal-flaws',
    name: '致命劝退点',
    description: '从1-3星评论中提炼导致退货的根本原因（非物流），用于规避产品缺陷。',
    source: 'Reviews',
    icon: 'fa-solid fa-triangle-exclamation',
    color: 'red',
  },
  {
    id: 'wow-moments',
    name: '惊喜顿悟时刻',
    description: '提取5星评论中用户表示"超出预期"的具体瞬间，这是高转化率文案的核心素材。',
    source: 'Reviews',
    icon: 'fa-solid fa-star',
    color: 'amber',
  },
  {
    id: 'hesitation-points',
    name: '购买前犹豫点',
    description: '挖掘"购买前曾担心，但收到后放心了"的评论，用于替代Q&A填补信息盲区。',
    source: 'Reviews',
    icon: 'fa-solid fa-circle-question',
    color: 'orange',
  },
  {
    id: 'buyer-profile',
    name: '画像与场景侧写',
    description: '基于评论用语推断买家身份（谁在买）和具体使用场景（在哪里用）。',
    source: 'Reviews',
    icon: 'fa-solid fa-user-group',
    color: 'purple',
  },
  {
    id: 'vocab-gap',
    name: '词汇鸿沟分析',
    description: '对比"商家用词"与"买家黑话"，找出Listing未覆盖但买家高频使用的词汇。',
    source: 'Reviews',
    icon: 'fa-solid fa-comments',
    color: 'teal',
  },
  {
    id: 'promise-reality',
    name: '承诺/现实断层',
    description: '识别Listing过度承诺但Review频繁打脸的功能点，防止虚假宣传。',
    source: 'Reviews',
    icon: 'fa-solid fa-scale-unbalanced',
    color: 'rose',
  },
];
