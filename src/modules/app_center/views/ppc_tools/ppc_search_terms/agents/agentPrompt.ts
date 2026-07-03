import type { ChatMessage } from '@/services/llmService';
import type { AnalyzedRow, Thresholds } from '../types';
import { type PpcAnalysisContext } from './agentTypes';
import { compactContext, toPromptRow } from './agentPromptInput';
import { buildPpcAgentRules, PPC_AGENT_PRESET } from './agentPromptPreset';

export function buildPpcAgentMessages(
  rows: AnalyzedRow[],
  thresholds: Thresholds,
  context?: PpcAnalysisContext
): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        '你是资深 Amazon PPC 搜索词分析师。',
        '请基于输入的结构化报表数据输出广告动作建议。',
        '不要输出完整思维链或逐步推理，只返回可审计的简短理由和关键证据。',
        '必须严格返回 JSON 对象，格式为 {"decisions":[{"id":"...","action":"...","priority":90,"reason":"..."}]}。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: buildPrompt(rows, thresholds, context),
    },
  ];
}

function buildPrompt(
  rows: AnalyzedRow[],
  thresholds: Thresholds,
  context?: PpcAnalysisContext
): string {
  return JSON.stringify(
    {
      task: 'Analyze Amazon PPC search term rows and choose one action for every row.',
      agentPreset: PPC_AGENT_PRESET,
      rules: buildPpcAgentRules(thresholds),
      optionalContext: compactContext(context),
      rows: rows.map(toPromptRow),
    },
    null,
    2
  );
}
