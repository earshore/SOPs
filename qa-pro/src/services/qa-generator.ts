import { CompetitorReport } from '../types/report';
import { QAItem } from '../types/qa';

/**
 * Q&A 生成引擎 - 模拟AI大模型智能分析
 * 
 * 设计理念:
 * 1. 模拟大模型的"理解-分析-生成"三阶段流程
 * 2. 构建AI上下文(AIAnalysisContext)模拟模型对报告的全局理解
 * 3. 使用语义识别和模式匹配模拟AI的推理能力
 * 4. 生成结构化、自然语言的答案，而非简单拼接
 * 
 * 扩展性:
 * - 当前实现完全基于本地规则，无需API调用
 * - 预留AIService接口，后期可无缝切换到真实大模型
 * - 保持输入输出接口不变，确保向后兼容
 * 
 * 基于竞品分析报告,通过模拟AI推理生成高质量 Q&A
 */
export class QAGenerator {
  private report: CompetitorReport;
  private aiContext: AIAnalysisContext;

  constructor(report: CompetitorReport) {
    this.report = report;
    this.aiContext = this.buildAIContext();
  }

  /**
   * 构建AI分析上下文 - 模拟大模型理解报告全貌
   */
  private buildAIContext(): AIAnalysisContext {
    const fatalFlaws = this.report.results.find((t) => t.targetId === 'fatal-flaws');
    const wowMoments = this.report.results.find((t) => t.targetId === 'wow-moments');
    const hesitations = this.report.results.find((t) => t.targetId === 'hesitation-points');
    const buyerProfile = this.report.results.find((t) => t.targetId === 'buyer-profile');

    // 兼容多种数据结构获取产品标题
    let productTitle = '未知产品';
    if (this.report.analysisReport?.product_title) {
      productTitle = this.report.analysisReport.product_title;
    } else {
      // 从title-keywords提取
      const titleKeywords = this.report.results.find((t) => t.targetId === 'title-keywords');
      if (titleKeywords?.highlights && titleKeywords.highlights.length > 0) {
        productTitle = titleKeywords.highlights.map(h => h.text.split(' - ')[0]).join(' ');
      }
    }

    return {
      productTitle,
      market: this.report.metadata?.marketplace || this.report.analysisReport?.marketplace || 'Unknown',
      criticalIssuesCount: fatalFlaws?.highlights.length || 0,
      wowMomentsCount: wowMoments?.highlights.length || 0,
      hesitationsCount: hesitations?.highlights.length || 0,
      hasBuyerProfile: !!buyerProfile,
      // AI理解的产品类型
      productCategory: this.inferProductCategory(),
      // AI提取的情感基调
      sentimentTone: this.analyzeSentiment(),
    };
  }

  /**
   * 模拟AI推断产品类型
   */
  private inferProductCategory(): string {
    // 优先从product_title推断
    const title = (this.report.analysisReport?.product_title || '').toLowerCase();
    if (title.includes('parfum') || title.includes('cologne') || title.includes('duft')) return 'fragrance';
    if (title.includes('beauty') || title.includes('cosmetic')) return 'beauty';
    
    // 备用：从title-keywords推断
    const titleKeywords = this.report.results.find((t) => t.targetId === 'title-keywords');
    if (titleKeywords?.highlights) {
      const keywords = titleKeywords.highlights.map(h => h.text.toLowerCase()).join(' ');
      if (keywords.includes('parfum') || keywords.includes('cologne') || keywords.includes('duft')) return 'fragrance';
    }
    
    return 'general';
  }

  /**
   * 模拟AI分析整体情感基调
   */
  private analyzeSentiment(): 'positive' | 'mixed' | 'negative' {
    const { criticalIssuesCount, wowMomentsCount } = this.aiContext || { criticalIssuesCount: 0, wowMomentsCount: 0 };
    if (criticalIssuesCount > wowMomentsCount) return 'negative';
    if (wowMomentsCount > criticalIssuesCount * 2) return 'positive';
    return 'mixed';
  }

  /**
   * 生成所有 Q&A - 模拟AI智能分析流程
   */
  generateAllQA(): QAItem[] {
    console.log('🤖 AI开始分析报告...');
    const qaList: QAItem[] = [];

    try {
      // AI分析阶段1: 识别关键痛点
      console.log('阶段1: 分析致命缺陷...');
      qaList.push(...this.aiAnalyzeFatalFlaws());

      // AI分析阶段2: 提取惊喜亮点
      console.log('阶段2: 提取惊喜时刻...');
      qaList.push(...this.aiAnalyzeWowMoments());

      // AI分析阶段3: 解答购买疑虑
      console.log('阶段3: 分析犹豫点...');
      qaList.push(...this.aiAnalyzeHesitations());

      // AI分析阶段4: 场景适配分析
      console.log('阶段4: 分析买家画像...');
      qaList.push(...this.aiAnalyzeBuyerProfile());

      // AI分析阶段5: 综合洞察生成
      console.log('阶段5: 生成综合洞察...');
      qaList.push(...this.aiGenerateInsightQA());

      console.log(`✅ AI分析完成，共生成 ${qaList.length} 个Q&A`);

      // AI最终排序: 基于用户关注度和商业价值
      return this.aiPrioritizeQA(qaList);
    } catch (error) {
      console.error('❌ AI分析过程出错:', error);
      return qaList; // 返回已生成的部分
    }
  }

  /**
   * AI分析致命缺陷 - 模拟大模型深度理解用户痛点
   */
  private aiAnalyzeFatalFlaws(): QAItem[] {
    const fatalFlaws = this.report.results.find((t) => t.targetId === 'fatal-flaws');
    if (!fatalFlaws || !fatalFlaws.highlights.length) return [];

    const qaList: QAItem[] = [];
    const userQuotes = this.extractUserQuotes(fatalFlaws);

    // AI识别: 将原始数据转化为用户关心的问题
    fatalFlaws.highlights.forEach((highlight, index) => {
      const aiInsight = this.aiUnderstandFatalFlaw(highlight.text, userQuotes);
      
      qaList.push({
        rank: index + 1,
        question: aiInsight.question,
        category: '致命缺陷',
        categoryClass: 'cat-performance',
        tag: aiInsight.severity || '需关注',
        tagClass: 'confidence-high',
        answer: aiInsight.answer,
        priority: 100 - index * 10,
        source: 'fatal-flaws',
      });
    });

    return qaList;
  }

  /**
   * AI理解致命缺陷 - 模拟大模型推理
   */
  private aiUnderstandFatalFlaw(issueText: string, userQuotes: string[]): AIInsight {
    // AI分析: 提取核心问题
    const lowerText = issueText.toLowerCase();
    
    // AI推理: 根据问题类型生成自然的问答
    if (lowerText.includes('tenue') || lowerText.includes('évapore') || lowerText.includes('longevity')) {
      return {
        question: 'Wie lange hält der Duft wirklich? Verschwindet er schnell? (香味持久度如何？会很快消失吗？)',
        severity: '高频问题',
        answer: this.aiGenerateAnswer(
          '持久度问题',
          issueText,
          userQuotes,
          '多位用户反馈香味持续时间不足，这是该产品的主要缺陷。'
        ),
      };
    }
    
    if (lowerText.includes('intensité') || lowerText.includes('sent presque rien') || lowerText.includes('weak')) {
      return {
        question: 'Ist der Duft stark genug wahrnehmbar? (香味浓度够吗？能闻到吗？)',
        severity: '严重问题',
        answer: this.aiGenerateAnswer(
          '香味强度不足',
          issueText,
          userQuotes,
          '部分用户表示几乎闻不到香味，这可能导致购买后的失望。'
        ),
      };
    }
    
    if (lowerText.includes('allergic') || lowerText.includes('irritation') || lowerText.includes('peau rouge')) {
      return {
        question: 'Kann es Hautreizungen oder allergische Reaktionen verursachen? (会引起皮肤过敏或刺激吗？)',
        severity: '安全风险',
        answer: this.aiGenerateAnswer(
          '过敏反应风险',
          issueText,
          userQuotes,
          '有用户报告使用后出现皮肤红肿，敏感肌肤需谨慎。'
        ),
      };
    }

    // 默认AI分析
    return {
      question: `Gibt es Probleme mit: ${issueText.substring(0, 50)}? (该产品存在什么问题？)`,
      severity: '需关注',
      answer: this.aiGenerateAnswer('产品缺陷', issueText, userQuotes, '用户反馈发现以下问题。'),
    };
  }

  /**
   * AI分析惊喜时刻 - 模拟大模型提取产品亮点
   */
  private aiAnalyzeWowMoments(): QAItem[] {
    const wowMoments = this.report.results.find((t) => t.targetId === 'wow-moments');
    if (!wowMoments || !wowMoments.highlights.length) return [];

    const qaList: QAItem[] = [];

    wowMoments.highlights.forEach((highlight, index) => {
      const aiInsight = this.aiUnderstandWowMoment(highlight.text);
      
      qaList.push({
        rank: index + 1,
        question: aiInsight.question,
        category: '惊喜时刻',
        categoryClass: 'cat-features',
        tag: aiInsight.tag || '用户好评',
        tagClass: 'confidence-high',
        answer: aiInsight.answer,
        priority: 80 - index * 5,
        source: 'wow-moments',
      });
    });

    return qaList;
  }

  /**
   * AI理解惊喜时刻 - 模拟大模型提取正面价值
   */
  private aiUnderstandWowMoment(text: string): AIInsight {
    const lowerText = text.toLowerCase();

    // AI识别: 性价比优势
    if (lowerText.includes('prix') || lowerText.includes('rapport qualité') || lowerText.includes('value')) {
      return {
        question: 'Wie ist das Preis-Leistungs-Verhältnis? Lohnt sich der Kauf? (性价比如何？值得购买吗？)',
        tag: '高性价比',
        answer: `<strong>AI分析:</strong> 用户普遍认为该产品性价比出色。<br><br><strong>用户原话:</strong> "${text}"<br><br><strong>洞察:</strong> 价格优势是该产品的核心竞争力，适合预算有限但追求品质的消费者。`,
      };
    }

    // AI识别: 持久度优势
    if (lowerText.includes('tenue') || lowerText.includes('lasting') || lowerText.includes('journée')) {
      return {
        question: 'Hält der Duft wirklich den ganzen Tag? (真的能持续一整天吗？)',
        tag: '持久留香',
        answer: `<strong>AI分析:</strong> 多位用户确认香味持久度表现优秀。<br><br><strong>用户原话:</strong> "${text}"<br><br><strong>洞察:</strong> 对于日常使用场景，该产品的留香时间能够满足全天需求。`,
      };
    }

    // AI识别: 香调层次
    if (lowerText.includes('évolu') || lowerText.includes('surprise') || lowerText.includes('agrumes')) {
      return {
        question: 'Wie entwickelt sich der Duft im Laufe der Zeit? (香调如何演变？有层次感吗？)',
        tag: '香调丰富',
        answer: `<strong>AI分析:</strong> 用户发现该香水具有明显的香调演变。<br><br><strong>用户原话:</strong> "${text}"<br><br><strong>洞察:</strong> 前调清新柑橘，中后调转为温暖木质，层次分明，适合欣赏香水艺术的消费者。`,
      };
    }

    // 默认AI分析
    return {
      question: 'Was macht dieses Produkt besonders? (这款产品有什么特别之处？)',
      tag: '用户好评',
      answer: `<strong>用户反馈:</strong> "${text}"<br><br><strong>AI洞察:</strong> 该产品在用户体验中展现出超预期的表现。`,
    };
  }

  /**
   * AI分析犹豫点 - 模拟大模型理解购买障碍并提供解答
   */
  private aiAnalyzeHesitations(): QAItem[] {
    const hesitations = this.report.results.find((t) => t.targetId === 'hesitation-points');
    if (!hesitations || !hesitations.details) return [];

    const details = hesitations.details as { hesitations?: any[] };
    if (!details.hesitations) return [];

    const qaList: QAItem[] = [];

    details.hesitations.forEach((hesitation: any, index: number) => {
      const aiInsight = this.aiResolveHesitation(hesitation);
      
      qaList.push({
        rank: index + 1,
        question: aiInsight.question,
        category: '犹豫点',
        categoryClass: 'cat-concerns',
        tag: aiInsight.tag || '购前疑虑',
        tagClass: 'confidence-medium',
        answer: aiInsight.answer,
        priority: 70 - index * 5,
        source: 'hesitation-points',
      });
    });

    return qaList;
  }

  /**
   * AI解决犹豫点 - 模拟大模型提供可信的解答
   */
  private aiResolveHesitation(hesitation: any): AIInsight {
    // AI转换: 将原始疑虑转化为自然的德语问题
    const worry = hesitation.pre_purchase_worry.toLowerCase();
    let question = '';
    let tag = '购前疑虑';

    if (worry.includes('tenue') || worry.includes('évapore')) {
      question = 'Hält der Duft wirklich lange genug? (香味持久度真的够吗？)';
      tag = '持久度疑虑';
    } else if (worry.includes('fort') || worry.includes('envahissant')) {
      question = 'Ist der Duft zu stark oder aufdringlich? (香味会不会太浓烈？)';
      tag = '浓度疑虑';
    } else if (worry.includes('qualité') || worry.includes('bas de gamme')) {
      question = 'Ist die Qualität gut genug für den Preis? (质量配得上价格吗？)';
      tag = '品质疑虑';
    } else if (worry.includes('arnaque') || worry.includes('inefficace')) {
      question = 'Ist das Produkt vertrauenswürdig oder eine Falle? (产品可靠吗？会不会是骗局？)';
      tag = '信任疑虑';
    } else if (worry.includes('fuit') || worry.includes('conditionné')) {
      question = 'Gibt es Probleme mit der Verpackung oder Lieferung? (包装或运输会有问题吗？)';
      tag = '物流疑虑';
    } else {
      question = hesitation.pre_purchase_worry;
    }

    // AI生成: 基于证据的可信解答
    const answer = `
      <div class="ai-answer">
        <div class="answer-section">
          <strong>🤔 购买前疑虑:</strong><br>
          ${hesitation.pre_purchase_worry}
        </div>
        <div class="answer-section">
          <strong>✅ AI分析结论:</strong><br>
          ${hesitation.post_purchase_resolution}
        </div>
        <div class="answer-section">
          <strong>📊 真实用户证据:</strong><br>
          <em>"${hesitation.user_evidence}"</em>
        </div>
        <div class="answer-section recommendation">
          <strong>💡 AI建议回答:</strong><br>
          ${hesitation.qa_recommendation}
        </div>
      </div>
    `;

    return { question, tag, answer };
  }

  /**
   * AI分析买家画像 - 模拟大模型理解目标用户和使用场景
   */
  private aiAnalyzeBuyerProfile(): QAItem[] {
    const buyerProfile = this.report.results.find((t) => t.targetId === 'buyer-profile');
    if (!buyerProfile || !buyerProfile.details) return [];

    const qaList: QAItem[] = [];
    const details = buyerProfile.details as { usage_scenes?: any[]; buyer_types?: any[] };
    
    // AI场景分析: 识别核心使用场景
    if (details.usage_scenes) {
      const topScenes = details.usage_scenes.slice(0, 3); // AI选择最重要的3个场景
      topScenes.forEach((scene: any, index: number) => {
        const aiInsight = this.aiUnderstandUsageScene(scene);
        
        qaList.push({
          rank: index + 1,
          question: aiInsight.question,
          category: '使用场景',
          categoryClass: 'cat-usage',
          tag: aiInsight.tag || '场景适配',
          tagClass: 'confidence-medium',
          answer: aiInsight.answer,
          priority: 60 - index * 5,
          source: 'buyer-profile',
        });
      });
    }

    return qaList;
  }

  /**
   * AI理解使用场景 - 模拟大模型场景适配分析
   */
  private aiUnderstandUsageScene(scene: any): AIInsight {
    const sceneLower = scene.scene.toLowerCase();
    
    // AI场景识别: 日常工作
    if (sceneLower.includes('quotidien') || sceneLower.includes('travail')) {
      return {
        question: 'Ist dieser Duft für den täglichen Gebrauch im Büro geeignet? (适合日常办公使用吗？)',
        tag: '日常场景',
        answer: `<strong>AI场景分析:</strong> 该产品非常适合职场日常使用。<br><br><strong>使用频率:</strong> ${scene.frequency}<br><br><strong>用户反馈:</strong> ${scene.context}<br><br><strong>AI建议:</strong> 香味不过分浓烈，适合办公室等正式场合，早晨使用可持续全天。`,
      };
    }

    // AI场景识别: 便携补香
    if (sceneLower.includes('déplacement') || sceneLower.includes('réappliqué')) {
      return {
        question: 'Ist das Format praktisch für unterwegs? (便携性如何？适合随身携带吗？)',
        tag: '便携场景',
        answer: `<strong>AI场景分析:</strong> 小巧设计特别适合移动场景。<br><br><strong>使用频率:</strong> ${scene.frequency}<br><br><strong>用户反馈:</strong> ${scene.context}<br><br><strong>AI建议:</strong> 50ml容量可放入包包或车内，方便随时补香，是商务人士和旅行者的理想选择。`,
      };
    }

    // AI场景识别: 礼物场景
    if (sceneLower.includes('cadeau') || sceneLower.includes('romantique')) {
      return {
        question: 'Eignet sich dieses Produkt als Geschenk? (适合作为礼物吗？)',
        tag: '送礼场景',
        answer: `<strong>AI场景分析:</strong> 该产品是受欢迎的礼物选择。<br><br><strong>使用频率:</strong> ${scene.frequency}<br><br><strong>用户反馈:</strong> ${scene.context}<br><br><strong>AI建议:</strong> 适合情人节、生日等场合，性价比高且包装得体，是实用型礼物的好选择。`,
      };
    }

    // 默认场景分析
    return {
      question: `Ist dieses Produkt geeignet für ${scene.scene}? (适合该使用场景吗？)`,
      tag: '场景适配',
      answer: `<strong>场景:</strong> ${scene.scene}<br><br><strong>使用频率:</strong> ${scene.frequency}<br><br><strong>用户反馈:</strong> ${scene.context}`,
    };
  }

  /**
   * AI生成综合洞察Q&A - 模拟大模型跨维度分析
   */
  private aiGenerateInsightQA(): QAItem[] {
    const qaList: QAItem[] = [];

    // AI综合分析: 产品定位
    const positioningInsight = this.aiAnalyzeProductPositioning();
    if (positioningInsight) {
      qaList.push({
        rank: 999,
        question: positioningInsight.question,
        category: 'AI洞察',
        categoryClass: 'cat-features',
        tag: 'AI综合分析',
        tagClass: 'confidence-high',
        answer: positioningInsight.answer,
        priority: 65,
        source: 'ai-insight',
      });
    }

    return qaList;
  }

  /**
   * AI分析产品定位 - 模拟大模型综合判断
   */
  private aiAnalyzeProductPositioning(): AIInsight | null {
    const { criticalIssuesCount, wowMomentsCount, sentimentTone } = this.aiContext;

    if (sentimentTone === 'mixed' && criticalIssuesCount > 0 && wowMomentsCount > 0) {
      return {
        question: 'Für wen ist dieses Produkt am besten geeignet? (这款产品最适合谁？)',
        tag: '目标人群',
        answer: `
          <strong>AI综合分析:</strong><br><br>
          基于 ${this.report.metadata.asins.length} 个ASIN和 ${this.report.metadata.targets.length} 个分析维度的数据，该产品呈现出明显的两极分化特征：<br><br>
          
          <strong>✅ 适合人群:</strong><br>
          • 预算有限但追求品质的消费者<br>
          • 需要便携香水的商务/旅行人士<br>
          • 寻找性价比礼物的购买者<br><br>
          
          <strong>⚠️ 不适合人群:</strong><br>
          • 对香味持久度要求极高的用户<br>
          • 敏感肌肤或易过敏体质<br>
          • 追求奢侈品牌体验的消费者<br><br>
          
          <strong>💡 AI建议:</strong> 该产品定位为"高性价比日常香水"，在价格区间内表现出色，但需要管理用户对持久度的预期。
        `,
      };
    }

    return null;
  }

  /**
   * 提取用户原话 - AI数据提取
   */
  private extractUserQuotes(target: any): string[] {
    if (!target.details || !Array.isArray(target.details)) return [];

    for (const detail of target.details) {
      if (detail.category === '用户原话' && detail.items) {
        return detail.items.slice(0, 3);
      }
    }
    return [];
  }

  /**
   * AI生成答案 - 模拟大模型组织答案结构
   */
  private aiGenerateAnswer(
    issueType: string,
    issueText: string,
    userQuotes: string[],
    aiSummary: string
  ): string {
    let answer = `<div class="ai-answer">`;
    answer += `<div class="answer-section"><strong>⚠️ 问题类型:</strong> ${issueType}</div>`;
    answer += `<div class="answer-section"><strong>📋 问题描述:</strong><br>${issueText}</div>`;

    if (userQuotes.length > 0) {
      answer += `<div class="answer-section"><strong>💬 真实用户反馈:</strong><br>`;
      userQuotes.forEach((quote) => {
        answer += `<em>"${quote}"</em><br>`;
      });
      answer += `</div>`;
    }

    answer += `<div class="answer-section"><strong>🤖 AI分析:</strong><br>${aiSummary}</div>`;
    answer += `</div>`;

    return answer;
  }

  /**
   * AI优先级排序 - 模拟大模型基于商业价值和用户关注度排序
   */
  private aiPrioritizeQA(qaList: QAItem[]): QAItem[] {
    // AI排序策略:
    // 1. 致命缺陷优先(影响购买决策)
    // 2. 犹豫点次之(消除购买障碍)
    // 3. 惊喜时刻(促进转化)
    // 4. 使用场景(辅助决策)
    // 5. AI洞察(增值内容)

    const sorted = qaList.sort((a, b) => {
      // 优先级权重
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // 同优先级按来源排序
      const sourceWeight: { [key: string]: number } = {
        'fatal-flaws': 5,
        'hesitation-points': 4,
        'wow-moments': 3,
        'buyer-profile': 2,
        'ai-insight': 1,
      };
      return (sourceWeight[b.source] || 0) - (sourceWeight[a.source] || 0);
    });

    // AI重新分配排名
    sorted.forEach((qa, index) => {
      qa.rank = index + 1;
    });

    return sorted;
  }
}

/**
 * AI分析上下文接口
 */
interface AIAnalysisContext {
  productTitle: string;
  market: string;
  criticalIssuesCount: number;
  wowMomentsCount: number;
  hesitationsCount: number;
  hasBuyerProfile: boolean;
  productCategory: string;
  sentimentTone: 'positive' | 'mixed' | 'negative';
}

/**
 * AI洞察结果接口
 */
interface AIInsight {
  question: string;
  tag?: string;
  severity?: string;
  answer: string;
}
