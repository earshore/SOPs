/**
 * Responses API tool loop: response → function_call(s) → execute → function_call_output → next.
 * Stateless HTTP style using previous_response_id when available.
 */

import {
  buildToolFollowUpInputItems,
  extractResponsesFunctionCalls,
  type ResponsesFunctionCall,
} from './responsesTools';
import {
  extractAssistantTextFromResponsesOrChat,
  extractResponsesId,
} from './responsesParse';

export type ResponsesToolExecutor = (call: {
  name: string;
  arguments: string;
  callId: string;
}) => Promise<string> | string;

export interface ResponsesToolLoopRoundInput {
  /** Full Responses JSON body from last request */
  responseData: Record<string, unknown>;
  executeTool: ResponsesToolExecutor;
  /**
   * When true, nextInputItems are function_call_output only (server keeps function_call via previous_id).
   * When false/omit, nextInputItems replay function_call + function_call_output (stateless).
   */
  useStatefulFollowUp?: boolean;
}

export interface ResponsesToolLoopRoundResult {
  /** Empty when no more tool calls — use text as final */
  done: boolean;
  text: string;
  responseId?: string;
  functionCalls: ResponsesFunctionCall[];
  /** Input items for next request when !done */
  nextInputItems: Array<Record<string, unknown>>;
}

/**
 * One round of tool handling. If no function_call items, done=true with output text.
 */
export async function processResponsesToolRound(
  input: ResponsesToolLoopRoundInput
): Promise<ResponsesToolLoopRoundResult> {
  const responseId = extractResponsesId(input.responseData);
  const functionCalls = extractResponsesFunctionCalls(input.responseData);
  const text = extractAssistantTextFromResponsesOrChat(input.responseData);

  if (functionCalls.length === 0) {
    return {
      done: true,
      text,
      responseId,
      functionCalls: [],
      nextInputItems: [],
    };
  }

  const results: Array<{ callId: string; output: string }> = [];
  for (const call of functionCalls) {
    try {
      const output = await input.executeTool({
        name: call.name,
        arguments: call.arguments,
        callId: call.callId,
      });
      results.push({ callId: call.callId, output: String(output ?? '') });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        callId: call.callId,
        output: JSON.stringify({ error: message }),
      });
    }
  }

  const mode = input.useStatefulFollowUp === true ? 'stateful' : 'stateless';
  return {
    done: false,
    text,
    responseId,
    functionCalls,
    nextInputItems: buildToolFollowUpInputItems({
      functionCalls,
      results,
      mode,
    }),
  };
}

export const DEFAULT_MAX_TOOL_ROUNDS = 5;
