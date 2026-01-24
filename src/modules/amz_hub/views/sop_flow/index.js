import BaseModule from "../../../../common/BaseModule.js";

class SopFlowModule extends BaseModule {
    constructor() {
        super('amz_sop_flow');
    }

    async render() {
        this.container.innerHTML = `
            <div class="p-6">
                <h2 class="text-xl font-bold mb-4">SOP 流程中心</h2>
                <div class="p-4 bg-blue-50 text-blue-700 rounded-lg">
                    <i class="fas fa-info-circle mr-2"></i>
                    该模块正在建设中...
                </div>
            </div>
        `;
    }

    // 不需要 init 和 onUnmount，BaseModule 会处理默认行为
}

const instance = new SopFlowModule();
export const mount = (c) => instance.mount(c);
export const unmount = () => instance.unmount();
