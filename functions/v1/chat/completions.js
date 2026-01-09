// functions/v1/chat/completions.js

export async function onRequest(context) {
  // 1. 处理预检请求 (CORS)
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // ============================================================
    // 🔒 安全鉴权模块 (Gatekeeper)
    // ============================================================
    
    // 获取前端传来的 Token (用户在设置里填写的 API Key)
    const authHeader = context.request.headers.get("Authorization") || "";
    // 去掉 "Bearer " 前缀，拿到纯密码
    const userProvidedPass = authHeader.replace("Bearer ", "").trim();
    
    // 获取你在 Cloudflare 后台设置的正确密码
    const correctPassword = context.env.AUTH_PASSWORD;

    // 如果设置了密码，就强制检查
    if (correctPassword && userProvidedPass !== correctPassword) {
      return new Response(JSON.stringify({ 
        error: { message: "⛔ 访问被拒绝：请输入正确的访问密码 (Access Password)" } 
      }), {
        status: 401, // Unauthorized
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // ============================================================
    // 🚀 多 Key 负载均衡模块
    // ============================================================
    
    // 获取真实的 API Keys (逗号分隔)
    const envKeys = context.env.LLM_API_KEY || "";
    const keyList = envKeys.split(',').map(k => k.trim()).filter(k => k);

    if (keyList.length === 0) {
      return new Response(JSON.stringify({ error: { message: "Server: Configuration Error (No Real API Keys found)" } }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 随机抽取一个真实 Key
    const REAL_API_KEY = keyList[Math.floor(Math.random() * keyList.length)];

    // ============================================================
    // 📡 转发请求模块
    // ============================================================

    const requestBody = await context.request.json();
    const UPSTREAM_API_URL = context.env.LLM_API_BASE_URL || "https://api.openai.com/v1";

    const response = await fetch(`${UPSTREAM_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 这里必须用 REAL_API_KEY，而不是用户传来的密码
        "Authorization": `Bearer ${REAL_API_KEY}`, 
      },
      body: JSON.stringify(requestBody),
    });

    // 处理流式响应或普通响应
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: { message: `Server Error: ${err.message}` } }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}