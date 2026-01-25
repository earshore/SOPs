import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// 后台权限管理 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/safety/permission_management/template.html');
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 后台权限管理 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 后台权限管理 SOP 模块已卸载");
}
