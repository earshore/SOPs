/**
 * reasoningOnlyRecovery 工具测试
 *
 * 覆盖：isReasoningOnlyFailure 判定、buildRecoveryPrompt 拼接、
 * callWithReasoningOnlyRecovery 的"空正文失败重试一次"行为。
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ApiError, ValidationError } from '@/common/errors/AppError';
import {
  buildRecoveryPrompt,
  callWithReasoningOnlyRecovery,
  isReasoningOnlyFailure,
} from '../reasoningOnlyRecovery';

const callLLM = vi.fn();

// 模拟三个调用点（reviewEvidencePipeline / sellingPointsPipeline / parallelAnalysisService）的接入形态：
// 恢复时追加恢复 prompt + 关闭推理，其余参数保持不变。
function buildCallAnalysis(prompt: string): Promise<string> {
  return callWithReasoningOnlyRecovery((recovery) => {
    const messages = [
      { role: 'system', content: '系统提示' },
      { role: 'user', content: recovery ? buildRecoveryPrompt(prompt) : prompt },
    ];
    const options = {
      temperature: 0.3,
      ...(recovery && { reasoningPrefs: { enabled: false, effort: 'medium' } }),
    };
    return callLLM(messages, options);
  });
}

describe('isReasoningOnlyFailure', () => {
  it('识别空正文类失败：API_EMPTY_RESPONSE / PARSE_LLM_001 / "Empty LLM response"', () => {
    expect(
      isReasoningOnlyFailure(new ApiError('模型返回了空正文', 'API_EMPTY_RESPONSE', 200, null))
    ).toBe(true);
    expect(
      isReasoningOnlyFailure(
        new ValidationError('Empty LLM response', 'PARSE_LLM_001', 'response', '')
      )
    ).toBe(true);
    expect(isReasoningOnlyFailure(new Error('Empty LLM response from gateway'))).toBe(true);
  });

  it('不识别非 reasoning-only 类失败（非白名单错误码）', () => {
    expect(
      isReasoningOnlyFailure(
        new ValidationError('schema 校验失败', 'PARSE_LLM_003', 'response', 'x')
      )
    ).toBe(false);
    expect(isReasoningOnlyFailure(new Error('network down'))).toBe(false);
    expect(isReasoningOnlyFailure(null)).toBe(false);
    expect(isReasoningOnlyFailure('boom')).toBe(false);
  });
});

describe('buildRecoveryPrompt', () => {
  it('在原始 prompt 前追加恢复指令', () => {
    const original = '请分析以下评论';
    const prompt = buildRecoveryPrompt(original);
    expect(prompt).toContain('只输出 JSON');
    expect(prompt).toContain('不要输出 reasoning');
    expect(prompt.endsWith(original)).toBe(true);
  });
});

describe('callWithReasoningOnlyRecovery', () => {
  beforeEach(() => {
    callLLM.mockReset();
  });

  it('第一次调用成功时直接返回结果，不重试', async () => {
    callLLM.mockResolvedValueOnce('{"ok":true}');

    await expect(buildCallAnalysis('prompt')).resolves.toBe('{"ok":true}');
    expect(callLLM).toHaveBeenCalledTimes(1);
  });

  it('API_EMPTY_RESPONSE 失败时重试一次：第二次带恢复 prompt 且关闭推理', async () => {
    const emptyError = new ApiError('模型返回了空正文', 'API_EMPTY_RESPONSE', 200, null);
    callLLM.mockRejectedValueOnce(emptyError).mockResolvedValueOnce('{"ok":true}');

    const result = await buildCallAnalysis('原始 prompt');

    expect(result).toBe('{"ok":true}');
    expect(callLLM).toHaveBeenCalledTimes(2);

    const [firstMessages, firstOptions] = callLLM.mock.calls[0] ?? [];
    const [secondMessages, secondOptions] = callLLM.mock.calls[1] ?? [];
    // 第一次：普通 prompt、推理保持原有设置
    expect((firstMessages[1] as { content: string }).content).toBe('原始 prompt');
    expect((firstOptions as { reasoningPrefs?: unknown }).reasoningPrefs).toBeUndefined();
    // 第二次（恢复）：追加恢复指令 + reasoningPrefs.enabled=false
    const secondContent = (secondMessages[1] as { content: string }).content;
    expect(secondContent).toContain('不要输出 reasoning');
    expect(secondContent).toContain('原始 prompt');
    expect(
      (secondOptions as { reasoningPrefs: { enabled: boolean } }).reasoningPrefs.enabled
    ).toBe(false);
  });

  it('PARSE_LLM_001 失败时同样重试一次', async () => {
    const emptyError = new ValidationError('Empty LLM response', 'PARSE_LLM_001', 'response', '');
    callLLM.mockRejectedValueOnce(emptyError).mockResolvedValueOnce('{"ok":true}');

    await expect(buildCallAnalysis('prompt')).resolves.toBe('{"ok":true}');
    expect(callLLM).toHaveBeenCalledTimes(2);
  });

  it('PARSE_LLM_002 失败时同样重试一次（正文为推理文本场景）', async () => {
    const parseError = new ValidationError(
      'Unable to parse valid JSON from LLM response',
      'PARSE_LLM_002',
      'response',
      'Let me analyze this task carefully...'
    );
    callLLM.mockRejectedValueOnce(parseError).mockResolvedValueOnce('{"ok":true}');

    const result = await buildCallAnalysis('prompt');
    expect(result).toBe('{"ok":true}');
    expect(callLLM).toHaveBeenCalledTimes(2);
    const [secondMessages] = callLLM.mock.calls[1] ?? [];
    expect((secondMessages[1] as { content: string }).content).toContain('不要输出 reasoning');
  });

  it('非 reasoning-only 错误不重试，原样抛出', async () => {
    const parseError = new ApiError('gateway timeout', 'API_TIMEOUT', 504, null);
    callLLM.mockRejectedValueOnce(parseError);

    await expect(buildCallAnalysis('prompt')).rejects.toBe(parseError);
    expect(callLLM).toHaveBeenCalledTimes(1);
  });

  it('重试仍失败时抛出最终错误', async () => {
    const emptyError = new ApiError('模型返回了空正文', 'API_EMPTY_RESPONSE', 200, null);
    callLLM.mockRejectedValueOnce(emptyError).mockRejectedValueOnce(emptyError);

    await expect(buildCallAnalysis('prompt')).rejects.toBe(emptyError);
    // 只重试一次：共两次调用
    expect(callLLM).toHaveBeenCalledTimes(2);
  });
});

describe('管线形态：解析放入恢复闭包（callAnalysisJson 接入形态）', () => {
  // 模拟 parseLlmJson 的失败形态：非 JSON 正文抛 PARSE_LLM_002（不依赖 jsonrepair 的修复结果）
  function parseJsonOrThrow(text: string): unknown {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ValidationError(
        'Unable to parse valid JSON from LLM response',
        'PARSE_LLM_002',
        'response',
        text,
        { module: 'parseLlmJson', action: 'parseLlmJson' }
      );
    }
  }

  // 模拟三处管线：闭包内先 callLLM 再解析；解析抛 PARSE_LLM_002 时由恢复包装器重试一次
  function buildCallAnalysisWithParse(prompt: string): Promise<unknown> {
    return callWithReasoningOnlyRecovery((recovery) => {
      const messages = [
        { role: 'system', content: '系统提示' },
        { role: 'user', content: recovery ? buildRecoveryPrompt(prompt) : prompt },
      ];
      const options = {
        temperature: 0.3,
        ...(recovery && { reasoningPrefs: { enabled: false, effort: 'medium' } }),
      };
      return callLLM(messages, options).then((text: string) => parseJsonOrThrow(text));
    });
  }

  beforeEach(() => {
    callLLM.mockReset();
  });

  it('首次返回推理文本（解析失败 PARSE_LLM_002）→ 恢复重试 → 第二次返回 JSON 解析成功', async () => {
    callLLM
      .mockResolvedValueOnce('Let me think through this listing carefully...')
      .mockResolvedValueOnce('{"ok":true}');

    const result = await buildCallAnalysisWithParse('原始 prompt');

    expect(result).toEqual({ ok: true });
    expect(callLLM).toHaveBeenCalledTimes(2);
    const [firstMessages, firstOptions] = callLLM.mock.calls[0] ?? [];
    const [secondMessages, secondOptions] = callLLM.mock.calls[1] ?? [];
    // 第一次：普通 prompt、推理保持原有设置
    expect((firstMessages[1] as { content: string }).content).toBe('原始 prompt');
    expect((firstOptions as { reasoningPrefs?: unknown }).reasoningPrefs).toBeUndefined();
    // 第二次（恢复）：追加恢复指令 + reasoningPrefs.enabled=false
    const secondContent = (secondMessages[1] as { content: string }).content;
    expect(secondContent).toContain('不要输出 reasoning');
    expect(secondContent).toContain('原始 prompt');
    expect(
      (secondOptions as { reasoningPrefs: { enabled: boolean } }).reasoningPrefs.enabled
    ).toBe(false);
  });

  it('解析持续失败（重试仍是推理文本）时只重试一次并抛出 PARSE_LLM_002', async () => {
    callLLM.mockResolvedValue('仍是一段 reasoning 文本，不是 JSON');

    await expect(buildCallAnalysisWithParse('原始 prompt')).rejects.toMatchObject({
      code: 'PARSE_LLM_002',
    });
    // 只重试一次：共两次调用
    expect(callLLM).toHaveBeenCalledTimes(2);
  });
});