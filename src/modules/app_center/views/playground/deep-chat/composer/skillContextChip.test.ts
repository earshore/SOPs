import { describe, expect, it } from 'vitest';
import {
  SKILL_CHIP_DISMISSIBLE_CLASS,
  SKILL_CHIP_STATIC_CLASS,
  createSkillContextChip,
  hydrateUserMessageBubblesWithSkillChips,
  serializeChipContainingElement,
  setContentWithInlineSkillChips,
  textContainsSkillChipMarker,
} from './skillContextChip';
import {
  displaySkillTitle,
  formatSkillTitleSegment,
} from '@/modules/app_center/skillDeepChatHandoff';

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

  it('strips decorative emoji from chip label but keeps dataset title for serialization', () => {
    const withEmoji = {
      skillId: 'emoji-skill',
      skillTitle: '利润测算📊',
      skillRaw: '# Profit',
    };
    const chip = createSkillContextChip(withEmoji, 'static');
    expect(chip.dataset.skillTitle).toBe(withEmoji.skillTitle);
    expect(chip.querySelector('.deep-chat-context-chip__label')?.textContent).toBe('利润测算');
    expect(chip.querySelector('.deep-chat-context-chip__label')?.textContent).not.toContain('📊');
  });

  it('hydrates the emoji-stripped title Deep Chat submits into a static message chip', () => {
    const decoratedContext = {
      skillId: 'advertising-strategy',
      skillTitle: 'Amazon Advertising Strategy 📢',
      skillRaw: '# Advertising',
    };
    const message = document.createElement('div');
    message.className = 'outer-message-container deep-chat-outer-container-role-user';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = `${displaySkillTitle(decoratedContext.skillTitle)}\n请分析广告数据。`;
    message.appendChild(bubble);

    hydrateUserMessageBubblesWithSkillChips(message, [decoratedContext]);

    const chip = bubble.querySelector<HTMLElement>(`.${SKILL_CHIP_STATIC_CLASS}`);
    expect(chip?.dataset.skillTitle).toBe(decoratedContext.skillTitle);
    expect(chip?.querySelector('.deep-chat-context-chip__label')?.textContent).toBe(
      displaySkillTitle(decoratedContext.skillTitle)
    );
    expect(chip?.querySelector('[data-action="dismiss-skill-context"]')).toBeNull();
    expect(serializeChipContainingElement(bubble, [decoratedContext])).toBe(
      `${formatSkillTitleSegment(decoratedContext.skillTitle)}请分析广告数据。`
    );
  });

  it('preserves rendered Markdown while hydrating static message chips', () => {
    const decoratedContext = {
      skillId: 'advertising-strategy',
      skillTitle: 'Amazon Advertising Strategy 📢',
      skillRaw: '# Advertising',
    };
    const message = document.createElement('div');
    message.className = 'outer-message-container deep-chat-outer-container-role-user';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    const paragraph = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = '广告计划：';
    const link = document.createElement('a');
    link.href = 'https://example.com';
    link.textContent = '参考链接';
    paragraph.append(
      strong,
      document.createTextNode(` ${formatSkillTitleSegment(decoratedContext.skillTitle)} `),
      link
    );
    const code = document.createElement('code');
    code.textContent = 'keepFormatting()';
    const pre = document.createElement('pre');
    pre.appendChild(code);
    bubble.append(paragraph, pre);
    message.appendChild(bubble);

    hydrateUserMessageBubblesWithSkillChips(message, [decoratedContext]);

    expect(
      bubble.querySelector(`.${SKILL_CHIP_STATIC_CLASS}`)?.getAttribute('data-skill-title')
    ).toBe(decoratedContext.skillTitle);
    expect(bubble.querySelector('strong')?.textContent).toBe('广告计划：');
    expect(bubble.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
    expect(bubble.querySelector('code')?.textContent).toBe('keepFormatting()');
  });

  it('does not hydrate a bare Skill title inside Markdown link or code content', () => {
    const decoratedContext = {
      skillId: 'advertising-strategy',
      skillTitle: 'Amazon Advertising Strategy 📢',
      skillRaw: '# Advertising',
    };
    const visibleTitle = displaySkillTitle(decoratedContext.skillTitle);
    const message = document.createElement('div');
    message.className = 'outer-message-container deep-chat-outer-container-role-user';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    const link = document.createElement('a');
    link.href = 'https://example.com/skill';
    link.textContent = visibleTitle;
    const code = document.createElement('code');
    code.textContent = visibleTitle;
    bubble.append(link, document.createTextNode('\n'), code);
    message.appendChild(bubble);

    hydrateUserMessageBubblesWithSkillChips(message, [decoratedContext]);

    expect(bubble.querySelector(`.${SKILL_CHIP_STATIC_CLASS}`)).toBeNull();
    expect(link.textContent).toBe(visibleTitle);
    expect(link.getAttribute('href')).toBe('https://example.com/skill');
    expect(code.textContent).toBe(visibleTitle);
  });

  it('does not rewrite a literal Skill title in code when serializing a chip-containing message', () => {
    const decoratedContext = {
      skillId: 'advertising-strategy',
      skillTitle: 'Amazon Advertising Strategy 📢',
      skillRaw: '# Advertising',
    };
    const host = document.createElement('div');
    setContentWithInlineSkillChips(
      host,
      formatSkillTitleSegment(decoratedContext.skillTitle),
      [decoratedContext],
      'static'
    );
    const code = document.createElement('code');
    const visibleTitle = displaySkillTitle(decoratedContext.skillTitle);
    code.textContent = visibleTitle;
    host.appendChild(code);

    expect(serializeChipContainingElement(host, [decoratedContext])).toBe(
      `${formatSkillTitleSegment(decoratedContext.skillTitle)}${visibleTitle}`
    );
  });

  it('rehydrates the emoji-stripped sent title into a dismissible composer chip', () => {
    const decoratedContext = {
      skillId: 'advertising-strategy',
      skillTitle: 'Amazon Advertising Strategy 📢',
      skillRaw: '# Advertising',
    };
    const host = document.createElement('div');
    const sentText = `${displaySkillTitle(decoratedContext.skillTitle)}\n请分析广告数据。`;

    setContentWithInlineSkillChips(host, sentText, [decoratedContext], 'dismissible');

    const chip = host.querySelector<HTMLElement>(`.${SKILL_CHIP_DISMISSIBLE_CLASS}`);
    expect(chip?.dataset.skillTitle).toBe(decoratedContext.skillTitle);
    expect(chip?.querySelector('.deep-chat-context-chip__label')?.textContent).toBe(
      displaySkillTitle(decoratedContext.skillTitle)
    );
    expect(chip?.querySelector('[data-action="dismiss-skill-context"]')).not.toBeNull();
    expect(serializeChipContainingElement(host, [decoratedContext])).toBe(
      `${formatSkillTitleSegment(decoratedContext.skillTitle)}请分析广告数据。`
    );
  });

  it('does not hydrate an ambiguous bare title shared by raw and decorated contexts', () => {
    const rawContext = {
      skillId: 'advertising-strategy',
      skillTitle: 'Amazon Advertising Strategy',
      skillRaw: '# Advertising',
    };
    const decoratedContext = {
      skillId: 'advertising-strategy-decorated',
      skillTitle: 'Amazon Advertising Strategy 📢',
      skillRaw: '# Advertising Decorated',
    };
    const host = document.createElement('div');

    setContentWithInlineSkillChips(
      host,
      rawContext.skillTitle,
      [decoratedContext, rawContext],
      'static'
    );

    expect(host.querySelector(`.${SKILL_CHIP_STATIC_CLASS}`)).toBeNull();
    expect(host.textContent).toBe(rawContext.skillTitle);

    setContentWithInlineSkillChips(
      host,
      formatSkillTitleSegment(decoratedContext.skillTitle),
      [decoratedContext, rawContext],
      'static'
    );

    expect(host.querySelector<HTMLElement>(`.${SKILL_CHIP_STATIC_CLASS}`)?.dataset.skillTitle).toBe(
      decoratedContext.skillTitle
    );
  });

  it('does not bind a shared visible title in a user bubble while raw markers stay exact', () => {
    const plain = {
      skillId: 'plain-foo',
      skillTitle: 'Foo',
      skillRaw: '# Foo',
    };
    const decorated = {
      skillId: 'decorated-foo',
      skillTitle: 'Foo 📢',
      skillRaw: '# Foo decorated',
    };
    const contexts = [plain, decorated];
    const message = document.createElement('div');
    message.className = 'outer-message-container deep-chat-outer-container-role-user';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = 'Foo';
    message.appendChild(bubble);

    hydrateUserMessageBubblesWithSkillChips(message, contexts);

    expect(bubble.querySelector(`.${SKILL_CHIP_STATIC_CLASS}`)).toBeNull();
    expect(bubble.textContent).toBe('Foo');

    bubble.textContent = `${formatSkillTitleSegment(plain.skillTitle)}${formatSkillTitleSegment(
      decorated.skillTitle
    )}`;
    hydrateUserMessageBubblesWithSkillChips(message, contexts);

    expect(
      Array.from(bubble.querySelectorAll<HTMLElement>(`.${SKILL_CHIP_STATIC_CLASS}`)).map(
        chip => chip.dataset.skillTitle
      )
    ).toEqual([plain.skillTitle, decorated.skillTitle]);
  });

  it('does not hydrate a shared display title for two decorated Skills', () => {
    const firstContext = {
      skillId: 'advertising-strategy-first',
      skillTitle: 'Amazon Advertising Strategy 📢',
      skillRaw: '# Advertising First',
    };
    const secondContext = {
      skillId: 'advertising-strategy-second',
      skillTitle: 'Amazon Advertising Strategy 🚀',
      skillRaw: '# Advertising Second',
    };
    const host = document.createElement('div');
    const sharedDisplayTitle = displaySkillTitle(firstContext.skillTitle);

    setContentWithInlineSkillChips(
      host,
      sharedDisplayTitle,
      [firstContext, secondContext],
      'static'
    );

    expect(host.querySelector(`.${SKILL_CHIP_STATIC_CLASS}`)).toBeNull();
    expect(host.textContent).toBe(sharedDisplayTitle);
  });

  it('hydrates every unique decorated display title in a multi-skill message', () => {
    const firstContext = {
      skillId: 'advertising-strategy',
      skillTitle: 'Amazon Advertising Strategy 📢',
      skillRaw: '# Advertising',
    };
    const secondContext = {
      skillId: 'product-research',
      skillTitle: 'Amazon Product Research 🔍',
      skillRaw: '# Product Research',
    };
    const host = document.createElement('div');
    const sentText = `${displaySkillTitle(firstContext.skillTitle)}\n${displaySkillTitle(
      secondContext.skillTitle
    )}\n请分析业务数据。`;

    setContentWithInlineSkillChips(host, sentText, [firstContext, secondContext], 'static');

    expect(
      Array.from(host.querySelectorAll<HTMLElement>(`.${SKILL_CHIP_STATIC_CLASS}`)).map(
        chip => chip.dataset.skillTitle
      )
    ).toEqual([firstContext.skillTitle, secondContext.skillTitle]);
  });
});
