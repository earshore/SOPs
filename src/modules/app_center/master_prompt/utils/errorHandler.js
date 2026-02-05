// src/modules/app_center/master_prompt/utils/errorHandler.js
// ================================================================
// 🎯 P1优化: Master Prompt 模块专属错误处理器
// ================================================================

import { ErrorService } from '../../../../services/errorService.js';

/**
 * Master Prompt 模块错误处理器
 */
export const handleMasterPromptError = ErrorService.createHandler('MasterPrompt');

/**
 * Scraper 子模块错误处理器
 */
export const handleScraperError = (error, context = {}) => {
    handleMasterPromptError(error, { ...context, subModule: 'Scraper' });
};

/**
 * Analysis 子模块错误处理器
 */
export const handleAnalysisError = (error, context = {}) => {
    handleMasterPromptError(error, { ...context, subModule: 'Analysis' });
};

/**
 * Data 子模块错误处理器
 */
export const handleDataError = (error, context = {}) => {
    handleMasterPromptError(error, { ...context, subModule: 'Data' });
};

/**
 * PromptLab 子模块错误处理器
 */
export const handlePromptLabError = (error, context = {}) => {
    handleMasterPromptError(error, { ...context, subModule: 'PromptLab' });
};

export default {
    handleMasterPromptError,
    handleScraperError,
    handleAnalysisError,
    handleDataError,
    handlePromptLabError
};
