// src/services/llmServiceWithTimeout.ts
// ================================================================
// 🎯 P0优化: 带超时自动重试的LLM服务包装器
// 使用WorkingStateManager实现自动超时重试
// ================================================================

import { callLLM, type ChatMessage, type LLMOptions, type LLMConfig } from './llmService';
import { workingStateManager } from '../common/utils/WorkingStateManager';
import { showToast } from '../common/ui/notifications';
import { createRandomId } from '../common/utils/random';

const nativeLoggerConsole = globalThis.console;

/**
 * 带超时重试的LLM调用选项
 */
export interface LLMWithTimeoutOptions extends LLMOptions {
  /** 任务ID（用于追踪），不传则自动生成 */
  taskId?: string;
  /** 最大重试次数，默认3次 */
  maxRetries?: number;
  /** 任务描述（用于日志） */
  description?: string;
  /** 是否显示用户提示，默认true */
  showUserNotification?: boolean;
}

export interface LLMWithTimeoutRequest extends LLMConfig {
  messages: ChatMessage[];
}

function callLLMFromRequest(request: LLMWithTimeoutRequest, options: LLMOptions): Promise<string> {
  return callLLM(
    request.messages,
    request.provider,
    request.endpoint,
    request.apiKey,
    request.model,
    options
  );
}

/**
 * 带超时自动重试的LLM调用
 *
 * @param request - LLM请求配置
 * @param options - 配置选项
 * @returns LLM响应
 *
 * @example
 * ```typescript
 * const response = await callLLMWithTimeout(
 *   {
 *     messages,
 *     provider: 'openai',
 *     endpoint: 'https://api.openai.com/v1',
 *     apiKey: 'sk-xxx',
 *     model: 'gpt-4'
 *   },
 *   {
 *     timeout: 30000,
 *     maxRetries: 3,
 *     description: '生成产品描述'
 *   }
 * );
 * ```
 */
export async function callLLMWithTimeout(
  request: LLMWithTimeoutRequest,
  options: LLMWithTimeoutOptions = {}
): Promise<string> {
  const {
    taskId = createRandomId('llm'),
    timeout = 30000,
    maxRetries = 3,
    description = 'LLM调用',
    showUserNotification = true,
    ...llmOptions
  } = options;

  return new Promise((resolve, reject) => {
    // 设置工作状态
    workingStateManager.setWorking(taskId, {
      timeout,
      maxRetries,
      onTimeout: async () => {
        // 超时后的重试逻辑
        nativeLoggerConsole.warn(
          `LLM调用超时，正在重试: ${description}`,
          {
            taskId,
          },
          'LLMService'
        );

        if (showUserNotification) {
          showToast('请求超时，正在自动重试...', { type: 'warning' });
        }

        const result = await callLLMFromRequest(request, { ...llmOptions, timeout });

        // 成功后标记任务成功
        workingStateManager.setSuccess(taskId);
        resolve(result);
      },
      onSuccess: () => {
        if (showUserNotification) {
          showToast('请求成功', { type: 'success' });
        }
      },
      onFinalFailure: error => {
        console.error(`LLM调用最终失败: ${description}`, error, 'LLMService');
        if (showUserNotification) {
          showToast(`请求失败: ${error.message}`, { type: 'error' });
        }
        reject(error);
      },
    });

    // 执行初始调用
    callLLMFromRequest(request, { ...llmOptions, timeout })
      .then(result => {
        // 成功后标记任务成功
        workingStateManager.setSuccess(taskId);
        resolve(result);
      })
      .catch(error => {
        // 失败后标记任务失败（会触发重试）
        console.error(`LLM调用失败: ${description}`, error, 'LLMService');
        // 不立即reject，让WorkingStateManager处理重试
      });
  });
}

/**
 * 带超时重试的LLM配置调用
 *
 * @param messages - 消息列表
 * @param config - LLM配置
 * @param options - 配置选项
 * @returns LLM响应
 */
export async function callLLMWithConfigAndTimeout(
  messages: ChatMessage[],
  config: LLMConfig,
  options: LLMWithTimeoutOptions = {}
): Promise<string> {
  return callLLMWithTimeout({ ...config, messages }, options);
}

/**
 * 取消LLM调用
 *
 * @param taskId - 任务ID
 */
export function cancelLLMCall(taskId: string): void {
  workingStateManager.clearWorking(taskId);
}

/**
 * 获取LLM调用状态
 *
 * @param taskId - 任务ID
 * @returns 状态信息或null
 */
export function getLLMCallStatus(taskId: string) {
  return workingStateManager.getWorkingState(taskId);
}
