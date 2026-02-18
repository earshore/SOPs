// src/modules/sops/utils/errorHandler.js
// ================================================================
// 🎯 P1优化: SOPs 模块专属错误处理器
// ================================================================

import { ErrorService } from '../../../services/errorService';

/**
 * SOPs 模块错误处理器
 */
export const handleSopsError = ErrorService.createHandler('SOPs');

export default handleSopsError;
