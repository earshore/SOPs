// Local OpenAI-compatible mock LLM gateway for Deep Chat → Keyword Hunter handoff testing.
// Usage: node tools/mock-llm-server.mjs [port]   (default 8787)
// Logs each request body to tools/mock-llm-requests.log for reasoning/token inspection.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2] || 8787);
const LOG_FILE = path.join(__dirname, 'mock-llm-requests.log');

function logRequest(entry) {
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${JSON.stringify(entry)}\n`);
}

const LISTING_BODY = `Ich habe die Briefings geprüft und die SEO-Keywords berücksichtigt. Hier ist die optimierte Listing-Kopie:

1. Title: HONGE CB Multi-Funktions-Ordnungssystem für Küche & Bad – Platzsparend, Wasserdicht & Stapelbar

2. Bullet 1: STAPELBARES AUFBEWAHRUNGSSYSTEM – Dieses vielseitige Ordnungssystem lässt sich dank des modularen Designs vertikal und horizontal kombinieren. Ideal für Küche, Bad, Büro und Garage.
3. Bullet 2: WASSERDICHT & LANGLEBIG – Hergestellt aus hochwertigem, BPA-freiem Kunststoff mit verstärkten Kanten. Feuchte Umgebungen sind kein Problem, die Oberfläche lässt sich einfach mit einem feuchten Tuch reinigen.
4. Bullet 3: PLATZSPARENDES DESIGN – Das platzsparende Design nutzt jeden Zentimeter Ihres Schranks optimal aus. 5 Fächer bieten ausreichend Platz für Gewürze, Kosmetik, Werkzeuge oder Büroartikel.
5. Bullet 4: EINFACHE MONTAGE – Keine Werkzeuge erforderlich: In weniger als 2 Minuten aufgebaut. Inklusive rutschfester Füße für sicheren Stand auf jeder Oberfläche.
6. Bullet 5: VIELSEITIG EINSETZBAR – Perfekt für Küchenutensilien, Badezimmerartikel, Spielzeug, Schreibwaren und vieles mehr. Das neutrale Design passt in jede Einrichtung.

7. Description: Das HONGE CB Ordnungssystem ist die intelligente Lösung für ein aufgeräumtes Zuhause. Dank des stapelbaren und modularen Designs schaffen Sie im Handumdrehen zusätzlichen Stauraum – egal ob in der Küche, im Bad, im Büro oder in der Garage. Die wasserdichte und langlebige Konstruktion aus BPA-freiem Kunststoff ist für den täglichen Gebrauch ausgelegt und bleibt auch in feuchten Umgebungen zuverlässig. Die einfache Montage ohne Werkzeug macht den Aufbau in weniger als zwei Minuten möglich. Entdecken Sie jetzt die flexible Aufbewahrungslösung, die mit Ihrem Zuhause mitwächst – bestellen Sie noch heute das HONGE CB Ordnungssystem!

[END-OF-LISTING]`;

const SHORT_BODY = `1. Title: HONGE CB Compact Organizer Box – Platzsparend & Robust

2. Bullet 1: Kompakte Aufbewahrungsbox für Küche, Bad und Büro.
3. Bullet 2: BPA-freier Kunststoff, wasserabweisende Oberfläche.
4. Bullet 3: Stapelbar und mit Griffen für einfachen Transport.
5. Bullet 4: Kein Werkzeug nötig – sofort einsatzbereit.
6. Bullet 5: Neutrales Design passt in jede Einrichtung.

7. Description: Die HONGE CB Compact Organizer Box schafft Ordnung in jedem Raum. Robust, platzsparend und einfach zu reinigen.

[END-OF-LISTING]`;

function sse(event) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function chatDelta(delta, finishReason = null) {
  const chunk = { choices: [{ index: 0, delta, finish_reason: finishReason }] };
  return sse(chunk);
}

function streamText(res, text, { chunkSize = 40, delayMs = 15, reasoningText = '', reasoningChunkSize = 60, reasoningDelayMs = 12, truncateAt = null } = {}) {
  const effective = truncateAt ? text.slice(0, truncateAt) : text;
  if (reasoningText) {
    for (let i = 0; i < reasoningText.length; i += reasoningChunkSize) {
      res.write(chatDelta({ reasoning_content: reasoningText.slice(i, i + reasoningChunkSize) }));
    }
  }
  for (let i = 0; i < effective.length; i += chunkSize) {
    res.write(chatDelta({ content: effective.slice(i, i + chunkSize) }));
  }
  res.write(chatDelta({}, 'stop'));
  res.write('data: [DONE]\n\n');
  res.end();
}

function streamSlow(res, text) {
  const effective = text.slice(0, Math.floor(text.length * 0.55)); // slow model never finishes visibly fast
  let i = 0;
  const timer = setInterval(() => {
    if (i >= effective.length) {
      clearInterval(timer);
      res.write(chatDelta({}, 'stop'));
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    res.write(chatDelta({ content: effective.slice(i, i + 24) }));
    i += 24;
  }, 120);
  res.on('close', () => clearInterval(timer));
}

const MODEL_PLAN = {
  'deepseek-v4-flash': {
    description: '推理默认关闭（无 thinking 字段），正常短文案',
    respond(reqBody, res) {
      streamText(res, SHORT_BODY, { chunkSize: 60, delayMs: 8 });
    },
  },
  'deepseek-v4-max': {
    description: 'thinking.type=enabled + reasoning_effort=high，推理 + 前言 + 完整文案',
    respond(reqBody, res) {
      streamText(res, LISTING_BODY, {
        chunkSize: 60,
        delayMs: 10,
        reasoningText: '用户需要完整的德语 Listing 文案。我先分析 SEO 关键词：stapelbar, wasserdicht, platzsparend, Küche, Bad。标题需要包含主要关键词并保持可读性。Bullets 需要覆盖功能、材质、安装、多功能性。描述需要自然融入关键词并推动转化。现在开始生成结构化输出。',
      });
    },
  },
  'gpt-5': {
    description: 'reasoning_effort + reasoning_content（OpenAI 风格），完整文案',
    respond(reqBody, res) {
      streamText(res, LISTING_BODY, {
        chunkSize: 80,
        delayMs: 8,
        reasoningText: 'The user wants a German Amazon listing. I will structure title, five bullets, and description around the SEO keywords provided.',
      });
    },
  },
  'deepseek-v4-truncated': {
    description: '模拟 max_output_tokens 截断：正文只发出 65% 就 finish（推送会不完整）',
    respond(reqBody, res) {
      const truncateAt = Math.floor(LISTING_BODY.length * 0.65);
      streamText(res, LISTING_BODY, {
        chunkSize: 80,
        delayMs: 8,
        truncateAt,
        reasoningText: '输出预算有限，需要精简回答。',
      });
    },
  },
  'deepseek-v4-reasoning-only-fail': {
    description: '只发推理不发正文，且 recovery 请求也返回空（复现 DEEP_CHAT_001 失败气泡）',
    respond(reqBody, res) {
      streamText(res, '', {
        reasoningText: '思考完成。但本次模拟故意不输出正文，且恢复请求同样不输出，以复现前端 DEEP_CHAT_001 失败态。',
      });
    },
  },
  'deepseek-v4-stream-abort': {
    description: '流中中断：发送约 40% 正文后断开连接（复现 BodyStreamBuffer aborted → 部分正文保留）',
    respond(reqBody, res) {
      const half = Math.floor(LISTING_BODY.length * 0.4);
      let i = 0;
      const timer = setInterval(() => {
        if (i >= half) {
          clearInterval(timer);
          res.destroy();
          return;
        }
        res.write(chatDelta({ content: LISTING_BODY.slice(i, i + 60) }));
        i += 60;
      }, 40);
      res.on('close', () => clearInterval(timer));
    },
  },
  'deepseek-v4-slow': {
    description: '慢速流式（打字机/流式期间可点推送按钮测试）',
    respond(reqBody, res) {
      streamSlow(res, LISTING_BODY);
    },
  },
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  let rawBody = '';
  req.on('data', chunk => (rawBody += chunk));
  req.on('end', () => {
    const body = rawBody ? JSON.parse(rawBody) : {};
    const model = String(body.model || '');

    if (req.method === 'GET' && url.pathname === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        object: 'list',
        data: Object.keys(MODEL_PLAN).map(id => ({ id, object: 'model', owned_by: 'mock' })),
      }));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/v1/chat/completions') {
      logRequest({
        model,
        surface: 'chat_completions',
        max_tokens: body.max_tokens ?? null,
        temperature: body.temperature ?? null,
        thinking: body.thinking ?? null,
        reasoning_effort: body.reasoning_effort ?? null,
        stream: body.stream ?? null,
        messageCount: Array.isArray(body.messages) ? body.messages.length : null,
      });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      const plan = MODEL_PLAN[model];
      if (!plan) {
        res.write(chatDelta({ content: `未知 mock 模型 ${model}，请使用：${Object.keys(MODEL_PLAN).join(', ')}` }));
        res.write(chatDelta({}, 'stop'));
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
      plan.respond(body, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: `not found: ${req.method} ${url.pathname}` } }));
  });
});

server.listen(PORT, () => {
  console.log(`mock LLM gateway listening on http://localhost:${PORT}`);
  console.log(`models: ${Object.keys(MODEL_PLAN).join(', ')}`);
});
