/**
 * 一次性修复脚本：将 ai_analysis 页面误用的 Tailwind 语义类
 * 替换为引用设计令牌变量的任意值语法。
 *
 * 误用映射：
 *   text-primary   -> text-[color:var(--color-text-primary)]   (原为品牌蓝)
 *   text-secondary -> text-[color:var(--color-text-secondary)] (原为品牌次要色)
 *   text-tertiary  -> text-[color:var(--color-text-tertiary)]  (原为死类名)
 *   bg-secondary   -> bg-[color:var(--color-bg-secondary)]     (原为品牌次要色)
 *   bg-tertiary    -> bg-[color:var(--color-bg-tertiary)]      (原为死类名)
 *
 * lookbehind (?<!color-) 排除 --color-text-secondary 等已有变量引用，
 * lookahead (?![\w-]) 确保不匹配 text-secondary-light 等更长类名。
 * 带透明度修饰符的 /80 因 var() 不支持拆通道，改用语义化变量。
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [
  'src/modules/app_center/views/master_analysis/ai_analysis/template.html',
  'src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanel.ts',
].map((f) => path.resolve(root, f));

// 顺序敏感：先处理带 /80 透明度的特例，再处理普通类名
const rules = [
  { re: /hover:bg-secondary\/80/g, to: 'hover:bg-[color:var(--color-bg-hover)]' },
  { re: /bg-secondary\/80/g, to: 'bg-[color:var(--color-bg-secondary)]' },
  { re: /(?<!color-)text-primary(?![\w-])/g, to: 'text-[color:var(--color-text-primary)]' },
  { re: /(?<!color-)text-secondary(?![\w-])/g, to: 'text-[color:var(--color-text-secondary)]' },
  { re: /(?<!color-)text-tertiary(?![\w-])/g, to: 'text-[color:var(--color-text-tertiary)]' },
  { re: /(?<!color-)bg-secondary(?![\w-])/g, to: 'bg-[color:var(--color-bg-secondary)]' },
  { re: /(?<!color-)bg-tertiary(?![\w-])/g, to: 'bg-[color:var(--color-bg-tertiary)]' },
];

let totalChanges = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let out = src;
  let fileChanges = 0;
  for (const { re, to } of rules) {
    out = out.replace(re, (...args) => {
      fileChanges++;
      return to;
    });
  }
  if (out !== src) {
    fs.writeFileSync(file, out);
    console.log(`[fixed] ${path.relative(root, file)}  (+${fileChanges} replacements)`);
    totalChanges += fileChanges;
  } else {
    console.log(`[skip]  ${path.relative(root, file)}  (no match)`);
  }
}
console.log(`\nDone. Total replacements: ${totalChanges}`);
