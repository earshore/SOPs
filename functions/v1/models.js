// functions/v1/models.js
// 获取模型列表的代理端点

export async function onRequest(context) {
  // 1. 处理预检请求 (CORS)
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (context.request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // ============================================================
    // 🔒 安全鉴权模块
    // ============================================================
    
    const authHeader = context.request.headers.get("Authorization") || "";
    const userProvidedPass = authHeader.replace("Bearer ", "").trim();
    
    // 获取真实的 API Keys
    const envKeys = context.env.LLM_API_KEY || "";
    const keyList = envKeys.split(',').map(k => k.trim()).filter(k => k);

    let REAL_API_KEY = "";

    // 模式 A: 服务器托管 Key
    if (keyList.length > 0) {
       const correctPassword = context.env.AUTH_PASSWORD;
       if (correctPassword && userProvidedPass !== correctPassword) {
         return new Response(JSON.stringify({ 
           error: { message: "⛔ 访问被拒绝：请输入正确的访问密码" } 
         }), {
           status: 401,
           headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
         });
       }
       REAL_API_KEY = keyList[0]; // 使用第一个 Key
    } 
    // 模式 B: 用户自带 Key
    else {
       if (!userProvidedPass) {
         return new Response(JSON.stringify({ 
           error: { message: "⛔ 未配置 API Key" } 
         }), {
           status: 401,
           headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
         });
       }
       REAL_API_KEY = userProvidedPass;
    }

    // ============================================================
    // 📡 转发请求
    // ============================================================

    const UPSTREAM_API_URL = context.env.LLM_API_BASE_URL || "https://api.openai.com/v1";
    
    console.log(`🌐 [Functions/Models] 使用上游端点: ${UPSTREAM_API_URL}`);

    const response = await fetch(`${UPSTREAM_API_URL}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${REAL_API_KEY}`,
      },
    });

    // 错误处理
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Functions/Models] 上游 API 错误 ${response.status}:`, errorText);
      
      // 特殊处理 403 地理限制错误
      if (response.status === 403 && errorText.includes('Country, region, or territory not supported')) {
        return new Response(JSON.stringify({ 
          error: { 
            message: "⛔ 地理位置限制：无法获取模型列表。请联系管理员配置不受限制的 API 端点。",
            status: 403
          } 
        }), {
          status: 403,
          headers: { 
            "Content-Type": "application/json", 
            "Access-Control-Allow-Origin": "*",
            "X-Error-Type": "GEO_RESTRICTION"
          }
        });
      }
      
      return new Response(errorText, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
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
    console.error(`❌ [Functions/Models] 服务器错误:`, err);
    return new Response(JSON.stringify({ 
      error: { message: `Server Error: ${err.message}` } 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
