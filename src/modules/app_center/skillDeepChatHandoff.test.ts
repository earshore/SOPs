import { describe, expect, it } from 'vitest';
import {
  buildSkillDeepChatUserDraft,
  buildSystemPromptFromSkillContexts,
  consumeSkillForDeepChat,
  normalizeSkillChipDraftText,
  peekSkillForDeepChat,
  queueSkillForDeepChat,
} from './skillDeepChatHandoff';

describe('skillDeepChatHandoff', () => {
  it('queues, peeks without clearing, and consumes once', () => {
    queueSkillForDeepChat({
      skillId: 'amazon-ppc-campaign',
      skillTitle: 'Amazon PPC Campaign',
      skillRaw: '---\nname: amazon-ppc-campaign\n---\n# PPC',
      userDraft: buildSkillDeepChatUserDraft('Amazon PPC Campaign'),
    });

    const peeked = peekSkillForDeepChat();
    expect(peeked?.skillId).toBe('amazon-ppc-campaign');
    expect(peekSkillForDeepChat()?.skillId).toBe('amazon-ppc-campaign');

    const first = consumeSkillForDeepChat();
    expect(first?.skillId).toBe('amazon-ppc-campaign');
    expect(first?.userDraft).toContain('已挂载的技能方法论');
    expect(first?.userDraft).toContain('业务数据');
    expect(first?.userDraft).not.toContain('Amazon PPC Campaign');
    expect(consumeSkillForDeepChat()).toBeNull();
    expect(peekSkillForDeepChat()).toBeNull();
  });

  it('latest queue wins when overwriting pending handoff', () => {
    queueSkillForDeepChat({
      skillId: 'skill-a',
      skillTitle: 'A',
      skillRaw: 'RAW A',
      userDraft: buildSkillDeepChatUserDraft('A'),
    });
    queueSkillForDeepChat({
      skillId: 'skill-b',
      skillTitle: 'B',
      skillRaw: 'RAW B',
      userDraft: buildSkillDeepChatUserDraft('B'),
    });
    expect(consumeSkillForDeepChat()?.skillId).toBe('skill-b');
    expect(consumeSkillForDeepChat()).toBeNull();
  });

  it('strips injected newlines around skill chip segments without double-wrapping', () => {
    const title = '利润测算';
    const segment = `「${title}」`;
    const contexts = [{ skillTitle: title }];

    const dirty = `请根据系统提示词中的 Amazon 技能\n\n${segment}\n\n方法论，结合我补充的业务数据给出可执行分析。\n\n业务数据：\n（x）`;
    const cleaned = normalizeSkillChipDraftText(dirty, contexts);

    expect(cleaned).toBe(
      `请根据系统提示词中的 Amazon 技能${segment}方法论，结合我补充的业务数据给出可执行分析。\n\n业务数据：\n（x）`
    );
    expect(normalizeSkillChipDraftText(cleaned, contexts)).toBe(cleaned);
    expect(normalizeSkillChipDraftText(`技能\n\n${title}\n\n方法论`, contexts)).toBe(
      `技能${segment}方法论`
    );
  });

  it('builds system prompt from remaining skill contexts', () => {
    const prompt = buildSystemPromptFromSkillContexts([
      { skillRaw: 'SKILL A' },
      { skillRaw: 'SKILL B' },
    ]);
    expect(prompt).toBe('SKILL A\n\n---\n\nSKILL B');
    expect(buildSystemPromptFromSkillContexts([])).toBe('');
  });
});
