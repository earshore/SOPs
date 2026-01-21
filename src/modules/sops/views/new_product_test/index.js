// 新品测试 SOP 模块
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/new_product_test/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 新品测试 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 新品测试 SOP 模块已卸载");
}
