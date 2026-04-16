// functions/v1/chat/completions.js (优化版)
// 多网关路由分发 - 使用自动发现机制

import { resolveGateway, validateGateway, listGateways } from '../_shared/gateway-resolver.js';

/** 统一 CORS 响应头 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Gateway-Provider",
  "Access-Control-Max-Age": "86400",
  "Referrer-Policy": "no-referrer",
};

/**
 * 构建上游请求配置
 */
function getUpstreamRequest(provider, gateway, requestBody) {
  return {
    url: `${gateway.baseUrl}/chat/completions`,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${gateway.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  };
}

/**
 * 标准化上游响应（预留扩展点）
 */
function normalizeUpstreamResponse(provider, data, requestBody) {
  // 未来可以在这里做协议适配（OpenAI vs Anthropic）
  return data;
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
        error: { message: "Invalid token (request id: " + Date.now() + ")", type: "auth_error", code: "" }
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // ============================================================
    // 🚦 网关路由 - 自动发现和验证
    // ============================================================
    const provider = (context.request.headers.get("X-Gateway-Provider") || "new_api").toLowerCase();

    // 验证网关
    const validation = validateGateway(provider, context.env);
    if (!validation.valid) {
      const availableGateways = listGateways(context.env).map(g => g.id);
      return new Response(JSON.stringify({
        error: {
          message: validation.error,
          available_gateways: availableGateways,
        }
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // 解析网关配置
    const gateway = resolveGateway(provider, context.env);

    console.log(`🌐 [completions] provider=${provider} → ${gateway.baseUrl}`);

    // ============================================================
    // 📦 KV 缓存（可选）
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
    // 📡 转发到上游网关
    // ============================================================
    const upstreamRequest = getUpstreamRequest(provider, gateway, requestBody);
    const response = await fetch(upstreamRequest.url, {
      method: "POST",
      headers: upstreamRequest.headers,
      body: upstreamRequest.body,
      referrerPolicy: "no-referrer",
    });

    const responseData = await response.text();

    // 写入缓存
    if (kv && cacheKey && response.ok) {
      try {
        await kv.put(cacheKey, responseData, { expirationTtl: 3600 });
      } catch (e) {
        console.warn("Cache Write Error:", e);
      }
    }

    // 返回响应
    return new Response(responseData, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "X-Cache-Status": "MISS",
        "X-Gateway-Provider": provider,
        ...CORS_HEADERS,
      },
    });

  } catch (error) {
    console.error("❌ [completions] Error:", error);

    return new Response(JSON.stringify({
      error: {
        message: "Internal server error",
        type: "server_error",
        details: error.message,
      }
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
}
