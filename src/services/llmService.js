// src/services/llmService.js

/**
 * 通用大语言模型调用接口
 * @param {Array} messages - 聊天上下文
 * @param {string} provider -厂商 (openai, anthropic...)
 * @param {string} endpoint - API 端点
 * @param {string} apiKey - API 密钥
 * @param {string} model - 模型名称
 * @param {Object} options - 可选配置 (temperature, jsonMode, timeout)
 */
export async function callLLM(
  messages,
  provider,
  endpoint,
  apiKey,
  model,
  options = {}
) {
  const { temperature = 0.3, jsonMode = true, timeout = 90000 } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestBody = {
    model: model,
    messages: messages,
    temperature: temperature,
    // 只有部分模型支持 response_format，这里做个兼容性处理会更好，但在毕设中强制 JSON 也没问题
    ...(jsonMode && { response_format: { type: "json_object" } }),
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

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (e) {
    clearTimeout(timeoutId); // 确保异常时也清除定时器
    if (e.name === "AbortError")
      throw new Error(`模型响应超时(${timeout / 1000}秒)，请检查网络或重试`);
    throw e;
  }
}

/**
 * 获取模型列表
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
    console.error("Fetch Models Error:", error);
    return []; // 失败返回空数组，不阻断流程
  }
}
