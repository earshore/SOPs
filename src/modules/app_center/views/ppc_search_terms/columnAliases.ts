import { ENTITY_COLUMN_ALIASES } from './entityColumnAliases';
import { METRIC_COLUMN_ALIASES } from './metricColumnAliases';
import type { MappedColumnKey } from './columnTypes';

export const COLUMN_ALIASES: Record<MappedColumnKey, string[]> = {
  ...ENTITY_COLUMN_ALIASES,
  ...METRIC_COLUMN_ALIASES,
};
