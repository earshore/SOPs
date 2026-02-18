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
    // 📡 转发请求模块 (带 KV 缓存)
    // ============================================================

    const requestBody = await context.request.json();
    
    // 🌍 多端点支持 (优先使用不受地理限制的端点)
    // 1. 优先使用环境变量配置的端点
    // 2. 如果未配置，使用 OpenAI 官方端点 (可能受地理限制)
    const UPSTREAM_API_URL = context.env.LLM_API_BASE_URL || "https://api.openai.com/v1";
    
    console.log(`🌐 [Functions] 使用上游端点: ${UPSTREAM_API_URL}`);
    
    // --- 1. 缓存键生成 ---
    let cacheKey = null;
    const kv = context.env.LLM_CACHE_KV; // 需在后台绑定 KV Namespace
    
    if (kv) {
        try {
            // 只缓存核心参数，忽略 temperature 等随机因子以提高命中率? 
            // 不，为了严谨，缓存整个 body 比较安全。
            const bodyStr = JSON.stringify(requestBody);
            const msgBuffer = new TextEncoder().encode(bodyStr);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            cacheKey = `llm_req_${hashHex}`;
            
            // --- 2. 读缓存 ---
            const cachedData = await kv.get(cacheKey);
            if (cachedData) {
                return new Response(cachedData, {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "X-Cache-Status": "HIT"
                    }
                });
            }
        } catch (e) {
            console.warn("Cache Read Error:", e);
        }
    }

    const response = await fetch(`${UPSTREAM_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 使用最终确定的 Key
        "Authorization": `Bearer ${REAL_API_KEY}`, 
      },
      body: JSON.stringify(requestBody),
    });

    // 🔍 详细的错误处理
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Functions] 上游 API 错误 ${response.status}:`, errorText);
      
      // 特殊处理 403 地理限制错误
      if (response.status === 403 && errorText.includes('Country, region, or territory not supported')) {
        return new Response(JSON.stringify({ 
          error: { 
            message: "⛔ 地理位置限制：当前服务器所在地区无法访问上游 API。\n\n解决方案：\n1. 在 Cloudflare Pages 环境变量中配置 LLM_API_BASE_URL 为不受限制的端点\n2. 使用 Cloudflare AI Gateway\n3. 使用第三方代理服务（如 OpenRouter）\n\n请联系管理员配置。",
            status: 403,
            upstream_error: errorText
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
      
      // 其他错误直接返回
      return new Response(errorText, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 处理流式响应或普通响应
    const data = await response.json();
    const jsonStr = JSON.stringify(data);

    // --- 3. 写缓存 (仅成功时) ---
    if (response.ok && kv && cacheKey) {
        try {
            // 异步写入，不阻塞响应 (waitUntil)
            context.waitUntil(
                kv.put(cacheKey, jsonStr, { expirationTtl: 86400 * 2 }) // 缓存 48 小时
            );
        } catch (e) {
            console.warn("Cache Write Error:", e);
        }
    }

    return new Response(jsonStr, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Cache-Status": "MISS"
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: { message: `Server Error: ${err.message}` } }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}