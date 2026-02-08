// src/modules/app_center/master_prompt/utils/errorHandler.ts
// ================================================================
// 🎯 P1优化: Master Prompt 模块专属错误处理器
// ================================================================

import { ErrorService, type ErrorContext } from '../../../../../services/errorService';
import '../master_prompt_style.css';

/**
 * Master Prompt 模块错误处理器
 */
export const handleMasterPromptError = ErrorService.createHandler('MasterPrompt');

/**
 * Scraper 子模块错误处理器
 */
export const handleScraperError = (error: Error, context: ErrorContext = {}): void => {
    handleMasterPromptError(error, { ...context, module: 'master_prompt_scraper' });
};

/**
 * Analysis 子模块错误处理器
 */
export const handleAnalysisError = (error: Error, context: ErrorContext = {}): void => {
    handleMasterPromptError(error, { ...context, module: 'master_prompt_analysis' });
};

/**
 * Data 子模块错误处理器
 */
export const handleDataError = (error: Error, context: ErrorContext = {}): void => {
    handleMasterPromptError(error, { ...context, module: 'master_prompt_data' });
};

/**
 * PromptLab 子模块错误处理器
 */
export const handlePromptLabError = (error: Error, context: ErrorContext = {}): void => {
    handleMasterPromptError(error, { ...context, module: 'master_prompt_promptlab' });
};

export default {
    handleMasterPromptError,
    handleScraperError,
    handleAnalysisError,
    handleDataError,
    handlePromptLabError
};
