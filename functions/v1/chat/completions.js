// functions/v1/chat/completions.js

export async function onRequest(context) {
  // 1. 处理预检请求 (CORS Options)
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // 2. 仅允许 POST
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const requestBody = await context.request.json();

    // 3. 关键：从 Cloudflare 环境变量获取真实 Key
    // 注意：你需要去 Cloudflare 后台 -> Settings -> Environment Variables 设置这个变量
    const REAL_API_KEY = context.env.LLM_API_KEY; 

    // 可选：支持自定义上游地址（如 DeepSeek），默认 OpenAI
    const UPSTREAM_API_URL = context.env.LLM_API_BASE_URL || "https://api.openai.com/v1";

    if (!REAL_API_KEY) {
      return new Response(JSON.stringify({ error: { message: "Server: Missing LLM_API_KEY env var" } }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 4. 转发请求给大模型
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
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message } }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}