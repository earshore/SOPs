import { SafeModuleLoader } from '../../../../../common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '../../../../../common/infrastructure/SafeRenderer';
import { showToast } from '../../../../../common/ui';
import { appStore } from '../../../../../stores/useAppStore';
import type { HistoryItem, KeywordHunterSnapshot } from '../../../../../types/modules-business';
import { HistoryService } from '../../master_analysis/services/historyService';
import { KeywordHunterSnapshotService } from '../services/snapshotService';
import '../keyword_hunter_style.css';

interface EventListenerRecord {
  element: HTMLElement | Document;
  event: string;
  handler: EventListenerOrEventListenerObject;
}

interface HistoryUiState {
  snapshots: KeywordHunterSnapshot[];
  filteredSnapshots: KeywordHunterSnapshot[];
  selectedId: string | null;
  compareIds: string[];
  query: string;
  status: string;
}

const state: HistoryUiState = {
  snapshots: [],
  filteredSnapshots: [],
  selectedId: null,
  compareIds: [],
  query: '',
  status: 'all',
};

let eventListeners: EventListenerRecord[] = [];

function addEventListener(
  element: HTMLElement | Document,
  event: string,
  handler: EventListenerOrEventListenerObject,
): void {
  element.addEventListener(event, handler);
  eventListeners.push({ element, event, handler });
}

function cleanup(): void {
  eventListeners.forEach(({ element, event, handler }) => {
    element.removeEventListener(event, handler);
  });
  eventListeners = [];
}

function getSelectedSnapshot(): KeywordHunterSnapshot | null {
  return state.snapshots.find((snapshot) => snapshot.id === state.selectedId) || null;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusLabel(status: KeywordHunterSnapshot['status']): string {
  const labels: Record<KeywordHunterSnapshot['status'], string> = {
    draft: '草稿',
    matched: '已匹配',
    reported: '有报告',
  };
  return labels[status];
}

function getStatusClass(status: KeywordHunterSnapshot['status']): string {
  const classes: Record<KeywordHunterSnapshot['status'], string> = {
    draft: 'kh-status-draft',
    matched: 'kh-status-matched',
    reported: 'kh-status-reported',
  };
  return classes[status];
}

function getSourceLabel(snapshot: KeywordHunterSnapshot): string {
  if (snapshot.source.type === 'master-analysis') {
    const asins = snapshot.source.asins?.slice(0, 2).join(', ');
    return asins ? `Master · ${asins}` : 'Master Analysis';
  }

  return '手动输入';
}

function getSnapshotSearchText(snapshot: KeywordHunterSnapshot): string {
  return [
    snapshot.title,
    snapshot.status,
    snapshot.source.type,
    snapshot.source.site,
    snapshot.source.asins?.join(' '),
    snapshot.input.keywordsInputText,
  ].filter(Boolean).join(' ').toLowerCase();
}

function applyFilters(): void {
  const query = state.query.trim().toLowerCase();

  state.filteredSnapshots = state.snapshots.filter((snapshot) => {
    const statusMatches = state.status === 'all' || snapshot.status === state.status;
    const queryMatches = !query || getSnapshotSearchText(snapshot).includes(query);
    return statusMatches && queryMatches;
  });
}

function syncSelectedSnapshotWithFilters(): void {
  if (state.selectedId && state.filteredSnapshots.some((snapshot) => snapshot.id === state.selectedId)) {
    return;
  }

  state.selectedId = state.filteredSnapshots[0]?.id || null;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  return element;
}

function createIcon(className: string): HTMLElement {
  const icon = createElement('i', className);
  icon.setAttribute('aria-hidden', 'true');
  return icon;
}

function setButton(
  className: string,
  iconClass: string,
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = createElement('button', className);
  button.type = 'button';
  button.appendChild(createIcon(iconClass));
  const text = createElement('span');
  text.textContent = label;
  button.appendChild(text);
  addEventListener(button, 'click', onClick);
  return button;
}

function createSnapshotListItem(snapshot: KeywordHunterSnapshot): HTMLElement {
  const item = createElement('article', 'kh-snapshot-item');
  item.classList.toggle('active', snapshot.id === state.selectedId);
  item.tabIndex = 0;

  const header = createElement('div', 'kh-snapshot-item-head');
  const title = createElement('h4');
  title.textContent = snapshot.title;
  header.appendChild(title);

  const status = createElement('span', `kh-status-pill ${getStatusClass(snapshot.status)}`);
  status.textContent = getStatusLabel(snapshot.status);
  header.appendChild(status);

  const meta = createElement('div', 'kh-snapshot-item-meta');
  meta.appendChild(createIcon('fas fa-calendar-day'));
  meta.appendChild(document.createTextNode(formatDate(snapshot.updatedAt)));
  const source = createElement('span');
  source.textContent = getSourceLabel(snapshot);
  meta.appendChild(source);

  const stats = createElement('div', 'kh-snapshot-item-stats');
  stats.appendChild(createMiniStat('覆盖', `${snapshot.result.coverageRate}%`));
  stats.appendChild(createMiniStat('命中', String(snapshot.derived.matchedCount)));
  stats.appendChild(createMiniStat('未命中', String(snapshot.derived.unmatchedCount)));

  const actions = createElement('div', 'kh-snapshot-item-actions');
  const compareButton = setButton(
    'kh-icon-action',
    state.compareIds.includes(snapshot.id) ? 'fas fa-square-check' : 'far fa-square',
    '对比',
    () => toggleCompare(snapshot.id),
  );
  compareButton.title = '加入或移出对比';
  actions.appendChild(compareButton);

  item.appendChild(header);
  item.appendChild(meta);
  item.appendChild(stats);
  item.appendChild(actions);

  const select = () => {
    state.selectedId = snapshot.id;
    renderAll();
  };
  addEventListener(item, 'click', select);
  addEventListener(item, 'keydown', (event: Event) => {
    const keyEvent = event as KeyboardEvent;
    if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
      keyEvent.preventDefault();
      select();
    }
  });

  return item;
}

function createMiniStat(label: string, value: string): HTMLElement {
  const stat = createElement('span');
  const valueEl = createElement('strong');
  valueEl.textContent = value;
  const labelEl = createElement('em');
  labelEl.textContent = label;
  stat.appendChild(valueEl);
  stat.appendChild(labelEl);
  return stat;
}

function renderList(): void {
  const list = document.getElementById('kh-history-list');
  const empty = document.getElementById('kh-history-empty');
  const count = document.getElementById('kh-history-count');
  const clearCompareButton = document.getElementById('kh-btn-clear-compare') as HTMLButtonElement | null;

  if (count) {
    count.textContent = `${state.filteredSnapshots.length} / ${state.snapshots.length} 个快照`;
  }

  if (clearCompareButton) {
    clearCompareButton.disabled = state.compareIds.length === 0;
  }

  if (!list || !empty) return;

  list.replaceChildren();
  empty.classList.toggle('hidden', state.filteredSnapshots.length > 0);
  state.filteredSnapshots.forEach((snapshot) => {
    list.appendChild(createSnapshotListItem(snapshot));
  });
}

function createDetailStat(label: string, value: string, tone: string): HTMLElement {
  const stat = createElement('div', `kh-detail-stat ${tone}`);
  const valueEl = createElement('strong');
  valueEl.textContent = value;
  const labelEl = createElement('span');
  labelEl.textContent = label;
  stat.appendChild(valueEl);
  stat.appendChild(labelEl);
  return stat;
}

function renderKeywordTags(container: HTMLElement, keywords: string[], className: string): void {
  const limit = 24;
  const visible = keywords.slice(0, limit);
  visible.forEach((keyword) => {
    const tag = createElement('span', className);
    tag.textContent = keyword;
    container.appendChild(tag);
  });

  if (keywords.length > limit) {
    const overflow = createElement('span', `${className} kh-keyword-overflow`);
    overflow.textContent = `+${keywords.length - limit}`;
    container.appendChild(overflow);
  }
}

function renderSnapshotDetail(snapshot: KeywordHunterSnapshot): HTMLElement {
  const detail = createElement('div', 'kh-detail-content');

  const header = createElement('div', 'kh-detail-header');
  const titleBlock = createElement('div');
  const title = createElement('h3');
  title.textContent = snapshot.title;
  const meta = createElement('p');
  meta.textContent = `${getSourceLabel(snapshot)} · 更新于 ${formatDate(snapshot.updatedAt)}`;
  titleBlock.appendChild(title);
  titleBlock.appendChild(meta);

  const actions = createElement('div', 'kh-detail-actions');
  actions.appendChild(setButton('kh-primary-action', 'fas fa-rotate-left', '恢复现场', () => restoreSnapshot(snapshot)));
  actions.appendChild(setButton('kh-secondary-action', 'fas fa-code-compare', '加入对比', () => toggleCompare(snapshot.id)));
  if (snapshot.source.type === 'master-analysis' && snapshot.source.masterHistoryId !== undefined && snapshot.source.masterHistoryId !== null) {
    actions.appendChild(setButton('kh-secondary-action', 'fas fa-arrow-up-right-from-square', '打开 Master', () => {
      void openMasterSnapshot(snapshot);
    }));
  }
  actions.appendChild(setButton('kh-danger-action', 'fas fa-trash-can', '删除', () => {
    void deleteSnapshot(snapshot.id);
  }));
  actions.appendChild(setButton('kh-primary-action kh-detail-save-action', 'fas fa-floppy-disk', '保存当前快照', () => {
    void saveCurrentSnapshot();
  }));

  header.appendChild(titleBlock);
  header.appendChild(actions);
  detail.appendChild(header);

  const stats = createElement('div', 'kh-detail-stats');
  stats.appendChild(createDetailStat('覆盖率', `${snapshot.result.coverageRate}%`, 'tone-blue'));
  stats.appendChild(createDetailStat('关键词', String(snapshot.derived.keywordCount), 'tone-slate'));
  stats.appendChild(createDetailStat('已命中', String(snapshot.derived.matchedCount), 'tone-green'));
  stats.appendChild(createDetailStat('未命中', String(snapshot.derived.unmatchedCount), 'tone-amber'));
  detail.appendChild(stats);

  const progress = createElement('div', 'kh-coverage-track');
  const progressFill = createElement('div', 'kh-coverage-fill');
  progressFill.style.width = `${Math.min(100, Math.max(0, snapshot.result.coverageRate))}%`;
  progress.appendChild(progressFill);
  detail.appendChild(progress);

  const keywordGrid = createElement('div', 'kh-keyword-sections');
  const matched = createElement('section');
  const matchedTitle = createElement('h4');
  matchedTitle.textContent = '已匹配关键词';
  const matchedTags = createElement('div', 'kh-keyword-tags');
  renderKeywordTags(matchedTags, snapshot.result.matchedKeywords.map((item) => `${item.keyword} (${item.count})`), 'kh-keyword-tag matched');
  matched.appendChild(matchedTitle);
  matched.appendChild(matchedTags);

  const unmatched = createElement('section');
  const unmatchedTitle = createElement('h4');
  unmatchedTitle.textContent = '未匹配关键词';
  const unmatchedTags = createElement('div', 'kh-keyword-tags');
  renderKeywordTags(unmatchedTags, snapshot.result.unmatchedKeywords, 'kh-keyword-tag unmatched');
  unmatched.appendChild(unmatchedTitle);
  unmatched.appendChild(unmatchedTags);

  keywordGrid.appendChild(matched);
  keywordGrid.appendChild(unmatched);
  detail.appendChild(keywordGrid);

  const report = createElement('section', 'kh-report-preview');
  const reportTitle = createElement('h4');
  reportTitle.textContent = 'AI 报告';
  const reportText = createElement('p');
  reportText.textContent = snapshot.result.llmAnalysisResult?.trim()
    ? snapshot.result.llmAnalysisResult.trim().slice(0, 420)
    : '该快照尚未生成 AI 报告。';
  report.appendChild(reportTitle);
  report.appendChild(reportText);
  detail.appendChild(report);

  detail.appendChild(renderComparePanel());
  return detail;
}

function renderComparePanel(): HTMLElement {
  const panel = createElement('section', 'kh-compare-panel');
  const title = createElement('h4');
  title.textContent = '快照对比';
  panel.appendChild(title);

  if (state.compareIds.length < 2) {
    const empty = createElement('p', 'kh-compare-empty');
    empty.textContent = '选择两个快照后显示覆盖率和关键词变化。';
    panel.appendChild(empty);
    return panel;
  }

  const [beforeId, afterId] = state.compareIds;
  const before = state.snapshots.find((snapshot) => snapshot.id === beforeId);
  const after = state.snapshots.find((snapshot) => snapshot.id === afterId);
  if (!before || !after) return panel;

  const diff = KeywordHunterSnapshotService.compare(before, after);
  const summary = createElement('div', 'kh-compare-summary');
  summary.appendChild(createDetailStat('覆盖率变化', `${diff.coverageDelta > 0 ? '+' : ''}${diff.coverageDelta}%`, diff.coverageDelta >= 0 ? 'tone-green' : 'tone-amber'));
  summary.appendChild(createDetailStat('新增关键词', String(diff.addedKeywords.length), 'tone-blue'));
  summary.appendChild(createDetailStat('新命中', String(diff.newlyMatchedKeywords.length), 'tone-green'));
  summary.appendChild(createDetailStat('转为未命中', String(diff.newlyUnmatchedKeywords.length), 'tone-amber'));
  panel.appendChild(summary);

  const diffGrid = createElement('div', 'kh-compare-diff-grid');
  diffGrid.appendChild(createDiffList('新增关键词', diff.addedKeywords));
  diffGrid.appendChild(createDiffList('移除关键词', diff.removedKeywords));
  diffGrid.appendChild(createDiffList('新命中关键词', diff.newlyMatchedKeywords));
  diffGrid.appendChild(createDiffList('命中下降', diff.declinedKeywords.map((item) => `${item.keyword}: ${item.before} → ${item.after}`)));
  panel.appendChild(diffGrid);
  return panel;
}

function createDiffList(titleText: string, items: string[]): HTMLElement {
  const section = createElement('div', 'kh-diff-list');
  const title = createElement('strong');
  title.textContent = titleText;
  section.appendChild(title);

  if (items.length === 0) {
    const empty = createElement('span');
    empty.textContent = '无变化';
    section.appendChild(empty);
    return section;
  }

  const list = createElement('ul');
  items.slice(0, 8).forEach((item) => {
    const li = createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
  section.appendChild(list);
  return section;
}

function renderDetail(): void {
  const detail = document.getElementById('kh-history-detail');
  if (!detail) return;

  detail.replaceChildren();
  const snapshot = getSelectedSnapshot();
  if (!snapshot) {
    const empty = createElement('div', 'kh-history-detail-empty');
    empty.appendChild(createIcon('fas fa-clock-rotate-left'));
    const title = createElement('h3');
    title.textContent = '选择一个快照';
    const description = createElement('p');
    description.textContent = '查看覆盖率、关键词差异、AI 报告和 Master 来源。';
    empty.appendChild(title);
    empty.appendChild(description);
    detail.appendChild(empty);
    return;
  }

  detail.appendChild(renderSnapshotDetail(snapshot));
}

function renderAll(): void {
  applyFilters();
  syncSelectedSnapshotWithFilters();
  renderList();
  renderDetail();
}

function toggleCompare(snapshotId: string): void {
  if (state.compareIds.includes(snapshotId)) {
    state.compareIds = state.compareIds.filter((id) => id !== snapshotId);
  } else {
    state.compareIds = [...state.compareIds.slice(-1), snapshotId];
  }
  renderAll();
}

async function loadSnapshots(): Promise<void> {
  state.snapshots = await KeywordHunterSnapshotService.getAllAsync();
  if (!state.selectedId || !state.snapshots.some((snapshot) => snapshot.id === state.selectedId)) {
    state.selectedId = state.snapshots[0]?.id || null;
  }
  state.compareIds = state.compareIds.filter((id) => state.snapshots.some((snapshot) => snapshot.id === id));
  renderAll();
}

async function saveCurrentSnapshot(): Promise<void> {
  try {
    const snapshot = await KeywordHunterSnapshotService.saveCurrentAsync();
    state.selectedId = snapshot.id;
    await loadSnapshots();
    showToast('Keyword Hunter 快照已保存', { type: 'success' });
  } catch (error) {
    console.error('[KeywordHunterHistory] 保存快照失败:', error);
    showToast(error instanceof Error ? error.message : '保存快照失败', { type: 'error' });
  }
}

function getRestoreTarget(snapshot: KeywordHunterSnapshot): string {
  if (snapshot.status === 'reported') return '/app-center/keyword-hunter/analysis';
  if (snapshot.status === 'matched') return '/app-center/keyword-hunter/process';
  return '/app-center/keyword-hunter/input';
}

function restoreSnapshot(snapshot: KeywordHunterSnapshot): void {
  KeywordHunterSnapshotService.restore(snapshot);
  showToast('快照现场已恢复', { type: 'success' });
  void window.navigateTo(getRestoreTarget(snapshot));
}

async function deleteSnapshot(id: string): Promise<void> {
  if (!window.confirm('确定删除这个 Keyword Hunter 快照吗？此操作无法撤回。')) {
    return;
  }

  try {
    await KeywordHunterSnapshotService.deleteByIdAsync(id);
    if (state.selectedId === id) state.selectedId = null;
    state.compareIds = state.compareIds.filter((compareId) => compareId !== id);
    await loadSnapshots();
    showToast('快照已删除', { type: 'success' });
  } catch (error) {
    console.error('[KeywordHunterHistory] 删除快照失败:', error);
    showToast(error instanceof Error ? error.message : '删除快照失败', { type: 'error' });
  }
}

function restoreMasterHistoryItem(item: HistoryItem): void {
  const store = appStore.getState();
  store.setCurrentHistoryId(item.id);
  store.setScrapedData(item.data);
  store.setAnalysisReport(item.analysisStatus?.analysisReport || item.report || null);
  store.setTranslatedReport(null);
  store.setSelectedSite(item.site as never);
}

async function openMasterSnapshot(snapshot: KeywordHunterSnapshot): Promise<void> {
  const masterHistoryId = snapshot.source.masterHistoryId;
  if (masterHistoryId === undefined || masterHistoryId === null) {
    showToast('该快照没有绑定 Master Analysis 来源', { type: 'warning' });
    return;
  }

  await HistoryService.getAllAsync();
  const item = HistoryService.getById(masterHistoryId);
  if (!item) {
    showToast('未找到对应的 Master Analysis 快照', { type: 'warning' });
    return;
  }

  restoreMasterHistoryItem(item);
  showToast('已打开关联的 Master Analysis 快照', { type: 'success' });
  void window.navigateTo('/app-center/scraper');
}

function setupEventListeners(): void {
  const clearCompareButton = document.getElementById('kh-btn-clear-compare');
  if (clearCompareButton) {
    addEventListener(clearCompareButton, 'click', () => {
      state.compareIds = [];
      renderAll();
    });
  }

  const search = document.getElementById('kh-history-search') as HTMLInputElement | null;
  if (search) {
    addEventListener(search, 'input', () => {
      state.query = search.value;
      renderAll();
    });
  }

  const status = document.getElementById('kh-history-status') as HTMLSelectElement | null;
  if (status) {
    addEventListener(status, 'change', () => {
      state.status = status.value;
      renderAll();
    });
  }
}

export async function mount(container: HTMLElement): Promise<void> {
  const loader = SafeModuleLoader.getInstance();
  const renderer = SafeRenderer.getInstance();

  const html = await loader.loadTemplate(
    'src/modules/app_center/views/keyword_hunter/history/template.html',
    {
      retryCount: 3,
      timeout: 5000,
      onError: (error) => {
        console.error('[KeywordHunterHistory] 模板加载失败:', error);
      },
    },
  );

  container.classList.add('fade-in');
  renderer.renderTemplate(container, html);
  setupEventListeners();
  await loadSnapshots();
}

export function unmount(): void {
  cleanup();
}
