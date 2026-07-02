/**
 * 技术规格标签的多语言映射配置
 *
 * 用于将规格类型转换为本地化标签
 * 支持的语言：中文(zh)、英语(en)、德语(de)
 */

/**
 * 规格标签映射表
 *
 * 键：规格类型（如 'size', 'weight'）
 * 值：语言代码到本地化标签的映射
 */
export const SPEC_LABELS: Record<string, Record<string, string>> = {
  size: {
    zh: '容量',
    en: 'Capacity',
    de: 'Kapazität',
  },
  volume: {
    zh: '体积',
    en: 'Volume',
    de: 'Volumen',
  },
  weight: {
    zh: '重量',
    en: 'Weight',
    de: 'Gewicht',
  },
  dimensions: {
    zh: '尺寸',
    en: 'Dimensions',
    de: 'Abmessungen',
  },
  quantity: {
    zh: '数量',
    en: 'Quantity',
    de: 'Menge',
  },
  material: {
    zh: '材质',
    en: 'Material',
    de: 'Material',
  },
  concentration: {
    zh: '浓度',
    en: 'Concentration',
    de: 'Konzentration',
  },
  capacity: {
    zh: '容量',
    en: 'Capacity',
    de: 'Kapazität',
  },
};

/**
 * 获取规格类型的本地化标签
 *
 * @param type 规格类型（如 'size', 'weight'）
 * @param language 语言代码（如 'zh', 'en', 'de'），默认 'zh'
 * @returns 本地化标签，如果找不到则返回原始类型
 */
export function getSpecLabel(type: string, language: string = 'zh'): string {
  // 获取对应语言的标签，如果不存在则使用英语，最后回退到原始 type
  return SPEC_LABELS[type]?.[language] || SPEC_LABELS[type]?.['en'] || type;
}
