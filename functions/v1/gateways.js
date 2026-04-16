// functions/v1/gateways.js
// 网关列表 API - 返回所有可用网关
// 前端通过此 API 动态获取网关列表，无需硬编码

import { listGateways } from './_shared/gateway-resolver.js';

/** 统一 CORS 响应头 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

/**
 * 处理网关列表请求
 *
 * GET /v1/gateways
 *
 * 响应格式:
 * {
 *   "gateways": [
 *     {
 *       "id": "new_api",
 *       "name": "NEW API",
 *       "endpoint": "https://new.hongecb.store/v1",
 *       "protocol": "openai"
 *     }
 *   ]
 * }
 */
export async function onRequest(context) {
  // CORS 预检
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (context.request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: CORS_HEADERS
    });
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
        error: {
          message: "Invalid token (request id: " + Date.now() + ")",
          type: "auth_error",
          code: "unauthorized"
        }
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // ============================================================
    // 📋 获取网关列表
    // ============================================================
    const gatewayList = listGateways(context.env);

    console.log(`📋 [gateways] Returning ${gatewayList.length} gateways`);

    return new Response(JSON.stringify({
      gateways: gatewayList,
      count: gatewayList.length,
      timestamp: Date.now(),
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // 缓存 5 分钟
        ...CORS_HEADERS
      },
    });

  } catch (error) {
    console.error("❌ [gateways] Error:", error);

    return new Response(JSON.stringify({
      error: {
        message: "Internal server error",
        type: "server_error"
      }
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
}
