// src/services/llmService.js
// ================================================================
// 🎯 P2 重构: 添加完整的 JSDoc 类型注释
// 🎯 Phase 5: 已集成 ErrorService
// ================================================================

import { ErrorService } from './errorService.js';

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
 * @property {boolean} [jsonMode=true] - 是否强制 JSON 输出格式
 * @property {number} [timeout=90000] - 超时时间 (毫秒)
 * @property {boolean} [stream=false] - 是否开启流式传输
 * @property {function(string, string):void} [onUpdate] - 流式更新回调 (fullContent, delta) => void
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
// 核心 API 函数
// ========================

/**
 * 通用大语言模型调用接口
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
 *   'gpt-4o-mini'
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
    jsonMode = true,
    timeout = 90000,
    stream = false,
    onUpdate = null
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  /** @type {Object} */
  const requestBody = {
    model: model,
    messages: messages,
    temperature: temperature,
    stream: stream,
    // 只有部分模型支持 response_format, 且流式模式下通常不需要或需特殊处理
    ...(jsonMode && !stream && { response_format: { type: "json_object" } }),
  };

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `服务器返回错误 ${response.status}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error && errorJson.error.message) {
          errorMsg = errorJson.error.message;
        }
      } catch (e) {
        // 解析失败，使用原始文本或状态码
      }
      throw new Error(errorMsg);
    }

    // ========== 流式处理逻辑 ==========
    if (stream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const delta = data.choices?.[0]?.delta?.content || "";
              if (delta) {
                fullContent += delta;
                if (onUpdate) onUpdate(fullContent, delta);
              }
            } catch (e) {
              console.debug("SSE Parse Error (ignorable):", e);
            }
          }
        }
      }
      return fullContent;
    }

    // ========== 普通处理逻辑 ==========
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === "AbortError") {
      throw new Error(`模型响应超时(${timeout / 1000}秒)，请检查网络或重试`);
    }
    throw e;
  }
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
    const res = await fetch(`${endpoint}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // 兼容不同厂商的数据结构 (OpenAI wrap in .data, some others might be array directly)
    const list = Array.isArray(data) ? data : data.data || [];

    return list
      .map((m) => ({ id: m.id, context: 128000, features: [] }))
      .sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    ErrorService.handle(error, { action: 'fetchModelsFromApi', module: 'llm', notify: false });
    return []; // 失败返回空数组，不阻断流程
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
