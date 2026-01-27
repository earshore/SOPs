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
    
    // ============================================================
    // 🚀 多 Key 负载均衡模块 (与直连模式兼容)
    // ============================================================
    
    // 获取真实的 API Keys (逗号分隔)
    const envKeys = context.env.LLM_API_KEY || "";
    const keyList = envKeys.split(',').map(k => k.trim()).filter(k => k);

    let REAL_API_KEY = "";

    // 模式 A: 服务器托管 Key (需密码验证)
    if (keyList.length > 0) {
       // 验证密码
       const correctPassword = context.env.AUTH_PASSWORD;
       if (correctPassword && userProvidedPass !== correctPassword) {
         return new Response(JSON.stringify({ 
           error: { message: "⛔ 访问被拒绝：请输入正确的访问密码 (Access Password)" } 
         }), {
           status: 401,
           headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
         });
       }
       // 随机抽取一个服务器 Key
       REAL_API_KEY = keyList[Math.floor(Math.random() * keyList.length)];
    } 
    // 模式 B: 用户自带 Key (透传模式)
    else {
       if (!userProvidedPass) {
         return new Response(JSON.stringify({ 
           error: { message: "⛔ 未配置 API Key：请在设置中输入您的 OpenAI API Key，或联系管理员配置服务器 Key。" } 
         }), {
           status: 401,
           headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
         });
       }
       // 使用用户提供的 Key
       REAL_API_KEY = userProvidedPass;
    }

    // ============================================================
    // 📡 转发请求模块
    // ============================================================

    const requestBody = await context.request.json();
    const UPSTREAM_API_URL = context.env.LLM_API_BASE_URL || "https://api.openai.com/v1";

    const response = await fetch(`${UPSTREAM_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 使用最终确定的 Key
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