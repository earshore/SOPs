// src/ui/settings.js
// ================================================================
// 🎯 Phase 3: 已迁移使用 StorageService
// 🎯 Phase 5: 已集成 ErrorService
// ================================================================

import { PROVIDERS } from "../../common/constants/constants.js";
import { fetchModelsFromApi, callLLM } from "../../services/llmService.js";
import { showToast } from "../../common/utils/ui.js";
import { StorageService, STORAGE_KEYS } from "../../services/storageService.js";
import { ErrorService } from "../../services/errorService.js";

// ==========================================
// 1. 初始化监听器 (新增)
// ==========================================
// 这个函数需要在 main.js 里调用

export function initSettingsListeners() {
  const modal = document.getElementById("settings-modal");

  if (modal) {
    // 监听模态框的点击事件
    modal.addEventListener("click", (e) => {
      // 关键判断：
      // e.target 是用户实际点击的元素
      // e.currentTarget 是绑定事件的元素（这里是 modal 本身）
      // 如果两者相等，说明用户直接点击了黑色半透明背景（遮罩），而不是内部白色的设置面板
      if (e.target === modal) {
        closeSettings();
      }
    });
    // 2. 按 ESC 键关闭 (新增)
    document.addEventListener("keydown", (e) => {
      // 只有当设置面板显示时才生效
      if (e.key === "Escape" && modal && !modal.classList.contains("hidden")) {
        closeSettings();
      }
    });
  }
  // 绑定代理下拉框的切换事件
  const proxySelect = document.getElementById("proxy-select");
  if (proxySelect) {
    proxySelect.addEventListener("change", handleProxyTypeChange);
  }
}

// ==========================================
// 2. 模态框控制
// ==========================================

// 修改后的 openSettings
export function openSettings() {
  const modal = document.getElementById("settings-modal");
  if (modal) {
    modal.classList.remove("hidden");
    loadProviderConfig(); // 加载 LLM 配置
    loadProxyConfig(); // [新增] 加载代理配置
  }
}

export function closeSettings() {
  const modal = document.getElementById("settings-modal");
  if (modal) modal.classList.add("hidden");
}

// ==========================================
// 3. 配置加载与渲染 (Load & Render)
// ==========================================

export function loadProviderConfig() {
  document.getElementById("llm-model").innerHTML = '<option>加载配置中...</option>';
  const providerSelect = document.getElementById("llm-provider");
  if (!providerSelect) return;

  const provider = providerSelect.value;
  const config = PROVIDERS[provider];

  // 读取已保存的配置 (使用 StorageService)
  const savedConfig = StorageService.getLLMConfig(provider) || {};

  // 填充表单
  document.getElementById("llm-endpoint").value =
    savedConfig.endpoint || config.endpoint;
  document.getElementById("llm-apikey").value = savedConfig.apiKey || "";

  // 渲染模型下拉框
  renderModelSelect(savedConfig, config);

  // 更新UI状态
  updateConfigStatus(!!(savedConfig.apiKey && savedConfig.model));
}

function renderModelSelect(savedConfig, defaultConfig) {
  const modelSelect = document.getElementById("llm-model");
  modelSelect.innerHTML = '<option value="">选择模型</option>';

  const models =
    savedConfig.models && savedConfig.models.length > 0
      ? savedConfig.models
      : defaultConfig.models;

  models.forEach((m) => {
    const opt = document.createElement("option");
    const id = typeof m === "string" ? m : m.id;
    opt.value = id;
    opt.textContent = id;
    modelSelect.appendChild(opt);
  });

  if (savedConfig.model) {
    modelSelect.value = savedConfig.model;
    updateModelInfo(savedConfig.model, models);
  }
}

function updateModelInfo(modelId, models) {
  const info = document.getElementById("model-info");
  if (!info) return;

  const model = models.find(
    (m) => (typeof m === "string" ? m : m.id) === modelId
  );

  if (model && typeof model === "object" && model.context) {
    info.classList.remove("hidden");
    document.getElementById(
      "model-context"
    ).innerHTML = `<i class="fas fa-expand-alt mr-1 text-slate-400"></i>${model.context / 1000
    }K`;
    document.getElementById(
      "model-features"
    ).innerHTML = `<i class="fas fa-star mr-1 text-slate-400"></i>${model.features?.length ? model.features.join(", ") : "基础功能"
    }`;
  } else {
    info.classList.add("hidden");
  }
}

function updateConfigStatus(isReady) {
  const status = document.getElementById("config-status");
  if (!status) return;

  if (isReady) {
    status.className =
      "flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 mb-4 transition-colors";
    status.innerHTML = `<i class="fas fa-check-circle text-lg"></i> <span class="font-medium">API配置已就绪</span>`;
  } else {
    status.className =
      "flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 mb-4 transition-colors";
    status.innerHTML = `<i class="fas fa-exclamation-triangle text-lg"></i> <span>请配置API密钥并选择模型</span>`;
  }
}

/**
 * 测试当前 LLM 连接配置
 */
export async function testConnection() {
  const provider = document.getElementById("llm-provider").value;
  const endpoint = document.getElementById("llm-endpoint").value.trim();
  const apiKey = document.getElementById("llm-apikey").value.trim();
  const modelSelect = document.getElementById("llm-model");
  const model = modelSelect.value;

  // 1. 基础校验
  if (!apiKey) {
    showToast("无法测试：请填写 API Key", "warning");
    document.getElementById("llm-apikey").focus();
    return;
  }

  if (!model) {
    showToast("无法测试：请选择或同步模型", "warning");
    modelSelect.focus();
    return;
  }

  // 2. 获取按钮并设置 Loading 状态
  // 注意：这里假设 HTML 中触发此函数的按钮是 event.target，
  // 或者我们可以通过查找包含 onclick="testConnection()" 的元素。
  // 为了稳健，我们在 settings.html 中建议给该按钮加个 id，或者这里直接遍历查找。
  // 这里使用 querySelector 查找该按钮（基于 HTML 结构中的文本内容或位置）
  // 也可以在 html 中给按钮加 id="test-conn-btn" 最为稳妥。
  // 暂时使用文本查找策略，或者假设 event 传递了进来（需要在 html 改 onclick="testConnection(event)"）。
  // 为了不改 HTML 结构，我们通过 DOM 树定位：
  const btns = document.querySelectorAll("button");
  let targetBtn = null;
  for (let btn of btns) {
    if (btn.innerHTML.includes("测试连接")) {
      targetBtn = btn;
      break;
    }
  }

  const originalContent = targetBtn
    ? targetBtn.innerHTML
    : '<i class="fas fa-link"></i> 测试连接';
  if (targetBtn) {
    targetBtn.disabled = true;
    targetBtn.innerHTML =
      '<i class="fas fa-circle-notch fa-spin"></i> 连接中...';
  }

  try {
    showToast("正在发送测试请求...", "info");

    // 3. 构造测试消息
    const messages = [
      {
        role: "user",
        content: "Hello! Just testing the connection. Reply with 'OK'.",
      },
    ];

    // 4. 发起调用
    // 注意：这里强制 jsonMode: false，因为只是简单的 ping 测试，
    // 且不是所有模型在简单测试时都能完美输出 JSON。
    // timeout 设置为 10 秒，避免长时间等待。
    const response = await callLLM(
      messages,
      provider,
      endpoint,
      apiKey,
      model,
      { temperature: 0.1, jsonMode: false, timeout: 15000 }
    );

    // 5. 成功反馈
    console.log("Test Connection Response:", response);
    showToast(`连接成功！模型响应: ${response.slice(0, 20)}...`, "success");

    // 可选：测试成功后自动更新状态栏
    // updateConfigStatus(true);
  } catch (error) {
    ErrorService.handle(error, { action: 'testConnection', module: 'settings' });
  } finally {
    // 6. 恢复按钮状态
    if (targetBtn) {
      targetBtn.disabled = false;
      targetBtn.innerHTML = originalContent;
    }
  }
}

// ==========================================
// 4. 交互动作 (Actions)
// ==========================================

export function saveProviderConfig() {
  const provider = document.getElementById("llm-provider").value;
  const modelSelect = document.getElementById("llm-model");
  const endpoint = document.getElementById("llm-endpoint").value.trim();
  const apiKey = document.getElementById("llm-apikey").value.trim();
  //简单校验apikey
  if (!apiKey) {
    // 核心一行：添加类名后直接设置定时器移除
    document.getElementById("llm-apikey").classList.add("ring-2", "ring-red-500"), setTimeout(() => document.getElementById("llm-apikey").classList.remove("ring-2", "ring-red-500"), 3000);

    showToast("请填写 API Key", "warning");
    return;
  }

  const savedConfig = StorageService.getLLMConfig(provider) || {};

  const newConfig = {
    endpoint: endpoint,
    apiKey: apiKey,
    model: modelSelect.value,
    models: savedConfig.models || PROVIDERS[provider].models, // 保持现有模型列表
  };

  StorageService.setLLMConfig(provider, newConfig);

  updateConfigStatus(true);
  updateModelStatus(); // 刷新顶栏状态
  showToast("配置已保存", "success");

  // 自动关闭弹窗体验更好
  setTimeout(closeSettings, 500);
}

export async function fetchModels() {
  const provider = document.getElementById("llm-provider").value;
  const endpoint = document.getElementById("llm-endpoint").value.trim();
  const apiKey = document.getElementById("llm-apikey").value.trim();

  if (!apiKey) {
    showToast("请先输入API Key", "warning");
    return;
  }

  const btn = document.getElementById("fetch-models-btn");
  const originalHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML =
    '<i class="fas fa-circle-notch fa-spin text-slate-500"></i> <span class="text-slate-500">同步中...</span>';

  try {
    let models = [];
    // 对于支持列表接口的厂商
    if (["openai", "deepseek", "moonshot", "qwen"].includes(provider)) {
      models = await fetchModelsFromApi(provider, endpoint, apiKey);
    } else {
      // 不支持的厂商回退到静态配置
      models = PROVIDERS[provider].models;
      // 模拟一个网络延迟，让用户感觉“同步了”
      await new Promise((r) => setTimeout(r, 600));
    }

    if (models.length === 0) throw new Error("未能获取到有效模型列表");

    // 保存并重新渲染
    const savedConfig = StorageService.getLLMConfig(provider) || {};
    savedConfig.models = models;
    StorageService.setLLMConfig(provider, savedConfig);

    // 重新渲染下拉框
    renderModelSelect(savedConfig, PROVIDERS[provider]);

    showToast(`成功同步 ${models.length} 个模型`, "success");
  } catch (e) {
    ErrorService.handle(e, { action: 'fetchModels', module: 'settings' });
    // 失败不回退 UI，保留当前状态供用户重试
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

export function toggleApiKeyVisibility() {
  const input = document.getElementById("llm-apikey");
  // 修复：event.currentTarget 在某些浏览器或调用方式下可能失效，
  // 建议直接通过 DOM 查找按钮，或者如果不便修改 HTML，这里做兼容处理
  const btn = document.querySelector("#llm-apikey + button");

  if (input.type === "password") {
    input.type = "text";
    if (btn) {
      btn.innerHTML = '<i class="fas fa-eye text-slate-600"></i>';
      btn.title = "隐藏密钥";
    }
  } else {
    input.type = "password";
    if (btn) {
      btn.innerHTML = '<i class="fas fa-eye-slash text-slate-400"></i>';
      btn.title = "显示密钥";
    }
  }
}

// 顶栏状态指示
export function updateModelStatus() {
  const provider = StorageService.get(STORAGE_KEYS.LLM_ACTIVE_PROVIDER);
  const statusEl = document.getElementById("model-status");
  if (!statusEl) return;

  if (provider && PROVIDERS[provider]) {
    const config = StorageService.getLLMConfig(provider) || {};
    if (config.apiKey && config.model) {
      statusEl.innerHTML = `
                <span class="status-dot status-success"></span>
                <span class="text-slate-600 text-xs font-medium flex items-center gap-1">
                    ${PROVIDERS[provider].name}: <span class="font-mono text-blue-600">${config.model}</span>
                </span>
            `;
      return;
    }
  }
  statusEl.innerHTML = `
        <span class="status-dot status-pending pulse-dot"></span>
        <span class="text-slate-500 text-xs italic">等待API配置...</span>
    `;
}

// ==========================================
// 5. 采集网络设置逻辑 (新增)
// ==========================================

/**
 * 处理代理类型切换，控制输入框显示
 */
export function handleProxyTypeChange() {
  const select = document.getElementById("proxy-select");
  const container = document.getElementById("proxy-input-container");
  const label = document.getElementById("proxy-input-label");
  const helpText = document.getElementById("proxy-help-text");

  if (!select || !container) return;

  const mode = select.value;

  // 定义哪些模式需要输入 API Key 或 URL
  const needsInput = [
    "scraperapi",
    "zenrows",
    "brightdata",
    "custom_api",
    "custom_proxy",
  ].includes(mode);

  if (needsInput) {
    container.classList.remove("hidden");

    // 动态更新标签和提示
    if (mode === "custom_proxy") {
      label.textContent = "HTTP 代理地址";
      document.getElementById("custom-proxy").placeholder =
        "http://user:pass@ip:port";
      helpText.innerHTML =
        '<i class="fas fa-info-circle mt-0.5"></i><span>格式: http://user:pass@ip:port</span>';
    } else {
      label.textContent = "API Key";
      document.getElementById("custom-proxy").placeholder = "请输入密钥...";
      helpText.innerHTML =
        '<i class="fas fa-info-circle mt-0.5"></i><span>此处填写服务商提供的 API Key。</span>';
    }
  } else {
    container.classList.add("hidden");
  }
}

/**
 * 加载代理配置
 */
export function loadProxyConfig() {
  const savedConfig = StorageService.get(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, {});

  // 1. 设置下拉框的值 (默认 allorigins)
  const select = document.getElementById("proxy-select");
  if (select) {
    select.value = savedConfig.mode || "allorigins";
  }

  // 2. 填充 API Key / URL
  const input = document.getElementById("custom-proxy");
  if (input) {
    input.value = savedConfig.key || "";
  }

  // 3. 触发一次界面状态更新（确保输入框显示/隐藏正确）
  handleProxyTypeChange();
}

/**
 * 保存代理配置
 */
// export function saveProxyConfig() {
//   const select = document.getElementById("proxy-select");
//   const input = document.getElementById("custom-proxy");

//   if (!select) return;

//   const config = {
//     mode: select.value,
//     key: input ? input.value.trim() : ""
//   };

//   localStorage.setItem("scraper_proxy_config", JSON.stringify(config));

//   // 这里的 showToast 引用自顶部 import
//   showToast("网络配置已更新", "success");
// }

// 修正 saveProxyConfig
export function saveProxyConfig(isSilent = false) {
  const selectEl = document.getElementById("proxy-select");
  const inputEl = document.getElementById("custom-proxy");
  if (!selectEl) return;

  const proxyType = selectEl.value;
  const customUrl = inputEl ? inputEl.value.trim() : "";

  // 1. 保存 Key 到映射表 (修复未定义报错)
  saveKeyToMap(proxyType, customUrl);

  // 2. 保存当前生效的配置
  const config = { type: proxyType, customUrl: customUrl };
  StorageService.set(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, config);

  // 3. 提示用户
  if (!isSilent) {
    showToast("网络配置已更新", "success");
  }

  // 4. (可选) 重新加载 input UI 以确保状态同步
  // renderProxyInputUI(proxyType); 
}

// === 渲染代理输入框 ===
export function renderProxyInputUI(type) {
  const container = document.getElementById("proxy-input-container");
  if (!container) return;

  const needInput = [
    "scraperapi",
    "zenrows",
    "brightdata",
    "custom_api",
    "custom_proxy",
  ].includes(type);
  if (!needInput) {
    container.classList.add("hidden");
    container.innerHTML = "";
    const oldBtnContainer = document.querySelector(".flex.justify-end.pt-2");
    if (oldBtnContainer) oldBtnContainer.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");

  // 获取当前应该显示的值：优先显示全局配置中的（如果是当前类型），否则显示Map中存的
  const savedValue = getSavedKey(type);
  const savedGlobal = StorageService.get(STORAGE_KEYS.PROXY_CONFIG, {});
  // 逻辑优化：如果当前生效的配置类型 == 当前选择的类型，优先显示生效的值
  const currentValue =
    savedGlobal.type === type && savedGlobal.customUrl
      ? savedGlobal.customUrl
      : savedValue;

  // 逻辑优化：如果当前生效的配置类型 == 当前选择的类型，优先显示生效的值
  const currentGlobalConfig = StorageService.get(STORAGE_KEYS.SCRAPER_PROXY_CONFIG, {});

  let displayValue = savedValue;
  if (currentGlobalConfig.type === type && currentGlobalConfig.customUrl) {
    displayValue = currentGlobalConfig.customUrl;
  }

  let label = "API Key";
  let placeholder = "请输入密钥";
  let helpText = "系统自动托管请求";

  if (["scraperapi", "zenrows", "brightdata"].includes(type)) {
    label = "API Key (密钥)";
    placeholder = `粘贴 ${getProxyDisplayName(type)} Key`;
  } else if (type === "custom_api") {
    label = "完整端点 (URL)";
    placeholder = "https://api.example.com/?url=";
    helpText = "请确保包含 url= 参数";
  } else {
    label = "代理地址";
    placeholder = "http://user:pass@ip:port";
    helpText = "支持 HTTP/HTTPS 协议";
  }

  container.innerHTML = `
        <label id="proxy-input-label" class="block text-sm font-medium text-slate-700 mb-2">${label}</label>
        <div class="flex items-stretch gap-2">
            <div class="relative flex-1">
                <input type="password" id="custom-proxy" value="${currentValue}"
                    class="w-full pl-4 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono text-slate-700 shadow-sm"
                    placeholder="${placeholder}" />
                <button onclick="const el=document.getElementById('custom-proxy'); el.type = el.type==='password'?'text':'password'" 
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none p-1">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            <button onclick="window.saveProxyConfig()" 
                class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap">
                <i class="fas fa-save"></i>
                <span>保存</span>
            </button>
        </div>
        <p class="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <i class="fas fa-info-circle text-indigo-400"></i> ${helpText}
        </p>
    `;

  const oldBtnContainer = document.querySelector(".flex.justify-end.pt-2");
  if (oldBtnContainer) oldBtnContainer.classList.add("hidden");
}

// 在 settings.js 内部定义一个简单的内存/本地存储映射
function getSavedKey(type) {
  const map = StorageService.get(STORAGE_KEYS.PROXY_KEY_MAP, {});
  return map[type] || "";
}

function saveKeyToMap(type, key) {
  const map = StorageService.get(STORAGE_KEYS.PROXY_KEY_MAP, {});
  map[type] = key;
  StorageService.set(STORAGE_KEYS.PROXY_KEY_MAP, map);
}

function getProxyDisplayName(type) {
  const names = {
    scraperapi: "ScraperAPI (商业)",
    zenrows: "ZenRows (商业)",
    brightdata: "Bright Data",
    custom_api: "自定义 API",
    allorigins: "AllOrigins (免费)",
    custom_proxy: "HTTP 代理",
  };
  return names[type] || "默认直连";
}
