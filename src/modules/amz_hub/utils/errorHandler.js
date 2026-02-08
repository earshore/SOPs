// src/modules/amz_hub/utils/errorHandler.js
// ================================================================
// 🎯 P1优化: Amazon Hub 模块专属错误处理器
// ================================================================

import { ErrorService } from '../../../services/errorService';

/**
 * Amazon Hub 模块错误处理器
 */
export const handleHubError = ErrorService.createHandler('AmazonHub');

export default handleHubError;
