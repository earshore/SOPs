import fs from 'fs';

const data = JSON.parse(fs.readFileSync('tests/quality/security-audit-2026-02-22.json', 'utf-8'));
const mediumIssues = data.issues.filter(i => i.severity === 'medium');

console.log('中危漏洞总数:', mediumIssues.length);
console.log('\n按规则分组:');

const grouped = {};
mediumIssues.forEach(i => {
  if (!grouped[i.ruleId]) grouped[i.ruleId] = [];
  grouped[i.ruleId].push(i);
});

Object.entries(grouped).forEach(([ruleId, issues]) => {
  const rule = issues[0];
  console.log(`\n${ruleId} (${issues.length}个):`);
  console.log(`  消息: ${rule.message}`);
  console.log(`  建议: ${rule.recommendation}`);
  console.log('  位置:');
  issues.forEach(i => {
    console.log(`    - ${i.file}:${i.line}`);
  });
});
