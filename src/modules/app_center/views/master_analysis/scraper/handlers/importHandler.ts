/**
 * 数据导入处理器
 */

import { LANGUAGE_HEADERS } from '@/common/constants/constants';
import { APP_EVENTS, MODULE_EVENTS } from '@/common/constants/eventConstants';
import { ValidationError, BusinessError, SystemError } from '@/common/errors/AppError';
import eventBus from '@/common/EventBus';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { showToast } from '@/common/ui';

import { emitHistoryUpdated } from '../../services/historyEvents';
import { HistoryService } from '../../services/historyService';
import { getFlag } from '../utils/formatters';
import { validateScrapedData } from '../utils/validators';

import type { ScrapedData, ProductData, ImportResult, FileReadResult } from '../types';
import type { ScrapedProduct, CustomerReview, ScraperSite } from '@/types/modules-business';

const nativeLoggerConsole = globalThis.console;

type FileReadResolve = (value: FileReadResult) => void;
type FileReadReject = (reason?: unknown) => void;
type ImportedProductWithSource = ScrapedProduct & { _source_site?: string; _filename?: string };
type ImportedProductPool = Map<string, ImportedProductWithSource[]>;

/**
 * 导入模式：merge 保留未覆盖 ASIN 并整体覆盖已存在 ASIN，new 先存档现有数据再以导入数据替换
 */
export type ImportMode = 'merge' | 'new';

interface ImportCollectionContext {
  productPool: ImportedProductPool;
  detectedSites: Set<string>;
}

interface MarketplaceSelectionElements {
  backdrop: HTMLDivElement;
  dialogPanel: HTMLElement | null;
  btnConfirm: HTMLButtonElement | null;
  btnCancel: HTMLButtonElement | null;
}

type MarketplaceSelectionFinish = (selected: string | null) => void;
type MarketplaceSelectionCleanup = () => void;

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024;
const LARGE_IMPORT_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_IMPORTED_MARKETPLACES = new Set<ScraperSite>([
  'US',
  'DE',
  'FR',
  'IT',
  'ES',
  'NL',
  'SE',
  'PL',
  'BE',
  'IE',
  'UK',
  'CA',
  'JP',
]);

function createEmptyFileError(file: File, content: string): ValidationError {
  return new ValidationError(`文件 ${file.name} 内容为空`, 'SCRAPER_IMP_001', 'content', content, {
    module: 'ScraperImportHandler',
    action: 'readFileAsJSON',
    filename: file.name,
  });
}

function parseJsonContent(file: File, content: string): unknown {
  try {
    return JSON.parse(content);
  } catch (parseError) {
    throw new SystemError(
      `文件 ${file.name} 不是有效的JSON格式: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      'SCRAPER_IMP_002',
      {
        module: 'ScraperImportHandler',
        action: 'readFileAsJSON',
        filename: file.name,
        contentPreview: content.substring(0, 100),
      },
      parseError instanceof Error ? parseError : undefined
    );
  }
}

function createInvalidJsonError(file: File, json: unknown): ValidationError {
  return new ValidationError(`文件 ${file.name} JSON内容无效`, 'SCRAPER_IMP_003', 'json', json, {
    module: 'ScraperImportHandler',
    action: 'readFileAsJSON',
    filename: file.name,
  });
}

function parseFileReadResult(file: File, content: string): FileReadResult {
  if (!content || content.trim().length === 0) {
    throw createEmptyFileError(file, content);
  }

  const json = parseJsonContent(file, content);
  if (json === null || json === undefined) {
    throw createInvalidJsonError(file, json);
  }

  return { data: json, filename: file.name };
}

function isExpectedFileReadError(error: unknown): boolean {
  return error instanceof ValidationError || error instanceof SystemError;
}

function createUnexpectedFileReadError(file: File, error: unknown): SystemError {
  return new SystemError(
    `文件 ${file.name} 解析失败: ${error instanceof Error ? error.message : String(error)}`,
    'SCRAPER_IMP_004',
    { module: 'ScraperImportHandler', action: 'readFileAsJSON', filename: file.name },
    error instanceof Error ? error : undefined
  );
}

function handleFileLoad(
  file: File,
  event: ProgressEvent<FileReader>,
  resolve: FileReadResolve,
  reject: FileReadReject
): void {
  try {
    const content = event.target?.result as string;
    resolve(parseFileReadResult(file, content));
  } catch (error) {
    if (isExpectedFileReadError(error)) {
      reject(error);
      return;
    }

    console.error(`[Scraper] 解析文件 ${file.name} 失败:`, error);
    reject(createUnexpectedFileReadError(file, error));
  }
}
/**
 * 读取文件为JSON
 */
export function readFileAsJSON(file: File): Promise<FileReadResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => {
      handleFileLoad(file, e, resolve, reject);
    };

    reader.onerror = () => {
      console.error(`[Scraper] 读取文件 ${file.name} 失败:`, reader.error);
      reject(
        new SystemError(
          `无法读取文件 ${file.name}: ${reader.error?.message || '未知错误'}`,
          'SCRAPER_IMP_005',
          { module: 'ScraperImportHandler', action: 'readFileAsJSON', filename: file.name },
          reader.error || undefined
        )
      );
    };

    reader.readAsText(file);
  });
}

/**
 * 获取评论签名（用于去重）
 */
export function getReviewSignature(review: CustomerReview): string {
  // 优先使用 review ID
  if ('id' in review && review.id) return String(review.id);

  // 构建签名
  const date = ('review_date' in review ? review.review_date : '') || '';
  const author = review.author || '';
  const headline = review.headline || review.title || '';

  return `${date}_${author}_${headline.substring(0, 20)}`.trim();
}

function cloneImportedProduct(product: ScrapedProduct): ScrapedProduct {
  return JSON.parse(JSON.stringify(product)) as ScrapedProduct;
}

function ensureProductMetadata(product: ScrapedProduct): void {
  if (!product.metadata) {
    product.metadata = {};
  }
}

function getMasterProductVersion(
  versions: ImportedProductWithSource[],
  targetMarketplace: string
): ImportedProductWithSource | undefined {
  return versions.find(version => version._source_site === targetMarketplace);
}

function getBaseProductVersion(
  versions: ImportedProductWithSource[],
  masterVersion: ImportedProductWithSource | undefined,
  existingVersion: ScrapedProduct | undefined
): ScrapedProduct | undefined {
  // 同 ASIN 已存在时保留现有字段（标题/五点），导入版本仅作为评论来源并入；
  // 新 ASIN 或导入新的（无现有版本）时才以导入版本为基准。
  return existingVersion || masterVersion || versions[0];
}

function collectReviewSources(
  versions: ImportedProductWithSource[],
  masterVersion: ImportedProductWithSource | undefined,
  existingVersion: ScrapedProduct | undefined
): Array<ScrapedProduct & { _source_site?: string }> {
  // 同 ASIN 已存在时现有评论优先，导入评论仅追加新签名（去重后保留现有版本）。
  if (masterVersion) {
    return [
      ...(existingVersion ? [existingVersion] : []),
      masterVersion,
      ...versions.filter(version => version !== masterVersion),
    ];
  }

  return [...(existingVersion ? [existingVersion] : []), ...versions];
}

function copyReviewWithOrigin(
  review: CustomerReview,
  sourceSite: string | undefined
): CustomerReview {
  const reviewWithOrigin = { ...review } as CustomerReview & { _origin_site?: string };
  if (sourceSite && sourceSite !== 'Unknown') {
    reviewWithOrigin._origin_site = sourceSite;
  }
  return reviewWithOrigin;
}

function collectUniqueReviews(
  reviewSources: Array<ScrapedProduct & { _source_site?: string }>
): CustomerReview[] {
  const uniqueReviewsMap = new Map<string, CustomerReview>();

  reviewSources.forEach(source => {
    if (!Array.isArray(source.customer_reviews)) return;

    source.customer_reviews.forEach((review: CustomerReview) => {
      const signature = getReviewSignature(review);
      if (!uniqueReviewsMap.has(signature)) {
        uniqueReviewsMap.set(signature, copyReviewWithOrigin(review, source._source_site));
      }
    });
  });

  return Array.from(uniqueReviewsMap.values());
}

function removeImportSourceFields(product: ScrapedProduct): ProductData {
  const cleanProduct = { ...product };
  delete (cleanProduct as ImportedProductWithSource)._source_site;
  delete (cleanProduct as ImportedProductWithSource)._filename;
  return cleanProduct;
}

function mergeProductVersions(
  versions: ImportedProductWithSource[],
  targetMarketplace: string,
  existingVersion: ScrapedProduct | undefined
): ProductData | null {
  const masterVersion = getMasterProductVersion(versions, targetMarketplace);
  const baseProduct = getBaseProductVersion(versions, masterVersion, existingVersion);
  if (!baseProduct) return null;

  const mergedProduct = cloneImportedProduct(baseProduct);
  ensureProductMetadata(mergedProduct);
  mergedProduct.customer_reviews = collectUniqueReviews(
    collectReviewSources(versions, masterVersion, existingVersion)
  );

  return removeImportSourceFields(mergedProduct);
}

/**
 * 合并多站点产品数据
 */
export function mergeProducts(
  productPool: Map<string, Array<ScrapedProduct & { _source_site?: string; _filename?: string }>>,
  targetMarketplace: string,
  currentProductsMap: Map<string, ScrapedProduct>,
  mode: ImportMode = 'merge'
): ProductData[] {
  const finalProducts: ProductData[] = [];

  // 保留当前已有、但本次导入未覆盖的 ASIN（merge 分批导入时拼合，避免覆盖丢失）
  // new 模式：不保留任何现有 ASIN，跳过本循环（现有数据已在导入前存入历史快照）
  if (mode === 'merge') {
    for (const [asin, product] of currentProductsMap.entries()) {
      if (!productPool.has(asin)) {
        finalProducts.push(product);
      }
    }
  }

  for (const [asin, versions] of productPool.entries()) {
    const mergedProduct = mergeProductVersions(
      versions,
      targetMarketplace,
      // new 模式下不传入现有版本，标题/五点/评论全部来自导入文件，不并入旧数据
      mode === 'new' ? undefined : currentProductsMap.get(asin)
    );
    if (mergedProduct) {
      finalProducts.push(mergedProduct);
    }
  }

  return finalProducts;
}

const MARKETPLACE_SITE_NAME_MAP: Record<string, string> = {
  DE: '德国',
  FR: '法国',
  IT: '意大利',
  ES: '西班牙',
  NL: '荷兰',
  SE: '瑞典',
  PL: '波兰',
  BE: '比利时',
  IE: '爱尔兰',
  UK: '英国',
};

function getPreviousActiveElement(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function createMarketplaceSelectionContent(sites: string[], modalId: string): string {
  const titleId = `${modalId}-title`;
  const descriptionId = `${modalId}-description`;

  return `
            <div class="ma-marketplace-modal rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition"
                role="dialog"
                aria-modal="true"
                aria-labelledby="${titleId}"
                aria-describedby="${descriptionId}"
                tabindex="-1">
                <div class="ma-marketplace-modal-header p-5 text-white">
                    <h3 id="${titleId}" class="text-lg font-bold flex items-center gap-2">
                        <i class="fas fa-globe" aria-hidden="true"></i> 检测到多站点数据
                    </h3>
                    <p class="ma-marketplace-modal-subtitle text-xs mt-1">您导入的文件包含多个市场的数据 (${sites.join(', ')})</p>
                </div>
                
                <div class="p-6">
                    <p id="${descriptionId}" class="text-sm mb-4 font-medium" style="color: var(--color-slate-500, #475569)">
                        请选择一个<span class="ma-marketplace-modal-accent font-bold">主站点</span>：
                        <br/><span class="text-xs font-normal" style="color: var(--color-slate-400, #94a3b8)">我们将保留主站点的标题、五点描述、Review，并自动合并其他站点的Review。</span>
                    </p>
                    
                    <div class="space-y-3 mb-6">
                        ${sites
                          .map(
                            (site, index) => `
                            <label class="ma-marketplace-option flex items-center p-3 rounded-xl cursor-pointer transition duration-200 group">
                                <input type="radio" name="site_choice" value="${site}" ${index === 0 ? 'checked' : ''}
                                    class="ma-marketplace-option-input w-4 h-4">
                                <span class="ma-marketplace-option-label ml-3 font-bold"> ${MARKETPLACE_SITE_NAME_MAP[site] || site} - ${site} </span>
                                <span class="ml-auto text-xs px-2 py-1 rounded border shadow-sm" style="background: var(--surface-card, #ffffff); color: var(--color-slate-400, #94a3b8); border-color: var(--border-subtle, rgba(148, 163, 184, 0.24));">
                                    ${getFlag(site)}
                                </span>
                            </label>
                        `
                          )
                          .join('')}
                    </div>

                    <div class="flex justify-end gap-3">
                        <button type="button" id="btn-cancel-${modalId}" class="px-4 py-2 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2">
                            取消导入
                        </button>
                        <button type="button" id="btn-confirm-${modalId}" class="ma-marketplace-modal-confirm px-5 py-2 text-white rounded-lg text-sm font-bold shadow-md transition-transform transform active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
                            确认合并
                        </button>
                    </div>
                </div>
            </div>
        `;
}

function createMarketplaceBackdrop(modalId: string): HTMLDivElement {
  const backdrop = document.createElement('div');
  backdrop.id = modalId;
  backdrop.className =
    'ma-marketplace-modal-backdrop fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center fade-in';
  return backdrop;
}

function renderMarketplaceSelectionElements(
  sites: string[],
  modalId: string
): MarketplaceSelectionElements {
  const backdrop = createMarketplaceBackdrop(modalId);
  const content = createMarketplaceSelectionContent(sites, modalId);
  const renderer = SafeRenderer.getInstance();

  renderer.renderTemplate(backdrop, content);
  document.body.appendChild(backdrop);

  return {
    backdrop,
    dialogPanel: backdrop.querySelector('[role="dialog"]') as HTMLElement | null,
    btnConfirm: document.getElementById(`btn-confirm-${modalId}`) as HTMLButtonElement | null,
    btnCancel: document.getElementById(`btn-cancel-${modalId}`) as HTMLButtonElement | null,
  };
}

function removeMarketplaceBackdrop(backdrop: HTMLElement): void {
  try {
    if (document.body.contains(backdrop)) {
      document.body.removeChild(backdrop);
    }
  } catch (error) {
    console.error('[Scraper] 清理弹窗失败:', error);
  }
}

function getSelectedMarketplace(backdrop: HTMLElement): string | null {
  const selectedInput = backdrop.querySelector(
    'input[name="site_choice"]:checked'
  ) as HTMLInputElement | null;
  return selectedInput ? selectedInput.value : null;
}

function hasRequiredMarketplaceControls(elements: MarketplaceSelectionElements): boolean {
  return Boolean(elements.dialogPanel && elements.btnConfirm && elements.btnCancel);
}

function createMarketplaceSelectionResolver(
  resolve: (selected: string | null) => void,
  cleanupRef: { current: MarketplaceSelectionCleanup }
): MarketplaceSelectionFinish {
  let resolved = false;

  return (selected: string | null) => {
    if (resolved) return;
    resolved = true;
    cleanupRef.current();
    resolve(selected);
  };
}

function createMarketplaceSelectionCleanup(
  elements: MarketplaceSelectionElements,
  handlers: {
    confirm: (e: Event) => void;
    cancel: (e: Event) => void;
    backdropClick: (e: MouseEvent) => void;
    escape: (e: KeyboardEvent) => void;
  },
  previousActiveElement: HTMLElement | null
): MarketplaceSelectionCleanup {
  return () => {
    elements.btnConfirm?.removeEventListener('click', handlers.confirm);
    elements.btnCancel?.removeEventListener('click', handlers.cancel);
    elements.backdrop.removeEventListener('click', handlers.backdropClick);
    document.removeEventListener('keydown', handlers.escape);
    removeMarketplaceBackdrop(elements.backdrop);

    if (previousActiveElement?.isConnected) {
      previousActiveElement.focus();
    }
  };
}

function bindMarketplaceSelectionEvents(
  elements: MarketplaceSelectionElements,
  finish: MarketplaceSelectionFinish,
  previousActiveElement: HTMLElement | null
): MarketplaceSelectionCleanup {
  const handlers = {
    confirm: (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      finish(getSelectedMarketplace(elements.backdrop));
    },
    cancel: (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      finish(null);
    },
    backdropClick: (e: MouseEvent) => {
      if (e.target === elements.backdrop) {
        finish(null);
      }
    },
    escape: (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        finish(null);
      }
    },
  };

  elements.btnConfirm?.addEventListener('click', handlers.confirm, { once: true });
  elements.btnCancel?.addEventListener('click', handlers.cancel, { once: true });
  elements.backdrop.addEventListener('click', handlers.backdropClick);
  document.addEventListener('keydown', handlers.escape);

  return createMarketplaceSelectionCleanup(elements, handlers, previousActiveElement);
}

function openMarketplaceSelectionModal(
  sites: string[],
  resolve: (selected: string | null) => void
): void {
  const modalId = 'site-select-modal-' + Date.now();
  const previousActiveElement = getPreviousActiveElement();
  const elements = renderMarketplaceSelectionElements(sites, modalId);
  const cleanupRef = {
    current: () => {
      removeMarketplaceBackdrop(elements.backdrop);
      if (previousActiveElement?.isConnected) {
        previousActiveElement.focus();
      }
    },
  };
  const finish = createMarketplaceSelectionResolver(resolve, cleanupRef);

  if (!hasRequiredMarketplaceControls(elements)) {
    console.error('[Scraper] 站点选择弹窗渲染不完整，已自动关闭');
    finish(null);
    return;
  }

  cleanupRef.current = bindMarketplaceSelectionEvents(elements, finish, previousActiveElement);
  requestAnimationFrame(() => elements.btnCancel?.focus());
}

/**
 * 显示站点选择弹窗
 */
export function showMarketplaceSelectionModal(sites: string[]): Promise<string | null> {
  return new Promise(resolve => {
    openMarketplaceSelectionModal(sites, resolve);
  });
}

function createImportValidationError(filename: string, error: string | undefined): ValidationError {
  return new ValidationError(`文件 ${filename} 数据验证失败`, 'SCRAPER_IMP_009', 'data', error, {
    module: 'ScraperImportHandler',
    action: 'handleImportFiles',
    filename,
  });
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getMetadataMarketplace(value: unknown): ScraperSite | null {
  if (!isObjectRecord(value) || !isObjectRecord(value.metadata)) return null;
  if (typeof value.metadata.marketplace !== 'string') return null;

  const marketplace = value.metadata.marketplace.trim().toUpperCase();
  return SUPPORTED_IMPORTED_MARKETPLACES.has(marketplace as ScraperSite)
    ? (marketplace as ScraperSite)
    : null;
}

function getImportedFileSite(data: unknown): ScraperSite | null {
  if (isObjectRecord(data)) {
    return getMetadataMarketplace(data);
  }

  if (Array.isArray(data) && data.length > 0) {
    return getMetadataMarketplace(data[0]);
  }

  return null;
}

function addProductToPool(
  productPool: ImportedProductPool,
  product: ScrapedProduct,
  site: string,
  filename: string
): void {
  if (!product.asin) return;

  const productWithSource = {
    ...product,
    _source_site: site,
    _filename: filename,
  };
  const productsForAsin = productPool.get(product.asin);

  if (productsForAsin) {
    productsForAsin.push(productWithSource);
    return;
  }

  productPool.set(product.asin, [productWithSource]);
}

function collectImportedFileProducts(
  fileContent: FileReadResult,
  context: ImportCollectionContext
): void {
  const { data, filename } = fileContent;
  if (!data) {
    nativeLoggerConsole.warn(`[Scraper] 文件 ${filename} 数据为空，跳过`);
    return;
  }

  // 验证数据结构
  const validation = validateScrapedData(data);
  if (!validation.valid) {
    console.error(`[Scraper] 文件 ${filename} 数据验证失败:`, validation.error);
    throw createImportValidationError(filename, validation.error);
  }

  const fileSite = getImportedFileSite(data);
  const site = fileSite || 'Unknown';
  if (fileSite) context.detectedSites.add(fileSite);

  // 使用验证后的产品列表
  const list: ScrapedProduct[] = validation.products || [];
  list.forEach((product: ScrapedProduct) => {
    addProductToPool(context.productPool, product, site, filename);
  });
}

function formatFileSize(file: File): string {
  return `${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
}

function validateJsonFileExtensions(files: File[]): void {
  const invalidFiles = files.filter(file => !file.name.toLowerCase().endsWith('.json'));
  if (invalidFiles.length === 0) return;

  console.error(
    '[Scraper] 文件类型错误:',
    invalidFiles.map(file => file.name)
  );
  throw new ValidationError(
    `只支持JSON文件`,
    'SCRAPER_IMP_006',
    'files',
    invalidFiles.map(file => file.name),
    {
      module: 'ScraperImportHandler',
      action: 'handleImportFiles',
      invalidFiles: invalidFiles.map(file => file.name),
    }
  );
}

function validateImportFileSizes(files: File[]): void {
  const oversizedFiles = files.filter(file => file.size > MAX_IMPORT_FILE_SIZE);
  if (oversizedFiles.length === 0) return;

  console.error('[Scraper] 文件过大:', oversizedFiles.map(formatFileSize));
  throw new ValidationError(
    `文件大小不能超过10MB`,
    'SCRAPER_IMP_007',
    'files',
    oversizedFiles.map(file => ({ name: file.name, size: file.size })),
    { module: 'ScraperImportHandler', action: 'handleImportFiles', maxSize: MAX_IMPORT_FILE_SIZE }
  );
}

function warnLargeImportFiles(files: File[]): void {
  const largeFiles = files.filter(
    file => file.size > LARGE_IMPORT_FILE_SIZE && file.size <= MAX_IMPORT_FILE_SIZE
  );
  if (largeFiles.length === 0) return;

  showToast(`检测到大文件，处理可能需要较长时间`, { type: 'warning' });
}

function validateNonEmptyImportFiles(files: File[]): void {
  const emptyFiles = files.filter(file => file.size === 0);
  if (emptyFiles.length === 0) return;

  console.error(
    '[Scraper] 空文件:',
    emptyFiles.map(file => file.name)
  );
  throw new ValidationError(
    `文件内容为空`,
    'SCRAPER_IMP_008',
    'files',
    emptyFiles.map(file => file.name),
    {
      module: 'ScraperImportHandler',
      action: 'handleImportFiles',
      emptyFiles: emptyFiles.map(file => file.name),
    }
  );
}

function validateImportFiles(files: File[]): void {
  validateJsonFileExtensions(files);
  validateImportFileSizes(files);
  warnLargeImportFiles(files);
  validateNonEmptyImportFiles(files);
}

function hasExistingProducts(scrapedData: ScrapedData | null): boolean {
  return !!scrapedData?.products?.length;
}

async function resolveTargetMarketplace(
  detectedSites: Set<string>,
  currentScrapedData: ScrapedData | null,
  selectedSite: ScraperSite
): Promise<string | null> {
  if (detectedSites.size > 1) {
    const selected = await showMarketplaceSelectionModal([...detectedSites]);
    if (!selected) {
      showToast('用户取消导入', { type: 'info' });
      return null;
    }

    return selected;
  }

  const singleDetectedSite = [...detectedSites][0];
  if (singleDetectedSite) {
    return singleDetectedSite;
  }

  if (hasExistingProducts(currentScrapedData)) {
    return currentScrapedData?.metadata?.marketplace || '';
  }

  return selectedSite || '';
}

function getMarketplaceHeader(
  targetMarketplace: string
): { domain: string; name: string } | undefined {
  return (LANGUAGE_HEADERS as Record<string, { domain: string; name: string }>)[targetMarketplace];
}

function createImportedScrapedData(
  finalProducts: ProductData[],
  targetMarketplace: string,
  mode: ImportMode
): ScrapedData {
  const marketplaceHeader = getMarketplaceHeader(targetMarketplace);

  return {
    metadata: {
      marketplace: targetMarketplace,
      scrape_timestamp: new Date().toISOString(),
      total_asins: finalProducts.length,
      last_action: mode === 'merge' ? 'merge_import' : 'new_import',
      // Used by 最近作业 journey captions (数据采集 → 数据来源).
      data_source: 'json_import',
      domain: marketplaceHeader?.domain || 'unknown',
      language: marketplaceHeader?.name || 'unknown',
    },
    products: finalProducts,
  };
}

function createImportUserMessage(errorMessage: string): string {
  if (errorMessage.includes('格式错误') || errorMessage.includes('JSON')) {
    return `JSON格式错误: ${errorMessage}`;
  }

  if (errorMessage.includes('读取文件')) {
    return `文件读取失败: ${errorMessage}`;
  }

  if (errorMessage.includes('未找到有效')) {
    return errorMessage;
  }

  return `导入出错: ${errorMessage}`;
}

/**
 * 处理文件导入主流程
 */
export async function handleImportFiles(
  files: File[],
  currentScrapedData: ScrapedData | null,
  selectedSite: ScraperSite,
  mode: ImportMode = 'merge'
): Promise<ImportResult> {
  try {
    validateImportFiles(files);

    showToast(`正在解析 ${files.length} 个文件...`, { type: 'info' });

    const fileContents = await Promise.all(files.map(f => readFileAsJSON(f)));
    const productPool: ImportedProductPool = new Map();
    const detectedSites = new Set<string>();
    const collectionContext = { productPool, detectedSites };

    fileContents.forEach(fileContent =>
      collectImportedFileProducts(fileContent, collectionContext)
    );

    if (productPool.size === 0) {
      throw new BusinessError('未找到有效的产品数据', 'SCRAPER_IMP_010', {
        module: 'ScraperImportHandler',
        action: 'handleImportFiles',
        filesCount: files.length,
      });
    }

    const targetMarketplace = await resolveTargetMarketplace(
      detectedSites,
      currentScrapedData,
      selectedSite
    );
    if (targetMarketplace === null) {
      return { success: false };
    }

    // 导入新的：先把当前工作区数据存入历史快照，避免替换后丢失
    if (mode === 'new' && currentScrapedData && hasExistingProducts(currentScrapedData)) {
      await HistoryService.saveAsync(currentScrapedData);
      emitHistoryUpdated();
    }

    const currentProductsMap = new Map<string, ScrapedProduct>(
      (currentScrapedData?.products || []).map((p: ScrapedProduct) => [p.asin, p])
    );
    const finalProducts = mergeProducts(productPool, targetMarketplace, currentProductsMap, mode);

    const scrapedData = createImportedScrapedData(finalProducts, targetMarketplace, mode);

    await HistoryService.saveAsync(scrapedData);

    // 触发事件通知其他模块更新
    eventBus.emit(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, scrapedData);
    eventBus.emit(APP_EVENTS.DATA_UPDATED);
    emitHistoryUpdated();

    const actionLabel = mode === 'merge' ? '合并导入' : '导入新的';
    showToast(
      `成功${actionLabel} ${finalProducts.length} 个ASIN (基准站点: ${targetMarketplace})`,
      {
        type: 'success',
      }
    );

    return { success: true, data: scrapedData };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Scraper] 导入失败:', {
      error: error,
      errorMessage: errorMessage,
      filesCount: files.length,
      fileNames: files.map(f => f.name),
    });

    showToast(createImportUserMessage(errorMessage), { type: 'error' });

    return { success: false, error: errorMessage };
  }
}
