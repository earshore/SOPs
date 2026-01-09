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
    const requestBody = await context.request.json();

    // ============================================================
    // 🚀 核心修改：支持多 Key 负载均衡
    // ============================================================
    
    // 1. 获取环境变量字符串
    const envKeys = context.env.LLM_API_KEY || "";
    
    // 2. 按逗号分割，并去除首尾空格，过滤空项
    const keyList = envKeys.split(',').map(k => k.trim()).filter(k => k);

    if (keyList.length === 0) {
      return new Response(JSON.stringify({ error: { message: "Server: No API Keys configured" } }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 3. 🎲 随机抽取一个 Key (简单的负载均衡)
    const REAL_API_KEY = keyList[Math.floor(Math.random() * keyList.length)];
    
    // 打印日志方便调试 (在 Cloudflare 后台日志可看，生产环境可注释掉)
    // console.log(`Using Key ending in ...${REAL_API_KEY.slice(-4)}`);

    // ============================================================

    const UPSTREAM_API_URL = context.env.LLM_API_BASE_URL || "https://api.openai.com/v1";

    // 4. 转发请求
    const response = await fetch(`${UPSTREAM_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${REAL_API_KEY}`, // 使用抽中的 Key
      },
      body: JSON.stringify(requestBody),
    });

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