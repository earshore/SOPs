import { describe, expect, it } from 'vitest';
import { extractTitleFromBody, parseSkillMd } from './parseSkillMd';

const SAMPLE = `---
name: amazon-keyword-research
description: "Amazon keyword research for sellers."
metadata: {"nexscope":{"emoji":"🔍","category":"amazon"}}
---

# Amazon Keyword Research

Body line one.
`;

describe('parseSkillMd', () => {
  it('parses name, description, body, and emoji', () => {
    const result = parseSkillMd(SAMPLE);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('amazon-keyword-research');
    expect(result!.description).toContain('keyword research');
    expect(result!.body).toContain('# Amazon Keyword Research');
    expect(result!.body).not.toMatch(/^---/);
    expect(result!.emoji).toBe('🔍');
  });

  it('returns null for empty input', () => {
    expect(parseSkillMd('')).toBeNull();
    expect(parseSkillMd('   ')).toBeNull();
  });

  it('treats body-only markdown as valid without name', () => {
    const result = parseSkillMd('# Title Only\n\nHello');
    expect(result).not.toBeNull();
    expect(result!.name).toBeUndefined();
    expect(result!.body).toContain('# Title Only');
    expect(result!.description).toBe('');
  });

  it('handles unquoted description values', () => {
    const raw = `---
name: demo-skill
description: plain description text
---

# Demo
`;
    const result = parseSkillMd(raw);
    expect(result!.name).toBe('demo-skill');
    expect(result!.description).toBe('plain description text');
  });

  it('extractTitleFromBody uses first h1', () => {
    expect(extractTitleFromBody('# Hello World\n\nbody', 'fallback')).toBe('Hello World');
    expect(extractTitleFromBody('no heading', 'fallback')).toBe('fallback');
  });
});
