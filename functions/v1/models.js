// functions/v1/models.js
// 多网关路由分发 - 根据 X-Gateway-Provider 请求头自动选择 baseURL 和 apiKey

/**
 * 根据 provider 标识解析网关配置
 * @param {string} provider
 * @param {object} env
 * @returns {{ baseUrl: string, apiKey: string } | null}
 */
function resolveGateway(provider, env) {
  const map = {
    llmgateway: {
      baseUrl: env.GATEWAY_LLMGATEWAY_BASE_URL || "https://ai-gateway.hongecb.store/v1",
      apiKey:  env.GATEWAY_LLMGATEWAY_API_KEY  || "",
    },
    cb: {
      baseUrl: env.GATEWAY_CB_BASE_URL || "https://cb.hongecb.store/v1",
      apiKey:  env.GATEWAY_CB_API_KEY  || "",
    },
    cb_e: {
      baseUrl: env.GATEWAY_CB_E_BASE_URL || "https://cb-e.cflts.dpdns.org/v1",
      apiKey:  env.GATEWAY_CB_E_API_KEY  || "",
    },
    dooo_cn: {
      baseUrl: env.GATEWAY_DOOO_CN_BASE_URL || "https://ai.ijunze.cn/v1",
      apiKey:  env.GATEWAY_DOOO_CN_API_KEY  || "",
    },
    dooo: {
      baseUrl: env.GATEWAY_DOOO_BASE_URL || "https://ai.dooo.ng/v1",
      apiKey:  env.GATEWAY_DOOO_API_KEY  || "",
    },
    gptgod: {
      baseUrl: env.GATEWAY_GPTGOD_BASE_URL || "https://api.gptgod.online/v1",
      apiKey:  env.GATEWAY_GPTGOD_API_KEY  || "",
    },
  };
  return map[provider] || null;
}

export async function onRequest(context) {
  // CORS 预检
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Gateway-Provider",
      },
    });
  }

  if (context.request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
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
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // ============================================================
    // 🚦 网关路由
    // ============================================================
    const provider = (context.request.headers.get("X-Gateway-Provider") || "llmgateway").toLowerCase();
    const gateway = resolveGateway(provider, context.env);

    if (!gateway) {
      return new Response(JSON.stringify({
        error: { message: `⛔ 未知网关标识: ${provider}，支持: llmgateway, cb, cb_e, dooo_cn, dooo, gptgod` }
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    console.log(`🌐 [models] provider=${provider} → ${gateway.baseUrl}`);

    // ============================================================
    // 📡 转发到上游网关 /models
    // ============================================================
    const response = await fetch(`${gateway.baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${gateway.apiKey}`,
      },
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
            "Access-Control-Allow-Origin": "*",
            "X-Error-Type": "GEO_RESTRICTION",
          },
        });
      }

      return new Response(errorText, {
        status: response.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    console.error(`❌ [models] 服务器错误:`, err);
    return new Response(JSON.stringify({ error: { message: `Server Error: ${err.message}` } }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
