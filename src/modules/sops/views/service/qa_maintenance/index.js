import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// QA 问答维护 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/service/qa_maintenance/template.html');
    // ✅ 安全: html来自静态模板文件，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ QA 问答维护 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ QA 问答维护 SOP 模块已卸载");
}
