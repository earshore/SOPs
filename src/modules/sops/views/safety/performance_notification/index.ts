import { loadTemplate } from "../../../../../common/utils/viewLoader";
import { setSafeHtml } from "../../../../../common/utils/security";
import { registerActionsWithLegacy, unregisterActions } from "../../../../../common/utils/actionRegistry";
import { StorageService } from "../../../../../services/storageService";

const REPORT_OWNER_STORAGE_KEY = 'performance_notification_owner_v1';
const DEFAULT_REPORT_OWNER = '账号安全负责人';

let registeredActions: string[] = [];

function normalizeReportOwner(owner: unknown): string {
    return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_REPORT_OWNER;
}

function restoreReportOwner(): void {
    const input = document.getElementById('performance-notification-owner') as HTMLInputElement | null;
    if (input) input.value = normalizeReportOwner(StorageService.get<string>(REPORT_OWNER_STORAGE_KEY, DEFAULT_REPORT_OWNER));
}

function readReportOwner(): string {
    const input = document.getElementById('performance-notification-owner') as HTMLInputElement | null;
    return normalizeReportOwner(input?.value);
}

function saveReportOwner(owner: string): void {
    StorageService.set(REPORT_OWNER_STORAGE_KEY, normalizeReportOwner(owner));
}

function fallbackCopyText(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        return document.execCommand('copy');
    } finally {
        textarea.remove();
    }
}

export function buildPerformanceNotificationTemplate(owner = DEFAULT_REPORT_OWNER): string {
    const today = new Date().toISOString().split('T')[0];
    const reportOwner = normalizeReportOwner(owner);

    return [
        `# 绩效通知上报复盘归档 - ${today}`,
        '',
        '## 5 分钟内上报信息',
        `- 上报负责人：${reportOwner}`,
        '- 店铺/站点：',
        '- 通知类型：产品真实性 / 侵权 / 安全 / Listing 违规 / 其他',
        '- 涉及 ASIN/订单号：',
        '- 收到时间：',
        '- 截止日期：',
        '- 截图或原文路径：',
        '',
        '## 风险分级',
        '- 风险等级：P0 账号停用 / P1 下架或高风险 / P2 需整改 / P3 观察',
        '- 是否影响主力 ASIN：是 / 否',
        '- 是否需要暂停销售或广告：待主管确认',
        '- 是否需要法务/合规/供应链协同：',
        '',
        '## 已采取动作',
        '- 已完成截图留档：是 / 否',
        '- 已发工作群：是 / 否',
        '- 已登记在线表：是 / 否',
        '- 已分配负责人：',
        '',
        '## 待主管确认',
        '- 是否回复绩效通知：待确认',
        '- POA 根因、纠正措施、预防措施：待确认',
        '- 发票/授权书/检测报告等证据：待确认',
        '- 删除/下架 Listing、提交申诉或联系权利人：待确认',
        `- 最终确认人：${reportOwner}`,
        '',
        '## 复盘记录',
        '- 本次根因：',
        '- 最终处理结果：',
        '- 防止复发动作：',
        '- 下次跟进日期：',
        '',
        '> 绩效通知不得私自回复、忽视或删除。任何回复、申诉、资料提交和账号处置必须由主管确认后执行。',
    ].join('\n');
}

async function copyPerformanceNotificationTemplate(): Promise<void> {
    const owner = readReportOwner();
    saveReportOwner(owner);
    const reportTemplate = buildPerformanceNotificationTemplate(owner);

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(reportTemplate);
        } else if (!fallbackCopyText(reportTemplate)) {
            throw new Error('clipboard unavailable');
        }

        alert('已复制绩效通知上报复盘模板，可粘贴到工作群或归档文档。');
    } catch {
        alert('复制失败，请手动复制上报模板或稍后重试。');
    }
}

declare global {
    interface Window {
        sops_copyPerformanceNotificationTemplate?: () => Promise<void>;
    }
}

// 绩效通知处理 SOP
export async function mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate('src/modules/sops/views/safety/performance_notification/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, html);
    container.classList.add('fade-in');
    restoreReportOwner();

    registeredActions = registerActionsWithLegacy({
        sops_copyPerformanceNotificationTemplate: copyPerformanceNotificationTemplate as (...args: unknown[]) => void,
    });
}

export function unmount(): void {
    if (registeredActions.length > 0) {
        unregisterActions(registeredActions);
        registeredActions = [];
    }
}
