// 账号登录与环境安全 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/safety/account_security/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 账号登录与环境安全 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 账号登录与环境安全 SOP 模块已卸载");
}
