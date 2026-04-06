// functions/v1/models.js
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
 * @param {string} provider
 * @param {object} env
 * @returns {{ baseUrl: string, apiKey: string } | null}
 */
function resolveGateway(provider, env) {
  const map = {
    new_api: {
      baseUrl: env.GATEWAY_NEW_BASE_URL || "https://new.hongecb.store/v1",
      apiKey:  pickApiKey(env.GATEWAY_NEW_API_KEY),
    },
    cpa: {
      baseUrl: env.GATEWAY_CPA_BASE_URL || "https://cpa.hongecb.store/v1",
      apiKey:  pickApiKey(env.GATEWAY_CPA_API_KEY),
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
        error: { message: "⛔ 访问被拒绝：请输入正确的访问密码 (AUTH_PASSWORD)" }
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // ============================================================
    // 🚦 网关路由
    // ============================================================
    const provider = (context.request.headers.get("X-Gateway-Provider") || "new_api").toLowerCase();
    const gateway = resolveGateway(provider, context.env);

    if (!gateway) {
      return new Response(JSON.stringify({
        error: { message: `⛔ 未知网关标识: ${provider}，支持: new_api, cpa` }
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    console.log(`🌐 [models] provider=${provider} → ${gateway.baseUrl}`);

    // ============================================================
    // 📡 转发到上游网关 /models（referrerPolicy: no-referrer 阻止携带 Referer）
    // ============================================================
    const response = await fetch(`${gateway.baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${gateway.apiKey}`,
      },
      referrerPolicy: "no-referrer",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [models] 上游错误 ${response.status}:`, errorText);

      if (response.status === 403 && errorText.includes("Country") && errorText.includes("not supported")) {
        return new Response(JSON.stringify({
          error: {
            message: `⛔ 地理限制：网关 ${provider} 当前无法访问模型列表。请切换其他网关。`,
            status: 403,
          }
        }), {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "X-Error-Type": "GEO_RESTRICTION",
            ...CORS_HEADERS,
          },
        });
      }

      return new Response(errorText, {
        status: response.status,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });

  } catch (err) {
    console.error(`❌ [models] 服务器错误:`, err);
    return new Response(JSON.stringify({ error: { message: `Server Error: ${err.message}` } }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
}
