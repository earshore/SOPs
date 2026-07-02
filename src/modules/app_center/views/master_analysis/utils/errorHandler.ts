// src/modules/app_center/views/master_analysis/utils/errorHandler.ts
// ================================================================
// 🎯 P1优化: Master Analysis 模块专属错误处理器
// ================================================================

import { ErrorService, type ErrorContext } from '../../../../../services/errorService';
import '../master_analysis_style.css';

/**
 * Master Analysis 模块错误处理器
 */
export const handleMasterAnalysisError = ErrorService.createHandler('MasterAnalysis');

/**
 * Scraper 子模块错误处理器
 */
export const handleScraperError = (error: Error, context: ErrorContext = {}): void => {
  handleMasterAnalysisError(error, { ...context, module: 'master_analysis_scraper' });
};

/**
 * Analysis 子模块错误处理器
 */
export const handleAnalysisError = (error: Error, context: ErrorContext = {}): void => {
  handleMasterAnalysisError(error, { ...context, module: 'master_analysis_analysis' });
};

/**
 * Data 子模块错误处理器
 */
export const handleDataError = (error: Error, context: ErrorContext = {}): void => {
  handleMasterAnalysisError(error, { ...context, module: 'master_analysis_data' });
};

/**
 * PromptLab 子模块错误处理器
 */
export const handlePromptLabError = (error: Error, context: ErrorContext = {}): void => {
  handleMasterAnalysisError(error, { ...context, module: 'master_analysis_promptlab' });
};

export default {
  handleMasterAnalysisError,
  handleScraperError,
  handleAnalysisError,
  handleDataError,
  handlePromptLabError,
};
