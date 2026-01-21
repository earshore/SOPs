// QA 问答维护 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/service/qa_maintenance/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ QA 问答维护 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ QA 问答维护 SOP 模块已卸载");
}
