import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const templatePath = join(cwd(), 'src/modules/more/views/explore/agents/template.html');

function extractRegistry(html: string): string {
  const start = html.indexOf('<!-- Agent Application Registry -->');
  const end = html.indexOf('<!-- Capability Resources -->');

  if (start < 0 || end < 0 || end <= start) {
    throw new Error('Agent Application Registry section not found');
  }

  return html.slice(start, end);
}

function extractAgentArticle(registry: string, agentName: string): string {
  const headingIndex = registry.indexOf(`<h3 class="font-bold text-slate-900 truncate">${agentName}</h3>`);
  if (headingIndex < 0) {
    throw new Error(`${agentName} not found`);
  }

  const articleStart = registry.lastIndexOf('<article', headingIndex);
  const articleEnd = registry.indexOf('</article>', headingIndex);

  if (articleStart < 0 || articleEnd < 0) {
    throw new Error(`${agentName} article not found`);
  }

  return registry.slice(articleStart, articleEnd);
}

describe('Agent Center convergence guard', () => {
  it('keeps only PPC and daily report agents as active pilot templates', () => {
    const registry = extractRegistry(readFileSync(templatePath, 'utf8'));
    const activeAgents = ['PPC Search Terms Agent', 'Amazon Daily Report Agent'];
    const draftAgents = ['Compliance Risk Agent', 'Customer Voice Agent'];

    activeAgents.forEach((agentName) => {
      expect(extractAgentArticle(registry, agentName)).toContain('样板优先');
      expect(extractAgentArticle(registry, agentName)).not.toContain('设计草案');
    });

    draftAgents.forEach((agentName) => {
      expect(extractAgentArticle(registry, agentName)).toContain('设计草案');
      expect(extractAgentArticle(registry, agentName)).not.toContain('样板优先');
    });

    const agentArticles = registry.match(/<article[\s\S]*?<\/article>/g) || [];
    expect(agentArticles).toHaveLength(4);
    expect(agentArticles.filter((article) => article.includes('样板优先'))).toHaveLength(2);
    expect(agentArticles.filter((article) => article.includes('设计草案'))).toHaveLength(2);
  });
});
