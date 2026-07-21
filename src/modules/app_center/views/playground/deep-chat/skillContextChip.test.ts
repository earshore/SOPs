import { describe, expect, it } from 'vitest';
import {
  SKILL_CHIP_DISMISSIBLE_CLASS,
  SKILL_CHIP_STATIC_CLASS,
  createSkillContextChip,
  serializeChipContainingElement,
  setContentWithInlineSkillChips,
  textContainsSkillChipMarker,
} from './skillContextChip';
import { formatSkillTitleSegment } from '@/modules/app_center/skillDeepChatHandoff';

const contexts = [
  {
    skillId: 'profit-calculator',
    skillTitle: '利润测算',
    skillRaw: '# Profit',
  },
];

describe('skillContextChip', () => {
  it('builds dismissible chips with remove control and static chips without it', () => {
    const dismissible = createSkillContextChip(contexts[0]!, 'dismissible');
    const staticChip = createSkillContextChip(contexts[0]!, 'static');

    expect(dismissible.classList.contains(SKILL_CHIP_DISMISSIBLE_CLASS)).toBe(true);
    const dismiss = dismissible.querySelector<HTMLButtonElement>(
      '[data-action="dismiss-skill-context"]'
    );
    expect(dismiss).not.toBeNull();
    expect(dismiss?.tabIndex).toBe(0);

    expect(staticChip.classList.contains(SKILL_CHIP_STATIC_CLASS)).toBe(true);
    expect(staticChip.querySelector('[data-action="dismiss-skill-context"]')).toBeNull();
  });

  it('hydrates and serializes skill title segments as chips', () => {
    const host = document.createElement('div');
    const plain = `请根据系统提示词中的 Amazon 技能${formatSkillTitleSegment('利润测算')}方法论`;

    expect(textContainsSkillChipMarker(plain, contexts)).toBe(true);
    setContentWithInlineSkillChips(host, plain, contexts, 'static');

    expect(host.querySelector('.deep-chat-context-chip')?.textContent).toContain('利润测算');
    expect(serializeChipContainingElement(host, contexts)).toBe(plain);
  });
});
