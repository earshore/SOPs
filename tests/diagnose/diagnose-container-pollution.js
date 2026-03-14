/**
 * 容器污染诊断脚本
 * 追踪app_center_content_area容器的变化
 */

console.log('=== 容器污染诊断 ===\n');

// 1. 检查容器当前状态
const container = document.getElementById('app_center_content_area');
if (!container) {
    console.error('❌ 容器不存在');
    process.exit(1);
}

console.log('1. 容器当前状态:');
console.log('   - 子元素数量:', container.children.length);
console.log('   - innerHTML长度:', container.innerHTML.length);
console.log('   - 第一个子元素:', container.children[0]?.tagName);
console.log('   - 前100字符:', container.innerHTML.substring(0, 100));

// 2. 检查是否包含meta标签
const hasMeta = container.querySelector('meta');
console.log('\n2. 是否包含meta标签:', !!hasMeta);
if (hasMeta) {
    console.log('   ❌ 检测到meta标签,容器已被污染!');
    console.log('   meta标签:', hasMeta.outerHTML);
}

// 3. 检查父容器
console.log('\n3. 父容器信息:');
console.log('   - 父元素ID:', container.parentElement?.id);
console.log('   - 父元素class:', container.parentElement?.className);

// 4. 检查panel-app_center
const panel = document.getElementById('panel-app_center');
console.log('\n4. panel-app_center状态:');
console.log('   - 存在:', !!panel);
console.log('   - 是否隐藏:', panel?.classList.contains('hidden'));
console.log('   - 子元素数量:', panel?.children.length);

console.log('\n=== 诊断完成 ===');
