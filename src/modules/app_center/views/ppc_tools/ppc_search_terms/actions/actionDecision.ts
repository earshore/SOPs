import { ACTION_LABELS } from './actionMetadata';

import type { ActionType } from '../types';

export interface ActionDecision {
  type: ActionType;
  label: string;
  reason: string;
  priority: number;
}

export function makeActionDecision(
  type: ActionType,
  reason: string,
  priority: number
): ActionDecision {
  return {
    type,
    reason,
    priority,
    label: ACTION_LABELS[type],
  };
}
