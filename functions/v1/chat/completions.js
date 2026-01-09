// functions/v1/chat/completions.js

export async function onRequest(context) {
  // 1. 处理 CORS (允许你的前端访问)
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
    // 2. 获取请求体
    const requestBody = await context.request.json();

    // 3. 获取环境变量中的真实 Key (将在 Cloudflare 后台配置)
    // 假设你使用 OpenAI，也可以根据 requestBody.model 判断切换不同的 Key
    const REAL_API_KEY = context.env.LLM_API_KEY; 
    
    // 如果你想支持自定义 API 地址 (例如中转商)，也可以配在环境变量里
    const UPSTREAM_API_URL = context.env.LLM_API_BASE_URL || "https://api.openai.com/v1";

    if (!REAL_API_KEY) {
      return new Response(JSON.stringify({ error: { message: "Server: API Key not configured" } }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 4. 转发请求给大模型服务商
    const response = await fetch(`${UPSTREAM_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${REAL_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    // 5. 返回结果给前端
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // 允许跨域
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message } }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}