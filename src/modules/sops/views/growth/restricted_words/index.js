// 欧洲本土化高危词库 (Restricted Words) SOP
import { initRestrictedWordsPanel } from './restrictedWordsHandler.js';

export async function mount(container) {
    const response = await fetch('src/modules/sops/views/growth/restricted_words/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');

    // 初始化词库面板功能
    initRestrictedWordsPanel();

    console.log("✅ 欧洲本土化高危词库 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 欧洲本土化高危词库 SOP 模块已卸载");
}
