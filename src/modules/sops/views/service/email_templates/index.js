// 邮件回复模板 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/service/email_templates/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 邮件回复模板 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 邮件回复模板 SOP 模块已卸载");
}
