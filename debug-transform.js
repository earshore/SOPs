// 在浏览器Console中运行这个脚本
const dropdown = document.getElementById('amzf_search_history');

console.log('=== 检查所有可能影响位置的CSS ===');

// 检查computed style
const computedStyle = window.getComputedStyle(dropdown);
console.log('\n1. Transform相关:');
console.log('  transform:', computedStyle.transform);
console.log('  transform-origin:', computedStyle.transformOrigin);

console.log('\n2. Position相关:');
console.log('  position:', computedStyle.position);
console.log('  top:', computedStyle.top);
console.log('  left:', computedStyle.left);

console.log('\n3. 父元素检查:');
let parent = dropdown.parentElement;
let level = 0;
while (parent && level < 5) {
    const parentStyle = window.getComputedStyle(parent);
    console.log(`  Level ${level} - ${parent.tagName}.${parent.className}:`);
    console.log(`    transform: ${parentStyle.transform}`);
    console.log(`    position: ${parentStyle.position}`);
    parent = parent.parentElement;
    level++;
}

console.log('\n4. Inline样式:');
console.log('  style.transform:', dropdown.style.transform);
console.log('  style.top:', dropdown.style.top);
console.log('  style.left:', dropdown.style.left);
