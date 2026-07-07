/**
 * SOPs 模块专属错误处理器
 * P1优化: 提供统一的错误处理接口
 */

import { ErrorService } from '@/services/errorService';

/**
 * SOPs 模块错误处理器
 */
export const handleSopsError = ErrorService.createHandler('SOPs');

export default handleSopsError;
