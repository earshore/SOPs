import { CompetitorReport } from '../types/report';
import { QAItem } from '../types/qa';

/**
 * AI服务接口 - 为后期接入真实大模型预留
 * 当前使用模拟实现，后期可替换为真实API调用
 */
export interface AIService {
  /**
   * 分析报告并生成Q&A
   */
  analyzeReport(report: CompetitorReport): Promise<QAItem[]>;

  /**
   * 优化单个Q&A答案
   */
  optimizeAnswer(question: string, context: string): Promise<string>;

  /**
   * 检查服务可用性
   */
  isAvailable(): boolean;
}

/**
 * 模拟AI服务实现
 * 使用本地规则引擎模拟大模型行为
 */
export class MockAIService implements AIService {
  async analyzeReport(report: CompetitorReport): Promise<QAItem[]> {
    // 当前使用QAGenerator的本地实现
    // 后期可替换为真实API调用
    return Promise.resolve([]);
  }

  async optimizeAnswer(question: string, context: string): Promise<string> {
    // 模拟API延迟
    await this.simulateDelay(500);
    return Promise.resolve(context);
  }

  isAvailable(): boolean {
    return true;
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 真实AI服务实现 - 预留接口
 * 后期接入OpenAI/Claude/国内大模型时使用
 */
export class RealAIService implements AIService {
  private apiKey: string;
  private endpoint: string;

  constructor(apiKey: string, endpoint: string) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
  }

  async analyzeReport(report: CompetitorReport): Promise<QAItem[]> {
    // TODO: 实现真实API调用
    // const response = await fetch(this.endpoint, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.apiKey}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({ report })
    // });
    // return response.json();
    
    throw new Error('真实AI服务尚未实现');
  }

  async optimizeAnswer(question: string, context: string): Promise<string> {
    // TODO: 实现真实API调用
    throw new Error('真实AI服务尚未实现');
  }

  isAvailable(): boolean {
    return !!this.apiKey && !!this.endpoint;
  }
}

/**
 * AI服务工厂
 * 根据配置返回对应的AI服务实例
 */
export class AIServiceFactory {
  static create(config?: AIServiceConfig): AIService {
    if (config && config.useRealAI && config.apiKey && config.endpoint) {
      return new RealAIService(config.apiKey, config.endpoint);
    }
    return new MockAIService();
  }
}

/**
 * AI服务配置接口
 */
export interface AIServiceConfig {
  useRealAI: boolean;
  apiKey?: string;
  endpoint?: string;
  model?: string;
}
