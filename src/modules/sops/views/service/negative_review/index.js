// 差评处理与分析 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/service/negative_review/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 差评处理 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 差评处理 SOP 模块已卸载");
}
