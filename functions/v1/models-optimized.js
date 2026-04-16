// functions/v1/models-optimized.js
// 模型列表 API - 使用自动发现机制

import { resolveGateway, validateGateway, listGateways } from './_shared/gateway-resolver.js';

/** 统一 CORS 响应头 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Gateway-Provider",
  "Access-Control-Max-Age": "86400",
  "Referrer-Policy": "no-referrer",
};

export async function onRequest(context) {
  // CORS 预检
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (context.request.method !== "GET") {
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

    console.log(`🌐 [models] provider=${provider} → ${gateway.baseUrl}`);

    // ============================================================
    // 📡 转发到上游网关 /models
    // ============================================================
    const response = await fetch(`${gateway.baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${gateway.apiKey}`,
      },
      referrerPolicy: "no-referrer",
    });

    const responseData = await response.text();

    return new Response(responseData, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "X-Gateway-Provider": provider,
        ...CORS_HEADERS,
      },
    });

  } catch (error) {
    console.error("❌ [models] Error:", error);

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
