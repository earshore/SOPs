/**
 * 验证 vendor 内真实 skill 可被 Registry 加载，并模拟 Deep Chat 系统提示词载入契约。
 */
import { describe, expect, it } from 'vitest';
import { skillRegistry } from './skillRegistryService';
import {
  buildSkillDeepChatUserDraft,
  queueSkillForDeepChat,
  consumeSkillForDeepChat,
} from '@/modules/app_center/skillDeepChatHandoff';

const SAMPLE_SKILL_IDS = [
  'amazon-keyword-research',
  'amazon-ppc-campaign',
  'amazon-listing-optimization',
  'amazon-fba-calculator',
  'amazon-global-selling', // beta
] as const;

describe('skillRegistry production assets', () => {
  it('indexes vendor Amazon skills', () => {
    skillRegistry.ensureInitialized();
    const stats = skillRegistry.getStats();
    expect(stats.total).toBeGreaterThanOrEqual(50);
    expect(stats.byStatus.available ?? 0).toBeGreaterThan(0);
    expect(stats.byStatus.beta ?? 0).toBeGreaterThanOrEqual(1);
  });

  it.each(SAMPLE_SKILL_IDS)('loadSkillContext(%s) returns non-empty skill body', skillId => {
    const ctx = skillRegistry.loadSkillContext(skillId);
    expect(ctx.length).toBeGreaterThan(200);
    expect(ctx).toContain(skillId);
    expect(ctx).toMatch(/^---/m);
  });

  it('marks beta skills from category map', () => {
    const skill = skillRegistry.getSkill('amazon-global-selling');
    expect(skill?.status).toBe('beta');
    const available = skillRegistry.getSkill('amazon-ppc-campaign');
    expect(available?.status).toBe('available');
  });

  it('handoff to Deep Chat carries system prompt payload', () => {
    const skill = skillRegistry.getSkill('amazon-keyword-research');
    expect(skill).toBeDefined();
    if (!skill) return;

    queueSkillForDeepChat({
      skillId: skill.id,
      skillTitle: skill.title,
      skillRaw: skill.raw,
      userDraft: buildSkillDeepChatUserDraft(skill.title),
    });

    const pending = consumeSkillForDeepChat();
    expect(pending?.skillRaw).toContain('amazon-keyword-research');
    expect(pending?.userDraft).toContain('业务数据');
    // 系统提示词 = skill 全文；草稿为业务引导（技能名在 Context Bar）
    const systemPrompt = pending?.skillRaw ?? '';
    expect(systemPrompt.length).toBeLessThan(102400);
    expect(pending?.userDraft).not.toContain(skill.title);
    expect(pending?.skillTitle).toBeTruthy();
  });
});
