/**
 * URL 安全测试用例
 * 
 * 此文件包含各种不安全的 URL 处理模式，用于测试安全审计工具的检测能力
 * 
 * ⚠️ 警告：此文件仅用于测试目的，不应在生产代码中使用这些模式
 */

// ============================================================================
// 1. 不安全的 location 赋值
// ============================================================================

// 应该被检测：直接赋值动态 URL
function unsafeRedirect1(url: string) {
  window.location = url as any; // 不安全：未验证的重定向
}

function unsafeRedirect2(redirectUrl: string) {
  location.href = redirectUrl; // 不安全：未验证的重定向
}

function unsafeRedirect3(target: string) {
  document.location = target as any; // 不安全：未验证的重定向
}

// ============================================================================
// 2. 不安全的 URL 参数使用
// ============================================================================

// 应该被检测：从 URL 参数获取重定向目标
function unsafeRedirectFromParams1() {
  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get('redirect');
  if (redirectUrl) {
    window.location.href = redirectUrl; // 不安全：未验证的重定向参数
  }
}

function unsafeRedirectFromParams2() {
  const url = new URL(window.location.href);
  const returnUrl = url.searchParams.get('return');
  if (returnUrl) {
    location.href = returnUrl; // 不安全：未验证的返回 URL
  }
}

function unsafeRedirectFromParams3() {
  const goto = new URLSearchParams(location.search).get('goto');
  if (goto) {
    window.location = goto as any; // 不安全：未验证的跳转目标
  }
}

// ============================================================================
// 3. 不安全的 URL hash 使用
// ============================================================================

// 应该被检测：动态设置 hash
function unsafeHashSet(hash: string) {
  location.hash = hash; // 可能不安全：未转义的 hash
}

function unsafeHashFromInput() {
  const input = document.querySelector('input')?.value;
  if (input) {
    window.location.hash = input; // 不安全：用户输入直接设置 hash
  }
}

// ============================================================================
// 4. 不安全的 window.open
// ============================================================================

// 应该被检测：动态构造 URL
function unsafeWindowOpen1(baseUrl: string, param: string) {
  window.open(baseUrl + '?id=' + param); // 不安全：字符串拼接 URL
}

function unsafeWindowOpen2(url: string) {
  const target = 'https://example.com/' + url;
  window.open(target); // 不安全：未验证的 URL 拼接
}

// ============================================================================
// 5. 不安全的 iframe src
// ============================================================================

// 应该被检测：动态设置 iframe src
function unsafeIframeSrc1(url: string) {
  const iframe = document.createElement('iframe');
  iframe.src = 'https://example.com/' + url; // 不安全：字符串拼接
  document.body.appendChild(iframe);
}

function unsafeIframeSrc2(element: HTMLIFrameElement, path: string) {
  element.src = element.src + path; // 不安全：动态修改 src
}

// ============================================================================
// 6. 不安全的 fetch URL
// ============================================================================

// 应该被检测：动态构造 fetch URL
async function unsafeFetch1(endpoint: string, id: string) {
  const response = await fetch(endpoint + '/' + id); // 不安全：字符串拼接
  return response.json();
}

async function unsafeFetch2(baseUrl: string, params: string) {
  const url = baseUrl + '?' + params;
  return fetch(url); // 不安全：未验证的 URL
}

// ============================================================================
// 7. 不安全的 XMLHttpRequest URL
// ============================================================================

// 应该被检测：动态构造 XHR URL
function unsafeXHR1(endpoint: string, id: string) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', endpoint + '/' + id); // 不安全：字符串拼接
  xhr.send();
}

function unsafeXHR2(baseUrl: string, query: string) {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', baseUrl + '?' + query); // 不安全：未验证的查询参数
  xhr.send();
}

// ============================================================================
// 8. 不安全的 anchor href
// ============================================================================

// 应该被检测：动态设置 anchor href
function unsafeAnchorHref1(link: HTMLAnchorElement, url: string) {
  link.href = 'https://example.com/' + url; // 不安全：字符串拼接
}

function unsafeAnchorHref2(url: string) {
  const a = document.createElement('a');
  a.href = url; // 可能不安全：未验证的 URL
  a.click();
}

// ============================================================================
// 9. 不安全的 URL 构造（AST 检测）
// ============================================================================

// 应该被检测：使用字符串拼接构造 URL
function unsafeURLConstructor1(base: string, path: string) {
  const url = new URL(base + path); // 不安全：字符串拼接
  return url;
}

function unsafeURLConstructor2(domain: string, endpoint: string) {
  const url = new URL(`https://${domain}/${endpoint}`); // 不安全：模板字符串
  return url;
}

// ============================================================================
// 10. 不安全的 location.replace/assign（AST 检测）
// ============================================================================

// 应该被检测：使用未验证的输入
function unsafeLocationReplace1(url: string, param: string) {
  window.location.replace(url + '?id=' + param); // 不安全：字符串拼接
}

function unsafeLocationAssign1(base: string, path: string) {
  location.assign(base + path); // 不安全：字符串拼接
}

function unsafeLocationReplace2(domain: string) {
  window.location.replace(`https://${domain}/redirect`); // 不安全：模板字符串
}

// ============================================================================
// 11. 不安全的 URL 协议设置（AST 检测）
// ============================================================================

// 应该被检测：动态设置协议
function unsafeProtocolSet1(protocol: string) {
  const url = new URL(window.location.href);
  url.protocol = protocol; // 不安全：动态设置协议
  window.location.href = url.href;
}

function unsafeProtocolSet2(scheme: string) {
  location.protocol = scheme; // 不安全：动态设置协议
}

// ============================================================================
// 安全的实现示例（不应被检测）
// ============================================================================

// 安全：使用白名单验证
function safeRedirect1(url: string) {
  const allowedDomains = ['example.com', 'trusted.com'];
  try {
    const urlObj = new URL(url);
    if (allowedDomains.includes(urlObj.hostname)) {
      window.location.href = url;
    }
  } catch {
    console.error('Invalid URL');
  }
}

// 安全：使用相对路径
function safeRedirect2(path: string) {
  if (path.startsWith('/')) {
    window.location.href = path;
  }
}

// 安全：使用固定的基础 URL
function safeFetch1(id: string) {
  const baseUrl = 'https://api.example.com/users/';
  const url = new URL(id, baseUrl);
  return fetch(url.href);
}

// 安全：验证 URL 参数
function safeRedirectFromParams() {
  const params = new URLSearchParams(window.location.search);
  const redirectUrl = params.get('redirect');
  
  if (redirectUrl) {
    try {
      const url = new URL(redirectUrl, window.location.origin);
      // 只允许同源重定向
      if (url.origin === window.location.origin) {
        window.location.href = url.href;
      }
    } catch {
      console.error('Invalid redirect URL');
    }
  }
}

// 安全：使用 CSP 和 sandbox
function safeIframe(trustedUrl: string) {
  const iframe = document.createElement('iframe');
  iframe.src = trustedUrl;
  iframe.sandbox.add('allow-scripts');
  iframe.sandbox.add('allow-same-origin');
  document.body.appendChild(iframe);
}

export {
  // 导出以避免未使用警告
  unsafeRedirect1,
  unsafeRedirect2,
  safeRedirect1,
  safeRedirect2
};
