import { buildModuleMapFromLoaderPaths } from '@/common/config/moduleManifest';
import type { ModuleLoaderFn } from '@/types/modules-business';
import { amzHubManifest } from './module.manifest';

const loaders = import.meta.glob('./views/**/index.ts') as Record<string, ModuleLoaderFn>;

export const MODULE_MAP = buildModuleMapFromLoaderPaths(amzHubManifest, loaders);
