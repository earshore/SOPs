import { navigateToRouteId } from '@/common/router/initRouter';
import { showToast } from '@/common/ui/notifications';
import {
  registerComplianceCheckArtifact,
  type AppCenterArtifactEnvelope,
  type AppCenterWorkItem,
} from '../../artifactEnvelopeService';
import {
  getComplianceReviewView,
  type ComplianceReviewStates,
  type ComplianceReviewStatus,
} from '../../complianceReviewState';
import { parseArtifactPayloadRef } from '../../artifactResumeService';
import type { AppCenterWorkspaceContext } from '../../workspaceContext';

const STATUS_OPTIONS: ReadonlyArray<{ value: ComplianceReviewStatus; label: string }> = [
  { value: 'pending', label: '待复核' },
  { value: 'passed', label: '通过' },
  { value: 'issue_found', label: '发现问题' },
  { value: 'not_applicable', label: '不适用' },
];

function buildContext(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null
): AppCenterWorkspaceContext {
  return {
    workItemId: artifact.workItemId,
    marketplace: (workItem?.marketplace || '') as AppCenterWorkspaceContext['marketplace'],
    language: '',
    asinOrSku: workItem?.asinOrSku || '',
    sourceRoute: artifact.sourceRoute,
    updatedAt: artifact.createdAt,
  };
}

function saveComplianceReview(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null,
  states: ComplianceReviewStates,
  note: string
): void {
  const parsed = parseArtifactPayloadRef(artifact.payloadRef);
  if (parsed.kind !== 'compliance_check' || !parsed.id) return;
  registerComplianceCheckArtifact(
    {
      id: parsed.id,
      checklistIds: Object.keys(states),
      itemStates: states,
      createdAt: artifact.createdAt,
      updatedAt: new Date().toISOString(),
      note,
    },
    buildContext(artifact, workItem)
  );
}

function createStatusSelect(
  itemId: string,
  itemLabel: string,
  status: ComplianceReviewStatus,
  onChange: (status: ComplianceReviewStatus) => void
): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'app-overview-compliance-status';
  select.dataset.complianceItemId = itemId;
  select.setAttribute('aria-label', `${itemLabel}状态`);
  STATUS_OPTIONS.forEach(option => {
    const element = document.createElement('option');
    element.value = option.value;
    element.textContent = option.label;
    element.selected = option.value === status;
    select.append(element);
  });
  select.addEventListener('change', () => {
    const value = select.value as ComplianceReviewStatus;
    onChange(value);
  });
  return select;
}

export function createComplianceReviewPanel(
  artifact: AppCenterArtifactEnvelope,
  workItem: AppCenterWorkItem | null,
  expanded: boolean,
  onSaved: (itemId?: string) => void
): HTMLElement {
  const view = getComplianceReviewView(artifact);
  const states: ComplianceReviewStates = Object.fromEntries(
    view.items.map(item => [item.id, item.status])
  );
  const panel = document.createElement('section');
  panel.className = `app-overview-compliance-review${expanded ? '' : ' hidden'}`;
  panel.dataset.complianceReview = artifact.id;
  panel.setAttribute('aria-label', '人工合规复核清单');

  const intro = document.createElement('p');
  intro.className = 'app-overview-compliance-intro';
  intro.textContent = '这里只记录人工检查结果，不会自动修改 Listing 或广告。';
  panel.append(intro);

  view.items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'app-overview-compliance-item';

    const copy = document.createElement('div');
    const label = document.createElement('strong');
    label.textContent = item.label;
    const point = document.createElement('small');
    point.textContent = item.reviewPoint;
    copy.append(label, point);

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'app-overview-compliance-open';
    openButton.textContent = '打开检查项';
    openButton.setAttribute('aria-label', `打开${item.label}检查项`);
    openButton.addEventListener('click', () => {
      void navigateToRouteId(item.routeId).then(ok => {
        if (!ok) showToast('未能打开合规检查项，请重试。', { type: 'error' });
      });
    });

    const select = createStatusSelect(item.id, item.label, item.status, status => {
      states[item.id] = status;
      onSaved(item.id);
      saveComplianceReview(artifact, workItem, states, view.note);
    });
    row.append(copy, openButton, select);
    panel.append(row);
  });

  const noteRow = document.createElement('div');
  noteRow.className = 'app-overview-compliance-note-row';
  const note = document.createElement('textarea');
  note.className = 'app-overview-compliance-note';
  note.rows = 2;
  note.value = view.note;
  note.placeholder = '可选：记录本次人工复核备注';
  note.setAttribute('aria-label', '合规复核备注');
  const saveNote = document.createElement('button');
  saveNote.type = 'button';
  saveNote.className = 'app-overview-compliance-save';
  saveNote.textContent = '保存备注';
  saveNote.addEventListener('click', () => {
    saveComplianceReview(artifact, workItem, states, note.value);
    showToast('合规复核备注已保存', { type: 'success' });
  });
  noteRow.append(note, saveNote);
  panel.append(noteRow);

  return panel;
}
