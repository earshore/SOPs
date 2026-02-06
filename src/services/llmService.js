// src/services/llmService.js
// @ts-check
// ================================================================
// 🎯 P2 重构: 添加完整的 JSDoc 类型注释
// 🎯 Phase 5: 已集成 ErrorService
// 🛡️ Phase 1.2: 增强鲁棒性 - 指数退避重试 (Exponential Backoff)
// 🌐 Phase 1.3: 环境适配 - 开发/生产环境自动切换
// ================================================================

import { ErrorService } from './errorService.js';
import { EnvConfig } from '../common/config/envConfig.js';

// ========================
// 类型定义
// ========================

/**
 * 聊天消息对象
 * @typedef {Object} ChatMessage
 * @property {'system' | 'user' | 'assistant'} role - 消息角色
 * @property {string} content - 消息内容
 */

/**
 * LLM 调用配置选项
 * @typedef {Object} LLMOptions
 * @property {number} [temperature=0.3] - 温度参数 (0-2)，越低越确定性
 * @property {boolean} [jsonMode=false] - 是否强制 JSON 输出格式 (默认为 false 以兼容更多模型)
 * @property {number} [timeout=90000] - 超时时间 (毫秒)
 * @property {number} [retries=3] - 最大重试次数
 * @property {number} [retryDelay=1000] - 初始重试延迟 (ms)
 * @property {AbortSignal} [signal] - 🎯 短期优化：请求取消信号
 */

/**
 * LLM 配置对象 (用于跨模块传递)
 * @typedef {Object} LLMConfig
 * @property {string} provider - 厂商标识 (openai, anthropic, deepseek...)
 * @property {string} endpoint - API 端点 URL
 * @property {string} apiKey - API 密钥
 * @property {string} model - 模型名称
 */

/**
 * 模型信息对象
 * @typedef {Object} ModelInfo
 * @property {string} id - 模型 ID
 * @property {number} context - 上下文窗口大小
 * @property {string[]} features - 支持的特性列表
 */

// ========================
// 辅助函数
// ========================

/**
 * 睡眠函数
 * @param {number} ms 
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ========================
// 核心 API 函数
// ========================

/**
 * 通用大语言模型调用接口 (带自动重试)
 * 
 * @param {ChatMessage[]} messages - 聊天上下文消息数组
 * @param {string} provider - 厂商标识 (openai, anthropic, deepseek...)
 * @param {string} endpoint - API 端点 URL (不含 /chat/completions)
 * @param {string} apiKey - API 密钥
 * @param {string} model - 模型名称
 * @param {LLMOptions} [options={}] - 可选配置
 * @returns {Promise<string>} 模型返回的文本内容
 * @throws {Error} 网络错误、超时或 API 返回错误时抛出
 * 
 * @example
 * const response = await callLLM(
 *   [{ role: 'user', content: '你好' }],
 *   'openai',
 *   'https://api.openai.com/v1',
 *   'sk-xxx',
 *   'gpt-4o-mini',
 *   { retries: 2 }
 * );
 */
export async function callLLM(
  messages,
  provider,
  endpoint,
  apiKey,
  model,
  options = {}
) {
  const { 
    temperature = 0.3, 
    jsonMode = false, 
    timeout = 90000,
    retries = 2,
    retryDelay = 1000,
    signal // 🎯 短期优化：支持请求取消
  } = options;

  // 🔒 P0修复: 生产环境安全检查
  if (EnvConfig.isProduction) {
    const dangerousEndpoints = [
      'api.openai.com',
      'api.anthropic.com',
      'api.deepseek.com',
      'generativelanguage.googleapis.com'
    ];
    
    if (dangerousEndpoints.some(domain => endpoint.includes(domain))) {
      throw new Error(
        '⛔ 安全限制: 生产环境禁止直接调用外部API\n\n' +
        '可能的原因:\n' +
        '1. 未配置代理服务器\n' +
        '2. API端点配置错误\n\n' +
        '解决方案:\n' +
        '- 请在设置中配置企业代理\n' +
        '- 或联系管理员配置 Cloudflare Workers 代理\n\n' +
        '这是为了保护您的API密钥安全。'
      );
    }
  }

  // 标准化 endpoint (开发/生产环境自动适配)
  const normalizedEndpoint = EnvConfig.api.normalizeEndpoint(endpoint);
  
  // 只在首次调用或调试模式下输出配置信息
  if (!callLLM._configLogged || EnvConfig.isDevelopment) {
    console.log(`🌐 [LLM] 环境: ${EnvConfig.environment}`);
    console.log(`🌐 [LLM] 原始 Endpoint: ${endpoint}`);
    console.log(`🌐 [LLM] 标准化 Endpoint: ${normalizedEndpoint}`);
    console.log(`🌐 [LLM] 最终请求 URL: ${normalizedEndpoint}/chat/completions`);
    callLLM._configLogged = true;
  }

  /** @type {Object} */
  const requestBody = {
    model: model,
    messages: messages,
    temperature: temperature,
    // 只有部分模型支持 response_format
    ...(jsonMode && { response_format: { type: "json_object" } }),
  };

  let lastError = null;

  // 重试循环
  for (let attempt = 0; attempt <= retries; attempt++) {
    // 🎯 短期优化：支持外部取消信号
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // 如果提供了外部 signal，监听其 abort 事件
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      // 首次之后的重试需要等待
      if (attempt > 0) {
        // 指数退避: 1s, 2s, 4s... 加少量 jitter 防止惊群
        const delay = retryDelay * Math.pow(2, attempt - 1) * (1 + Math.random() * 0.2);
        console.log(`⏳ LLM 调用重试 [${attempt}/${retries}]，等待 ${Math.round(delay)}ms...`);
        await sleep(delay);
      }

      const response = await fetch(`${normalizedEndpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 处理非 200 响应
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `服务器返回错误 ${response.status}`;
        let shouldRetry = false;

        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error && errorJson.error.message) {
            errorMsg = errorJson.error.message;
          }
        } catch (e) {
          // 解析失败，使用原始文本
        }

        // 特殊处理 401 错误,提供更友好的提示
        if (response.status === 401) {
          if (EnvConfig.isProduction) {
            errorMsg = `⛔ 认证失败: ${errorMsg}\n\n可能的原因:\n1. 未配置访问密码 (如果服务器启用了密码保护)\n2. API Key 格式不正确\n3. API Key 已过期或无效\n\n请在设置中检查您的配置。`;
          } else {
            errorMsg = `⛔ API Key 认证失败: ${errorMsg}\n\n请检查您在设置中配置的 API Key 是否正确。`;
          }
        }

        // 决定是否重试
        // 429: Too Many Requests (限流)
        // 5xx: Server Errors (服务器崩溃/网关超时)
        if (response.status === 429 || response.status >= 500) {
          shouldRetry = true;
        }

        const error = new Error(errorMsg);
        // @ts-ignore
        error.status = response.status;
        
        if (shouldRetry && attempt < retries) {
          lastError = error;
          console.warn(`⚠️ LLM 调用失败 (${response.status})，准备重试:`, errorMsg);
          continue; // 进入下一次循环
        } else {
          throw error; // 致命错误或重试耗尽，直接抛出
        }
      }

      const data = await response.json();
      
      // 兼容性检查：某些非标准 API 可能返回结构不同
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error(`API 返回格式异常: ${JSON.stringify(data).substring(0, 100)}...`);
      }

      return data.choices[0].message.content;

    } catch (e) {
      clearTimeout(timeoutId);
      lastError = e;

      // 如果是 AbortError (超时)，通常也可以重试
      if (e.name === "AbortError") {
        const timeoutMsg = `模型响应超时(${timeout / 1000}秒)`;
        if (attempt < retries) {
           console.warn(`⚠️ LLM ${timeoutMsg}，准备重试...`);
           continue;
        }
        throw new Error(`${timeoutMsg}，请检查网络或增加超时时间`);
      }

      // 如果已经是 Error 对象且有 status (上面抛出的)，则保持
      // 否则如果是网络错误 (fetch failed)，也值得重试
      if (!e.status && attempt < retries) {
          console.warn(`⚠️ 网络/未知错误，准备重试:`, e.message);
          continue;
      }

      // 其他情况 (如 400 Bad Request) 直接抛出
      throw e;
    }
  }

  throw lastError || new Error("LLM 调用失败 (未知原因)");
}

/**
 * 获取模型列表
 * 
 * @param {string} provider - 厂商标识
 * @param {string} endpoint - API 端点 URL
 * @param {string} apiKey - API 密钥
 * @returns {Promise<ModelInfo[]>} 模型列表，失败返回空数组
 * 
 * @example
 * const models = await fetchModelsFromApi('openai', 'https://api.openai.com/v1', 'sk-xxx');
 * // [{ id: 'gpt-4o', context: 128000, features: [] }, ...]
 */
export async function fetchModelsFromApi(provider, endpoint, apiKey) {
  try {
    // 🔒 P0修复: 生产环境安全检查
    if (EnvConfig.isProduction) {
      const dangerousEndpoints = [
        'api.openai.com',
        'api.anthropic.com',
        'api.deepseek.com',
        'generativelanguage.googleapis.com'
      ];
      
      if (dangerousEndpoints.some(domain => endpoint.includes(domain))) {
        throw new Error(
          '⛔ 安全限制: 生产环境禁止直接调用外部API\n' +
          '请配置企业代理或联系管理员'
        );
      }
    }
    
    // 标准化 endpoint (开发/生产环境自动适配)
    const normalizedEndpoint = EnvConfig.api.normalizeEndpoint(endpoint);
    
    // 只在首次调用或调试模式下输出配置信息
    if (!fetchModelsFromApi._configLogged || EnvConfig.isDevelopment) {
      console.log(`🌐 [Models] 环境: ${EnvConfig.environment}`);
      console.log(`🌐 [Models] 原始 Endpoint: ${endpoint}`);
      console.log(`🌐 [Models] 标准化 Endpoint: ${normalizedEndpoint}`);
      console.log(`🌐 [Models] 最终请求 URL: ${normalizedEndpoint}/models`);
      fetchModelsFromApi._configLogged = true;
    }
    
    // 设置 10秒 超时，避免获取列表卡死
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    console.log(`🔄 正在从 ${normalizedEndpoint}/models 获取模型列表...`);
    console.log(`📋 请求详情: Provider=${provider}`);
    
    const res = await fetch(`${normalizedEndpoint}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    console.log(`📡 API响应状态: ${res.status} ${res.statusText}`);
    console.log(`📡 响应头:`, Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`❌ API返回错误: ${res.status}`, errorText);
      throw new Error(`HTTP ${res.status}: ${errorText.substring(0, 200)}`);
    }
    
    const rawText = await res.text();
    console.log(`📦 API返回原始数据 (前500字符):`, rawText.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(rawText);
      console.log(`📦 解析后的数据结构:`, JSON.stringify(data, null, 2).substring(0, 1000));
    } catch (parseError) {
      console.error(`❌ JSON解析失败:`, parseError);
      throw new Error(`API返回的不是有效的JSON格式: ${rawText.substring(0, 100)}`);
    }

    // 兼容不同厂商的数据结构 (OpenAI wrap in .data, some others might be array directly)
    let list = [];
    
    if (Array.isArray(data)) {
      list = data;
      console.log(`✅ 数据是数组格式，包含 ${list.length} 个元素`);
    } else if (data.data && Array.isArray(data.data)) {
      list = data.data;
      console.log(`✅ 数据在 .data 字段中，包含 ${list.length} 个元素`);
    } else if (data.models && Array.isArray(data.models)) {
      list = data.models;
      console.log(`✅ 数据在 .models 字段中，包含 ${list.length} 个元素`);
    } else if (typeof data === 'object' && data !== null) {
      console.warn(`⚠️ 未识别的数据结构，对象键:`, Object.keys(data));
      // 尝试从对象中提取可能的模型列表
      const possibleArrays = Object.entries(data)
        .filter(([key, value]) => Array.isArray(value))
        .map(([key, value]) => ({ key, value, length: value.length }));
      
      console.log(`🔍 找到的数组字段:`, possibleArrays.map(p => `${p.key}(${p.length})`));
      
      if (possibleArrays.length > 0) {
        // 选择最长的数组，通常是模型列表
        const longest = possibleArrays.reduce((a, b) => a.length > b.length ? a : b);
        list = longest.value;
        console.log(`✅ 使用字段 "${longest.key}"，包含 ${list.length} 个元素`);
      }
    }

    if (list.length === 0) {
      console.warn(`⚠️ 模型列表为空，完整响应:`, JSON.stringify(data));
      throw new Error('API返回的模型列表为空，请检查API配置是否正确');
    }

    console.log(`📋 原始列表前3个元素:`, list.slice(0, 3));

    // 处理模型数据，兼容不同的字段名
    const models = list
      .map((m, index) => {
        // 如果是字符串，直接使用
        if (typeof m === 'string') {
          return { id: m, context: 128000, features: [] };
        }
        
        // 如果是对象，尝试提取ID
        if (typeof m === 'object' && m !== null) {
          const id = m.id || m.model || m.name;
          if (!id) {
            console.warn(`⚠️ 跳过无效模型 [${index}]:`, m);
            return null;
          }
          return { id: String(id), context: 128000, features: [] };
        }
        
        // 其他类型，尝试转换为字符串
        console.warn(`⚠️ 未知模型类型 [${index}]:`, typeof m, m);
        return null;
      })
      .filter(m => m !== null)
      .sort((a, b) => a.id.localeCompare(b.id));

    console.log(`✅ 成功解析 ${models.length} 个模型`);
    console.log(`📋 前5个模型:`, models.slice(0, 5).map(m => m.id));
    
    return models;
    
  } catch (error) {
    console.error(`❌ fetchModelsFromApi 失败:`, error);
    console.error(`❌ 错误堆栈:`, error.stack);
    ErrorService.handle(error, { action: 'fetchModelsFromApi', module: 'llm', notify: false });
    throw error; // 抛出错误而不是返回空数组，让调用方知道失败了
  }
}

// ========================
// 便捷包装函数
// ========================

/**
 * 使用 LLMConfig 对象调用 LLM (简化参数传递)
 * 
 * @param {ChatMessage[]} messages - 聊天上下文
 * @param {LLMConfig} config - LLM 配置对象
 * @param {LLMOptions} [options={}] - 可选配置
 * @returns {Promise<string>} 模型返回的文本内容
 */
export async function callLLMWithConfig(messages, config, options = {}) {
  return callLLM(
    messages,
    config.provider,
    config.endpoint,
    config.apiKey,
    config.model,
    options
  );
}
