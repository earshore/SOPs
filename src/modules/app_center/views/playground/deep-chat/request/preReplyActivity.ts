/**
 * Pre-reply activity timeline (reasoning + tools) shown under 「已完成」
 * with the same progressive-disclosure pattern as 深度思考.
 */

export type PreReplyActivityKind = 'reasoning' | 'tool' | 'status';
export type PreReplyActivityStatus = 'running' | 'done' | 'error';

export interface PreReplyActivityStep {
  id: string;
  kind: PreReplyActivityKind;
  /** UI label, e.g. 深度思考 / 搜索 X */
  label: string;
  /** Expandable body (reasoning text, args, tool result summary) */
  detail?: string;
  status: PreReplyActivityStatus;
  /** Stable order in the timeline */
  order: number;
}

const TOOL_LABELS: Record<string, string> = {
  search_x: '搜索 X',
  web_search: '网页搜索',
  get_session_summary: '会话摘要',
  get_active_model: '当前模型',
  list_recent_user_questions: '最近提问',
};

export function formatToolActivityLabel(toolName: string): string {
  const key = toolName.trim();
  if (TOOL_LABELS[key]) return TOOL_LABELS[key];
  if (!key) return '工具调用';
  return `调用 ${key}`;
}

function clipDetail(text: string, max = 2400): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n…`;
}

export function formatToolArgsDetail(argsJson: string): string {
  const raw = (argsJson || '').trim() || '{}';
  try {
    const parsed = JSON.parse(raw) as unknown;
    return clipDetail(JSON.stringify(parsed, null, 2));
  } catch {
    return clipDetail(raw);
  }
}

function formatParsedToolResult(parsed: Record<string, unknown>): string {
  if (typeof parsed.resultsText === 'string' && parsed.resultsText.trim()) {
    return clipDetail(parsed.resultsText);
  }
  if (typeof parsed.error === 'string') {
    const msg = typeof parsed.message === 'string' ? parsed.message : '';
    return clipDetail(`错误：${parsed.error}${msg ? ` — ${msg}` : ''}`);
  }
  return clipDetail(JSON.stringify(parsed, null, 2));
}

export function formatToolResultDetail(output: string): string {
  const raw = (output || '').trim();
  if (!raw) return '（无返回）';
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return formatParsedToolResult(parsed as Record<string, unknown>);
    }
  } catch {
    // plain text
  }
  return clipDetail(raw);
}

export function upsertPreReplyActivityStep(
  steps: PreReplyActivityStep[],
  next: PreReplyActivityStep
): PreReplyActivityStep[] {
  const list = [...steps];
  const index = list.findIndex(s => s.id === next.id);
  if (index >= 0) {
    const prev = list[index];
    if (prev) {
      list[index] = { ...prev, ...next, order: prev.order };
    }
    return list;
  }
  return [...list, { ...next, order: next.order ?? list.length }];
}

/**
 * Build final timeline for chrome: reasoning first (if any), then tool/status steps.
 */
export function buildPreReplyActivityTimeline(args: {
  reasoningText?: string;
  steps?: PreReplyActivityStep[] | null;
}): PreReplyActivityStep[] {
  const out: PreReplyActivityStep[] = [];
  const reasoning = args.reasoningText?.trim() ?? '';
  if (reasoning) {
    out.push({
      id: 'reasoning',
      kind: 'reasoning',
      label: '深度思考',
      detail: reasoning,
      status: 'done',
      order: 0,
    });
  }
  const rest = [...(args.steps ?? [])]
    .filter(s => s.kind !== 'reasoning')
    .sort((a, b) => a.order - b.order);
  for (const step of rest) {
    out.push({
      ...step,
      detail: step.detail ? clipDetail(step.detail) : step.detail,
      order: out.length,
    });
  }
  return out;
}

function parsePreReplyActivityKind(value: unknown): PreReplyActivityStep['kind'] | null {
  return value === 'reasoning' || value === 'tool' || value === 'status' ? value : null;
}

function parsePreReplyActivityStatus(value: unknown): PreReplyActivityStatus {
  return value === 'running' || value === 'error' || value === 'done' ? value : 'done';
}

function readTrimmedString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function readStepOrder(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readStepDetail(value: unknown, maxDetailChars: number): string | undefined {
  const detail = readTrimmedString(value);
  return detail ? clipDetail(detail, maxDetailChars) : undefined;
}

function parseOnePreReplyActivityStep(
  raw: unknown,
  index: number,
  maxDetailChars: number
): PreReplyActivityStep | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const kind = parsePreReplyActivityKind(row.kind);
  const label = readTrimmedString(row.label);
  // Require a known kind or explicit label so junk objects are dropped.
  if (!kind && !label) return null;
  const detail = readStepDetail(row.detail, maxDetailChars);
  return {
    id: readTrimmedString(row.id) || `step_${index}`,
    kind: kind ?? 'status',
    label: label || formatToolActivityLabel(''),
    status: parsePreReplyActivityStatus(row.status),
    order: readStepOrder(row.order, index),
    ...(detail ? { detail } : {}),
  };
}

export function normalizePreReplyActivitySteps(
  value: unknown,
  maxDetailChars = 2400
): PreReplyActivityStep[] | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const steps: PreReplyActivityStep[] = [];
  for (let i = 0; i < value.length; i++) {
    const step = parseOnePreReplyActivityStep(value[i], i, maxDetailChars);
    if (step) steps.push(step);
  }
  return steps.length ? steps : undefined;
}
