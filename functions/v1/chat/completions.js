// functions/v1/chat/completions.js
// 多网关路由分发 - 根据 X-Gateway-Provider 请求头自动选择 baseURL 和 apiKey

/**
 * 从逗号分隔的多个 API Key 中随机选取一个
 * 支持单 key 和多 key（如 "sk-aaa,sk-bbb,sk-ccc"）
 * @param {string} raw - 原始 key 字符串
 * @returns {string}
 */
function pickApiKey(raw) {
  if (!raw) return "";
  const keys = raw.split(",").map(k => k.trim()).filter(Boolean);
  if (keys.length <= 1) return keys[0] || "";
  return keys[Math.floor(Math.random() * keys.length)];
}

/**
 * 根据 provider 标识解析网关配置
 * @param {string} provider - 网关标识 (llmgateway | cb | cb_e | kr | gptgod | chatanywhere)
 * @param {object} env - Cloudflare 环境变量
 * @returns {{ baseUrl: string, apiKey: string } | null}
 */
function resolveGateway(provider, env) {
  const map = {
    llmgateway: {
      baseUrl: env.GATEWAY_LLMGATEWAY_BASE_URL || "https://ai-gateway.hongecb.store/v1",
      apiKey:  pickApiKey(env.GATEWAY_LLMGATEWAY_API_KEY),
    },
    cb: {
      baseUrl: env.GATEWAY_CB_BASE_URL || "https://cb.hongecb.store/v1",
      apiKey:  pickApiKey(env.GATEWAY_CB_API_KEY),
    },
    cb_e: {
      baseUrl: env.GATEWAY_CB_E_BASE_URL || "https://cb-e.cflts.dpdns.org/v1",
      apiKey:  pickApiKey(env.GATEWAY_CB_E_API_KEY),
    },
    kr: {
      baseUrl: env.GATEWAY_KR_BASE_URL || "https://kr.hongecb.store/v1",
      apiKey:  pickApiKey(env.GATEWAY_KR_API_KEY),
    },
    gptgod: {
      baseUrl: env.GATEWAY_GPTGOD_BASE_URL || "https://api.gptgod.online/v1",
      apiKey:  pickApiKey(env.GATEWAY_GPTGOD_API_KEY),
    },
    chatanywhere: {
      baseUrl: env.GATEWAY_CHATANYWHERE_BASE_URL || "https://api.chatanywhere.org/v1",
      apiKey:  pickApiKey(env.GATEWAY_CHATANYWHERE_API_KEY),
    },
  };
  return map[provider] || null;
}

/** 统一 CORS 响应头，所有响应都附加 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Gateway-Provider",
  "Access-Control-Max-Age": "86400",
  "Referrer-Policy": "no-referrer",
};

function buildAnthropicRequestBody(requestBody) {
  const rawMessages = Array.isArray(requestBody?.messages) ? requestBody.messages : [];
  const system = rawMessages
    .filter(message => message?.role === "system")
    .map(message => typeof message?.content === "string" ? message.content : "")
    .filter(Boolean)
    .join("\n\n");

  const messages = rawMessages
    .filter(message => message?.role !== "system")
    .map(message => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: typeof message?.content === "string" ? message.content : "",
    }))
    .filter(message => message.content);

  const maxTokens = Number(
    requestBody?.max_tokens
    || requestBody?.max_completion_tokens
    || requestBody?.max_output_tokens
    || 4096
  );

  return {
    model: requestBody?.model,
    messages,
    max_tokens: Number.isFinite(maxTokens) && maxTokens > 0 ? maxTokens : 4096,
    ...(system ? { system } : {}),
    ...(typeof requestBody?.temperature === "number" ? { temperature: requestBody.temperature } : {}),
  };
}

function getUpstreamRequest(provider, gateway, requestBody) {
  if (provider === "kr") {
    return {
      url: `${gateway.baseUrl}/messages`,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gateway.apiKey}`,
        "x-api-key": gateway.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(buildAnthropicRequestBody(requestBody)),
    };
  }

  return {
    url: `${gateway.baseUrl}/chat/completions`,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${gateway.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  };
}

function normalizeUpstreamResponse(provider, data, requestBody) {
  if (provider !== "kr") {
    return data;
  }

  const promptTokens = Number(data?.usage?.input_tokens) || 0;
  const completionTokens = Number(data?.usage?.output_tokens) || 0;
  const content = Array.isArray(data?.content)
    ? data.content
      .filter(item => item?.type === "text")
      .map(item => item?.text || "")
      .join("")
    : "";

  return {
    id: data?.id || `chatcmpl_${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: data?.model || requestBody?.model || "unknown",
    choices: [{
      index: 0,
      message: {
        role: "assistant",
        content,
      },
      finish_reason: data?.stop_reason === "max_tokens" ? "length" : "stop",
    }],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
}

export async function onRequest(context) {
  // CORS 预检
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    // ============================================================
    // 🔒 统一鉴权 - 验证 AUTH_PASSWORD
    // ============================================================
    const authHeader = context.request.headers.get("Authorization") || "";
    const userProvidedPass = authHeader.replace(/^Bearer\s+/i, "").trim();

    const correctPassword = context.env.AUTH_PASSWORD;
    if (correctPassword && userProvidedPass !== correctPassword) {
      return new Response(JSON.stringify({
        error: { message: "⛔ 访问被拒绝：请输入正确的访问密码 (AUTH_PASSWORD)" }
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // ============================================================
    // 🚦 网关路由 - 根据 X-Gateway-Provider 选择上游
    // ============================================================
    const provider = (context.request.headers.get("X-Gateway-Provider") || "llmgateway").toLowerCase();
    const gateway = resolveGateway(provider, context.env);

    if (!gateway) {
      return new Response(JSON.stringify({
        error: { message: `⛔ 未知网关标识: ${provider}，支持: llmgateway, cb, cb_e, kr, gptgod, chatanywhere` }
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    if (!gateway.apiKey) {
      return new Response(JSON.stringify({
        error: { message: `⛔ 网关 ${provider} 未配置 API Key，请检查 Cloudflare 环境变量` }
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    console.log(`🌐 [completions] provider=${provider} → ${gateway.baseUrl}`);

    // ============================================================
    // 📦 KV 缓存
    // ============================================================
    const requestBody = await context.request.json();
    let cacheKey = null;
    const kv = context.env.LLM_CACHE_KV;

    if (kv) {
      try {
        const bodyStr = JSON.stringify({ provider, ...requestBody });
        const msgBuffer = new TextEncoder().encode(bodyStr);
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashHex = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, "0")).join("");
        cacheKey = `llm_req_${hashHex}`;

        const cachedData = await kv.get(cacheKey);
        if (cachedData) {
          return new Response(cachedData, {
            headers: {
              "Content-Type": "application/json",
              "X-Cache-Status": "HIT",
              ...CORS_HEADERS,
            },
          });
        }
      } catch (e) {
        console.warn("Cache Read Error:", e);
      }
    }

    // ============================================================
    // 📡 转发到上游网关（referrerPolicy: no-referrer 阻止携带 Referer）
    // ============================================================
    const upstreamRequest = getUpstreamRequest(provider, gateway, requestBody);
    const response = await fetch(upstreamRequest.url, {
      method: "POST",
      headers: upstreamRequest.headers,
      body: upstreamRequest.body,
      referrerPolicy: "no-referrer",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [completions] 上游错误 ${response.status}:`, errorText);

      if (response.status === 403) {
        const isGeoBlock = errorText.includes("Country") && errorText.includes("not supported");
        const msg = isGeoBlock
          ? `⛔ 地理限制：网关 ${provider} 当前无法访问（Cloudflare 节点 IP 被拦截）。请切换其他网关。`
          : `⛔ 网关 ${provider} 返回 403 Forbidden（可能是 API Key 无效，或该服务屏蔽了当前节点 IP）。错误详情：${errorText.slice(0, 200)}`;
        return new Response(JSON.stringify({
          error: { message: msg, status: 403 }
        }), {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "X-Error-Type": isGeoBlock ? "GEO_RESTRICTION" : "UPSTREAM_FORBIDDEN",
            ...CORS_HEADERS,
          },
        });
      }

      return new Response(errorText, {
        status: response.status,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const upstreamData = await response.json();
    const data = normalizeUpstreamResponse(provider, upstreamData, requestBody);
    const jsonStr = JSON.stringify(data);

    // 写缓存
    if (kv && cacheKey) {
      try {
        context.waitUntil(kv.put(cacheKey, jsonStr, { expirationTtl: 86400 * 2 }));
      } catch (e) {
        console.warn("Cache Write Error:", e);
      }
    }

    return new Response(jsonStr, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "X-Cache-Status": "MISS",
        ...CORS_HEADERS,
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: { message: `Server Error: ${err.message}` } }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
}
