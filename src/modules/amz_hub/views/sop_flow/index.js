// 这是 sop_flow/index.js 的最小内容
export async function mount(container) {
    // 这里必须指向对应的 template.html
    const response = await fetch('src/modules/amz_hub/views/sop_flow/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in'); 
    console.log("✅ SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ SOP 模块已卸载");
}