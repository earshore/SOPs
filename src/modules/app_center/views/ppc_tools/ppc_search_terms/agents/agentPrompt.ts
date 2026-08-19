import { compactContext, toPromptRow } from './agentPromptInput';
import { buildPpcSearchTermsAgentRules, PPC_SEARCH_TERMS_AGENT_PRESET } from './agentPromptPreset';
import { type PpcSearchTermsAnalysisContext } from './agentTypes';

import type { AnalyzedRow, Thresholds } from '../types';
import type { ChatMessage } from '@/services/llmService';

export function buildPpcSearchTermsAgentMessages(
  rows: AnalyzedRow[],
  thresholds: Thresholds,
  context?: PpcSearchTermsAnalysisContext
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
  context?: PpcSearchTermsAnalysisContext
): string {
  return JSON.stringify(
    {
      task: 'Analyze Amazon PPC search term rows and choose one action for every row.',
      agentPreset: PPC_SEARCH_TERMS_AGENT_PRESET,
      rules: buildPpcSearchTermsAgentRules(thresholds),
      optionalContext: compactContext(context),
      rows: rows.map(toPromptRow),
    },
    null,
    2
  );
}
