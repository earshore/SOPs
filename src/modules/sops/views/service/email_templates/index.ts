/**
 * 邮件回复模板 SOP - 静态版
 * Email Reply Templates SOP - Static Version
 */

import BaseModule from '../../../../../common/BaseModule';
import { setSafeHtml } from '../../../../../common/utils/security';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { registerActionsWithLegacy, unregisterActions } from '../../../../../common/utils/actionRegistry';
import { StorageService } from '../../../../../services/storageService';

const REVIEW_OWNER_STORAGE_KEY = 'email_templates_owner_v1';
const DEFAULT_REVIEW_OWNER = '客服负责人';

function normalizeReviewOwner(owner: unknown): string {
    return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_REVIEW_OWNER;
}

function restoreReviewOwner(): void {
    const input = document.getElementById('email-templates-owner') as HTMLInputElement | null;
    if (input) input.value = normalizeReviewOwner(StorageService.get<string>(REVIEW_OWNER_STORAGE_KEY, DEFAULT_REVIEW_OWNER));
}

function readReviewOwner(): string {
    const input = document.getElementById('email-templates-owner') as HTMLInputElement | null;
    return normalizeReviewOwner(input?.value);
}

function saveReviewOwner(owner: string): void {
    StorageService.set(REVIEW_OWNER_STORAGE_KEY, normalizeReviewOwner(owner));
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

export function buildEmailTemplatesReviewTemplate(owner = DEFAULT_REVIEW_OWNER): string {
    const today = new Date().toISOString().split('T')[0];
    const reviewOwner = normalizeReviewOwner(owner);

    return [
        `# 客服邮件处理复盘归档 - ${today}`,
        '',
        '## 作业范围',
        `- 作业负责人：${reviewOwner}`,
        '- 店铺/站点/语言：',
        '- 订单号或内部编号：',
        '- 场景类型：物流 / 产品损坏 / 退货退款 / 缺件 / 使用咨询 / A-to-Z / 安全投诉 / GDPR / 其他',
        '- 优先级：P0 / P1 / P2 / P3',
        '- SLA：4h / 12h / 24h / 30天',
        '',
        '## 消息摘要',
        '- 买家诉求摘要：',
        '- 订单/物流/售后状态：',
        '- 历史沟通要点：',
        '- 是否存在升级风险：A-to-Z / 差评威胁 / 安全投诉 / 退款争议 / 无',
        '',
        '## 回复草稿与动作',
        '- 使用模板编号：',
        '- 回复语言：',
        '- 回复草稿摘要：',
        '- 提供方案：退款 / 补发 / 退货 / 使用指导 / 发票 / 平台客服引导 / 其他',
        '- 内部动作：查订单 / 查物流 / 查库存 / 同步质检 / 同步主管 / 留截图',
        '',
        '## 人工确认点',
        '- A-to-Z、Chargeback 或法律/安全投诉：已确认 / 待确认 / 不涉及',
        '- 退款、补偿或补发承诺：已确认 / 待确认 / 不涉及',
        '- 是否避免提及 Review/评价/星级：已确认 / 待确认',
        '- 站外链接、营销内容和敏感承诺：已复核 / 待复核',
        '- 公开发送前最终检查：已确认 / 待确认',
        `- 最终确认人：${reviewOwner}`,
        '',
        '## 复盘记录',
        '- 本次问题根因：产品 / 物流 / 描述不符 / 买家误解 / 其他',
        '- 是否需要同步 VOC：是 / 否',
        '- 是否需要更新模板或 FAQ：是 / 否',
        '- 后续跟进时间：',
        '- 可复用表达或处理经验：',
        '',
        '> 客服模板只用于生成和沉淀回复草稿；A-to-Z、退款补偿、差评相关场景、合规敏感回复和公开发送必须人工确认后执行。',
    ].join('\n');
}

async function copyEmailTemplatesReviewTemplate(): Promise<void> {
    const owner = readReviewOwner();
    saveReviewOwner(owner);
    const reviewTemplate = buildEmailTemplatesReviewTemplate(owner);

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(reviewTemplate);
        } else if (!fallbackCopyText(reviewTemplate)) {
            throw new Error('clipboard unavailable');
        }

        alert('已复制客服邮件处理复盘模板，可粘贴到周报或归档文档。');
    } catch {
        alert('复制失败，请手动复制邮件处理模板或稍后重试。');
    }
}

declare global {
    interface Window {
        sops_copyEmailTemplatesReviewTemplate?: () => Promise<void>;
    }
}

class EmailTemplatesModule extends BaseModule {
    private removeTemplateToggleListener: (() => void) | null = null;
    private registeredActions: string[] = [];

    private bindTemplateToggles(container: HTMLElement): void {
        this.removeTemplateToggleListener?.();

        const handleToggleClick = (event: Event): void => {
            const target = event.target as HTMLElement | null;
            const toggle = target?.closest<HTMLElement>('[data-email-template-toggle]');
            if (!toggle || !container.contains(toggle)) return;

            toggle.nextElementSibling?.classList.toggle('hidden');
        };

        container.addEventListener('click', handleToggleClick);
        this.removeTemplateToggleListener = () => {
            container.removeEventListener('click', handleToggleClick);
            this.removeTemplateToggleListener = null;
        };
    }

    /**
     * 挂载模块
     */
    async mount(container: HTMLElement): Promise<void> {
        const html = await loadTemplate('src/modules/sops/views/service/email_templates/template.html');
        // ✅ 安全: html来自本地静态template.html，无用户输入
        setSafeHtml(container, html);
        container.classList.add('fade-in');
        this.bindTemplateToggles(container);
        restoreReviewOwner();

        this.registeredActions = registerActionsWithLegacy({
            sops_copyEmailTemplatesReviewTemplate: copyEmailTemplatesReviewTemplate as (...args: unknown[]) => void,
        });
    }

    /**
     * 卸载模块
     */
    unmount(): void {
        this.removeTemplateToggleListener?.();
        if (this.registeredActions.length > 0) {
            unregisterActions(this.registeredActions);
            this.registeredActions = [];
        }
    }
}

// 导出模块实例
const emailTemplatesModule = new EmailTemplatesModule('email_templates');

export const mount = (container: HTMLElement) => emailTemplatesModule.mount(container);
export const unmount = () => emailTemplatesModule.unmount();
