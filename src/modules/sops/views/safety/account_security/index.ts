import { createSopTemplateModule } from '../../../utils/sopTemplateModule';
import { createOwnerField } from '../../../utils/ownerField';
import { createTemplateCopyAction } from '../../../utils/templateCopyAction';

const ACCOUNT_SECURITY_OWNER_STORAGE_KEY = 'account_security_owner_v1';
const DEFAULT_REVIEW_OWNER = '账号安全负责人';

const reviewOwnerField = createOwnerField({
  storageKey: ACCOUNT_SECURITY_OWNER_STORAGE_KEY,
  defaultOwner: DEFAULT_REVIEW_OWNER,
  inputId: 'account-security-owner',
});

export function buildAccountSecurityTemplate(owner = DEFAULT_REVIEW_OWNER): string {
  const today = new Date().toISOString().split('T')[0];
  const reviewOwner = reviewOwnerField.normalize(owner);

  return [
    `# 账号登录异常登记复盘 - ${today}`,
    '',
    '## 作业范围',
    `- 作业负责人：${reviewOwner}`,
    '- 店铺/站点：',
    '- 登录人：',
    '- 登录设备/浏览器环境：',
    '- IP/代理/VPS：',
    '- 操作原因：日常登录 / 新设备 / 新 IP / 跨店排查 / 异常响应',
    '',
    '## 登录前证据',
    '- 浏览器环境编号：',
    '- IP 所属地区与站点是否匹配：是 / 否 / 待确认',
    '- 是否使用公司批准设备：是 / 否',
    '- OTP/密码管理状态：',
    '- 是否存在同设备或同 IP 关联风险：',
    '',
    '## 判断结论',
    '- 登录结论：允许 / 暂停 / 禁止',
    '- 风险等级：P0 立即冻结 / P1 高风险 / P2 需复核 / P3 正常',
    '- 核心依据：',
    '- 是否需要主管/IT 同步：',
    '',
    '## 整改动作（人工确认后执行）',
    '- 冻结或暂停登录：',
    '- 更换密码/OTP：',
    '- 更换或隔离 IP/VPS/浏览器环境：',
    '- 检查同环境其他店铺：',
    '- 补充留档截图或证据路径：',
    '',
    '## 人工确认点',
    '- 新设备、新 IP 或跨店操作：已确认 / 待确认',
    '- 异常登录是否冻结账号访问：已确认 / 待确认',
    '- 凭证、OTP、浏览器环境变更：已确认 / 待确认',
    '- 同环境店铺排查结论：已确认 / 待确认',
    `- 最终确认人：${reviewOwner}`,
    '',
    '## 复盘记录',
    '- 本次根因：',
    '- 最终处理结果：',
    '- 已同步对象：主管 / IT / 运营 / 客服',
    '- 下次复核日期：',
    '- 需要更新的培训或规则：',
    '',
    '> 账号登录、凭证变更、IP/VPS/浏览器环境调整和异常账号处置均属于高风险动作，必须由负责人或主管人工确认后执行。',
  ].join('\n');
}

const copyAccountSecurityTemplate = createTemplateCopyAction({
  ownerField: reviewOwnerField,
  buildTemplate: buildAccountSecurityTemplate,
  successMessage: '已复制账号登录异常登记模板，可粘贴到工作群或归档文档。',
  failureMessage: '复制失败，请手动复制账号安全模板或稍后重试。',
});

declare global {
  interface Window {
    sops_copyAccountSecurityTemplate?: () => Promise<void>;
  }
}

// 账号登录与环境安全 SOP
const accountSecurityModule = createSopTemplateModule({
  moduleId: 'account_security',
  templatePath: 'src/modules/sops/views/safety/account_security/template.html',
  ownerFields: [reviewOwnerField],
  actions: {
    sops_copyAccountSecurityTemplate: copyAccountSecurityTemplate,
  },
});

export const mount = (container: HTMLElement): Promise<void> =>
  accountSecurityModule.mount(container);
export const unmount = (): void => {
  accountSecurityModule.unmount();
};
