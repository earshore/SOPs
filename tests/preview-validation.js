/**
 * 预览环境自动化验证脚本
 * 验证关键功能和 CSS 加载
 */

import http from 'http';

const BASE_URL = 'http://localhost:4174';
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function fetch(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

// ==================== 测试用例 ====================

test('首页可访问', async () => {
  const res = await fetch('/');
  assert(res.status === 200, `期望状态码 200，实际 ${res.status}`);
  assert(res.body.includes('Amazing Amazon Architect'), '页面标题缺失');
  console.log('  ✓ 首页返回 200');
  console.log('  ✓ 页面标题正确');
});

test('主 CSS 文件加载', async () => {
  const res = await fetch('/');
  const cssMatch = res.body.match(/href="([^"]*index-[^"]*\.css)"/);
  assert(cssMatch, '未找到主 CSS 文件引用');

  const cssPath = cssMatch[1];
  const cssRes = await fetch(cssPath);
  assert(cssRes.status === 200, `CSS 文件返回 ${cssRes.status}`);
  assert(cssRes.headers['content-type'].includes('text/css'), 'CSS MIME 类型错误');
  assert(cssRes.body.length > 100000, `CSS 文件太小: ${cssRes.body.length} bytes`);

  console.log(`  ✓ CSS 文件路径: ${cssPath}`);
  console.log(`  ✓ CSS 文件大小: ${(cssRes.body.length / 1024).toFixed(2)} KB`);
  console.log(`  ✓ MIME 类型: ${cssRes.headers['content-type']}`);
});

test('关键 CSS 类存在', async () => {
  const res = await fetch('/');
  const criticalClasses = [
    'header',
    'nav-wrapper',
    'mega-menu',
    'toast-container'
  ];

  for (const cls of criticalClasses) {
    assert(res.body.includes(cls), `缺少关键类: ${cls}`);
  }

  // 检查 main-content 的 id 而不是 class
  assert(res.body.includes('id="main-content"'), '缺少 main-content 元素');

  console.log(`  ✓ 所有关键 CSS 类存在 (${criticalClasses.length} 个)`);
  console.log(`  ✓ main-content 元素存在`);
});

test('JavaScript 模块加载', async () => {
  const res = await fetch('/');
  const jsMatch = res.body.match(/src="([^"]*index-[^"]*\.js)"/);
  assert(jsMatch, '未找到主 JS 文件引用');

  const jsPath = jsMatch[1];
  const jsRes = await fetch(jsPath);
  assert(jsRes.status === 200, `JS 文件返回 ${jsRes.status}`);
  assert(jsRes.headers['content-type'].includes('javascript'), 'JS MIME 类型错误');

  console.log(`  ✓ JS 文件路径: ${jsPath}`);
  console.log(`  ✓ JS 文件大小: ${(jsRes.body.length / 1024).toFixed(2)} KB`);
});

test('静态资源可访问', async () => {
  const assets = [
    '/logo.svg',
    '/_headers',
    '/_redirects'
  ];

  for (const asset of assets) {
    const res = await fetch(asset);
    assert(res.status === 200, `${asset} 返回 ${res.status}`);
  }
  console.log(`  ✓ 所有静态资源可访问 (${assets.length} 个)`);
});

test('CSP 头部配置', async () => {
  const res = await fetch('/');
  // 注意：本地预览可能没有 CSP 头，这是正常的
  if (res.headers['content-security-policy']) {
    const csp = res.headers['content-security-policy'];
    assert(csp.includes("style-src"), 'CSP 缺少 style-src');
    assert(csp.includes("script-src"), 'CSP 缺少 script-src');
    console.log('  ✓ CSP 头部已配置');
  } else {
    console.log('  ⚠ 本地预览未启用 CSP（生产环境会启用）');
  }
});

test('HTML 结构完整', async () => {
  const res = await fetch('/');
  const requiredElements = [
    '<header',
    '<main',
    '<nav',
    'id="main-content"',
    'id="toast-container"',
    'id="global-loading"'
  ];

  for (const elem of requiredElements) {
    assert(res.body.includes(elem), `缺少必需元素: ${elem}`);
  }
  console.log(`  ✓ HTML 结构完整 (${requiredElements.length} 个关键元素)`);
});

// ==================== 运行测试 ====================

async function runTests() {
  console.log('\n🧪 开始预览环境验证...\n');
  console.log(`📍 测试目标: ${BASE_URL}\n`);

  for (const { name, fn } of tests) {
    try {
      console.log(`▶ ${name}`);
      await fn();
      passed++;
      console.log(`✅ 通过\n`);
    } catch (error) {
      failed++;
      console.log(`❌ 失败: ${error.message}\n`);
    }
  }

  console.log('='.repeat(50));
  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败 (共 ${tests.length} 个测试)`);

  if (failed === 0) {
    console.log('\n✨ 所有测试通过！预览环境运行正常。\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分测试失败，请检查上述错误信息。\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('\n💥 测试执行出错:', err);
  process.exit(1);
});
