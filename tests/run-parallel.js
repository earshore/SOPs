// tests/run-parallel.js
// ================================================================
// 🚀 Playwright 并行测试执行脚本
// 提供便捷的命令行接口来控制并行执行参数
// ================================================================

const { spawn } = require('child_process');
const os = require('os');

// 解析命令行参数
const args = process.argv.slice(2);
const options = {
  workers: null,
  browser: null,
  skipFirefox: false,
  skipWebkit: false,
  enableMobile: false,
  headed: false,
  debug: false,
  ui: false,
  project: null
};

// 解析参数
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--workers' || arg === '-w') {
    options.workers = parseInt(args[++i]);
  } else if (arg === '--browser' || arg === '-b') {
    options.browser = args[++i];
  } else if (arg === '--skip-firefox') {
    options.skipFirefox = true;
  } else if (arg === '--skip-webkit') {
    options.skipWebkit = true;
  } else if (arg === '--enable-mobile') {
    options.enableMobile = true;
  } else if (arg === '--headed') {
    options.headed = true;
  } else if (arg === '--debug') {
    options.debug = true;
  } else if (arg === '--ui') {
    options.ui = true;
  } else if (arg === '--project' || arg === '-p') {
    options.project = args[++i];
  } else if (arg === '--help' || arg === '-h') {
    showHelp();
    process.exit(0);
  }
}

// 构建环境变量
const env = { ...process.env };

if (options.workers !== null) {
  env.WORKERS = options.workers.toString();
  console.log(`🔧 使用 ${options.workers} 个 worker 并行执行`);
} else {
  const cpuCount = os.cpus().length;
  const defaultWorkers = Math.max(1, Math.floor(cpuCount * 0.5));
  console.log(`🔧 使用默认 worker 数量: ${defaultWorkers} (CPU 核心数的 50%)`);
}

if (options.browser) {
  env.BROWSER_ONLY = options.browser;
  console.log(`🌐 只在 ${options.browser} 浏览器上运行测试`);
}

if (options.skipFirefox) {
  env.SKIP_FIREFOX = '1';
  console.log(`⏭️  跳过 Firefox 测试`);
}

if (options.skipWebkit) {
  env.SKIP_WEBKIT = '1';
  console.log(`⏭️  跳过 WebKit 测试`);
}

if (options.enableMobile) {
  env.ENABLE_MOBILE = '1';
  console.log(`📱 启用移动端浏览器测试`);
}

// 构建 Playwright 命令
const playwrightArgs = ['playwright', 'test'];

if (options.headed) {
  playwrightArgs.push('--headed');
  console.log(`👁️  使用有头模式运行`);
}

if (options.debug) {
  playwrightArgs.push('--debug');
  console.log(`🐛 启用调试模式`);
}

if (options.ui) {
  playwrightArgs.push('--ui');
  console.log(`🎨 启用 UI 模式`);
}

if (options.project) {
  playwrightArgs.push('--project', options.project);
  console.log(`📦 只运行项目: ${options.project}`);
}

// 添加剩余的参数
const remainingArgs = args.filter(arg => 
  !arg.startsWith('--workers') && 
  !arg.startsWith('-w') &&
  !arg.startsWith('--browser') &&
  !arg.startsWith('-b') &&
  !arg.startsWith('--project') &&
  !arg.startsWith('-p') &&
  arg !== '--skip-firefox' &&
  arg !== '--skip-webkit' &&
  arg !== '--enable-mobile' &&
  arg !== '--headed' &&
  arg !== '--debug' &&
  arg !== '--ui' &&
  !Number.isInteger(parseInt(arg))
);

playwrightArgs.push(...remainingArgs);

console.log(`\n🚀 执行命令: npx ${playwrightArgs.join(' ')}\n`);

// 执行 Playwright
const child = spawn('npx', playwrightArgs, {
  env,
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});

// 帮助信息
function showHelp() {
  console.log(`
🎭 Playwright 并行测试执行脚本

用法:
  node tests/run-parallel.js [选项] [测试文件]

选项:
  -w, --workers <数量>     指定 worker 数量（默认：CPU 核心数的 50%）
  -b, --browser <浏览器>   只在指定浏览器运行（chromium/firefox/webkit）
  -p, --project <项目>     只运行指定项目
  --skip-firefox           跳过 Firefox 测试
  --skip-webkit            跳过 WebKit 测试
  --enable-mobile          启用移动端浏览器测试
  --headed                 使用有头模式运行
  --debug                  启用调试模式
  --ui                     启用 UI 模式
  -h, --help               显示帮助信息

示例:
  # 使用 4 个 worker 并行执行所有测试
  node tests/run-parallel.js --workers 4

  # 只在 Chromium 上运行测试
  node tests/run-parallel.js --browser chromium

  # 跳过 Firefox 和 WebKit，使用 2 个 worker
  node tests/run-parallel.js --workers 2 --skip-firefox --skip-webkit

  # 运行特定测试文件
  node tests/run-parallel.js tests/e2e/promptlab.spec.ts

  # 启用移动端测试
  node tests/run-parallel.js --enable-mobile

  # 使用 UI 模式调试
  node tests/run-parallel.js --ui

  # 只运行 chromium 项目
  node tests/run-parallel.js --project chromium
  `);
}
