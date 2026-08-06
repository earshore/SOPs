import { showToast } from '@/common/ui/notifications';
import { registerPpcActionListArtifact } from '@/modules/app_center/artifactEnvelopeService';
import { getWorkspaceContext } from '@/modules/app_center/workspaceContext';
import {
  updatePpcActionListReview,
  type PpcActionListReviewStatus,
  type PpcActionListSnapshot,
} from './export/actionListSnapshotService';

const REVIEW_LABELS: Record<PpcActionListReviewStatus, string> = {
  pending: '需人工复核',
  confirmed: '已人工确认',
  skipped: '暂不处理',
};

function createStatusButton(
  status: PpcActionListReviewStatus,
  snapshot: PpcActionListSnapshot,
  note: HTMLTextAreaElement,
  onUpdated: (updated: PpcActionListSnapshot) => void
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  // aria-pressed 切换由共享 .category-filter-btn 的 [aria-pressed='true'] 样式承接
  button.className = 'category-filter-btn';
  button.dataset.reviewStatus = status;
  button.textContent = REVIEW_LABELS[status];
  button.setAttribute('aria-pressed', String(snapshot.reviewStatus === status));
  button.addEventListener('click', () => {
    void saveReview(snapshot, status, note.value, onUpdated);
  });
  return button;
}

async function saveReview(
  snapshot: PpcActionListSnapshot,
  status: PpcActionListReviewStatus,
  note: string,
  onUpdated: (updated: PpcActionListSnapshot) => void
): Promise<void> {
  const updated = await updatePpcActionListReview(snapshot.id, status, note);
  if (!updated) {
    showToast('未能保存 PPC 复核状态，请重试。', { type: 'error' });
    return;
  }

  registerPpcActionListArtifact(
    {
      id: updated.id,
      reportType: updated.reportType,
      filter: updated.filter,
      rowCount: updated.rows.length,
      owner: updated.owner,
      requiresHumanConfirmation: updated.reviewStatus === 'pending',
      reviewStatus: updated.reviewStatus,
      note: updated.note,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
    getWorkspaceContext()
  );
  onUpdated(updated);
  showToast(`PPC 建议已标记为“${REVIEW_LABELS[updated.reviewStatus]}”`, {
    type: 'success',
  });
}

export function renderPpcResumeReviewBanner(
  container: HTMLElement,
  initialSnapshot: PpcActionListSnapshot
): void {
  let snapshot = initialSnapshot;
  const existing = container.querySelector('.ppc-search-terms-resume-review');
  existing?.remove();

  const banner = document.createElement('section');
  banner.className = 'ppc-search-terms-resume-review';
  banner.setAttribute('aria-labelledby', 'ppc-search-terms-resume-review-title');

  const copy = document.createElement('div');
  const title = document.createElement('h3');
  title.id = 'ppc-search-terms-resume-review-title';
  title.textContent = '本地 PPC 建议快照';
  const detail = document.createElement('p');
  detail.textContent = `${snapshot.rows.length} 条建议 · 负责人：${snapshot.owner}。这里只记录人工复核结果，不会自动修改广告。`;
  copy.append(title, detail);

  const note = document.createElement('textarea');
  note.className = 'ppc-search-terms-resume-review-note';
  note.rows = 2;
  note.value = snapshot.note;
  note.placeholder = '可选：记录人工复核备注';
  note.setAttribute('aria-label', 'PPC 人工复核备注');

  const actions = document.createElement('div');
  actions.className = 'ppc-search-terms-resume-review-actions';
  const rerenderButtons = (updated: PpcActionListSnapshot): void => {
    snapshot = updated;
    note.value = updated.note;
    actions.replaceChildren(
      ...(['pending', 'confirmed', 'skipped'] as const).map(status =>
        createStatusButton(status, snapshot, note, rerenderButtons)
      )
    );
  };
  rerenderButtons(snapshot);

  banner.append(copy, note, actions);
  container.querySelector('.ppc-search-terms-action-toolbar')?.before(banner);
}
