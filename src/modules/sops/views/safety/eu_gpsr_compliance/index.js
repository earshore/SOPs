import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// 欧洲GPSR合规 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/safety/eu_gpsr_compliance/template.html');
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 欧洲GPSR合规 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 欧洲GPSR合规 SOP 模块已卸载");
}
