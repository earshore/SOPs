// src/modules/app_center/master_prompt/utils/errorHandler.ts
// ================================================================
// 🎯 P1优化: Master Prompt 模块专属错误处理器
// ================================================================

import { ErrorService } from '../../../../../services/errorService';
import '../master_prompt_style.css';

/**
 * Master Prompt 模块错误处理器
 */
export const handleMasterPromptError = ErrorService.createHandler('MasterPrompt');

/**
 * Scraper 子模块错误处理器
 */
export const handleScraperError = (error: Error, context: Record<string, any> = {}): void => {
    handleMasterPromptError(error, { ...context, subModule: 'Scraper' });
};

/**
 * Analysis 子模块错误处理器
 */
export const handleAnalysisError = (error: Error, context: Record<string, any> = {}): void => {
    handleMasterPromptError(error, { ...context, subModule: 'Analysis' });
};

/**
 * Data 子模块错误处理器
 */
export const handleDataError = (error: Error, context: Record<string, any> = {}): void => {
    handleMasterPromptError(error, { ...context, subModule: 'Data' });
};

/**
 * PromptLab 子模块错误处理器
 */
export const handlePromptLabError = (error: Error, context: Record<string, any> = {}): void => {
    handleMasterPromptError(error, { ...context, subModule: 'PromptLab' });
};

export default {
    handleMasterPromptError,
    handleScraperError,
    handleAnalysisError,
    handleDataError,
    handlePromptLabError
};
