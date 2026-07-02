import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { setSafeHtml } from '../../../../../common/utils/security';
import {
  registerActionsWithLegacy,
  unregisterActions,
} from '../../../../../common/utils/actionRegistry';
import { StorageService } from '../../../../../services/storageService';

const REVIEW_OWNER_STORAGE_KEY = 'permission_management_owner_v1';
const DEFAULT_REVIEW_OWNER = '账号安全负责人/Boss';

let registeredActions: string[] = [];

function normalizeReviewOwner(owner: unknown): string {
  return typeof owner === 'string' && owner.trim() ? owner.trim() : DEFAULT_REVIEW_OWNER;
}

function restoreReviewOwner(): void {
  const input = document.getElementById('permission-management-owner') as HTMLInputElement | null;
  if (input)
    input.value = normalizeReviewOwner(
      StorageService.get<string>(REVIEW_OWNER_STORAGE_KEY, DEFAULT_REVIEW_OWNER)
    );
}

function readReviewOwner(): string {
  const input = document.getElementById('permission-management-owner') as HTMLInputElement | null;
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

export function buildPermissionManagementTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = normalizeReviewOwner(owner);

  return [
    `# 后台权限变更/回收归档 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reviewOwner}`,
    '- 店铺/站点：',
    '- 员工姓名/邮箱：',
    '- 岗位角色：运营 / 客服 / 采购仓储 / 主管 / 其他',
    '- 变更类型：新增用户 / 权限扩大 / 权限缩小 / 调岗 / 离职回收 / 季度审计',
    '',
    '## 权限申请或变更内容',
    '- 申请权限模块：Catalog / Inventory / Orders / Advertising / Reports / Messages / Brand Registry / 其他',
    '- 权限级别：无权限 / 只读 / 编辑',
    '- 业务理由：',
    '- 生效时间：',
    '- 预计回收或复核时间：',
    '',
    '## 禁止或敏感权限检查',
    '- Payments：禁止开放 / 需 Boss 本人确认',
    '- Settings：禁止开放 / 需 Boss 本人确认',
    '- 银行账户、税务、用户权限：未开放 / 异常需处理',
    '- 跨店铺或跨站点权限：已复核 / 待复核',
    '- 是否符合最小权限原则：是 / 否 / 需调整',
    '',
    '## 执行动作（人工确认后执行）',
    '- 新增子账号或发送邀请：',
    '- 调整权限范围：',
    '- 删除或停用子账号：',
    '- 更新权限登记表：',
    '- 通知员工/主管/负责人：',
    '',
    '## 人工确认点',
    '- 新增用户或权限扩大：已确认 / 待确认',
    '- Payments/Settings 未开放：已确认 / 待确认',
    '- 离职或调岗权限回收：已确认 / 待确认',
    '- 权限登记表已更新：已确认 / 待确认',
    `- 最终确认人：${reviewOwner}`,
    '',
    '## 复盘记录',
    '- 本次变更原因：',
    '- 异常权限或越权风险：',
    '- 已同步对象：Boss / 主管 / 员工 / IT',
    '- 下次权限审计日期：',
    '- 需要更新的岗位权限矩阵：',
    '',
    '> 后台新增用户、权限扩大、Payments/Settings、离职回收和跨店铺权限均属于高风险动作，必须人工确认后执行并留痕。',
  ].join('\n');
}

async function copyPermissionManagementTemplate(): Promise<void> {
  const owner = readReviewOwner();
  saveReviewOwner(owner);
  const reviewTemplate = buildPermissionManagementTemplate(owner);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(reviewTemplate);
    } else if (!fallbackCopyText(reviewTemplate)) {
      throw new Error('clipboard unavailable');
    }

    alert('已复制后台权限变更归档模板，可粘贴到工作群或归档文档。');
  } catch {
    alert('复制失败，请手动复制权限管理模板或稍后重试。');
  }
}

declare global {
  interface Window {
    sops_copyPermissionManagementTemplate?: () => Promise<void>;
  }
}

// 后台权限管理 SOP
export async function mount(container: HTMLElement): Promise<void> {
  const html = await loadTemplate(
    'src/modules/sops/views/safety/permission_management/template.html'
  );
  // ✅ 安全: 静态HTML模板，无用户输入
  setSafeHtml(container, html);
  container.classList.add('fade-in');
  restoreReviewOwner();

  registeredActions = registerActionsWithLegacy({
    sops_copyPermissionManagementTemplate: copyPermissionManagementTemplate as (
      ...args: unknown[]
    ) => void,
  });
}

export function unmount(): void {
  if (registeredActions.length > 0) {
    unregisterActions(registeredActions);
    registeredActions = [];
  }
}
