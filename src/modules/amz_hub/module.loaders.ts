import { buildModuleMapFromLoaderPaths } from '@/common/config/moduleManifest';

import { amzHubManifest } from './module.manifest';

import type { ModuleLoaderFn } from '@/types/modules-business';

const loaders = import.meta.glob('./views/**/index.ts') as Record<string, ModuleLoaderFn>;

export const MODULE_MAP = buildModuleMapFromLoaderPaths(amzHubManifest, loaders);
