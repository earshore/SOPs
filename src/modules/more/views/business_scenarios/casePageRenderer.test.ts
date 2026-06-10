import { describe, expect, it } from 'vitest';
import { renderBusinessScenarioPage } from './casePageRenderer';

describe('renderBusinessScenarioPage', () => {
    it('uses the generated scenario hero without leaking legacy welcome banners', () => {
        const html = renderBusinessScenarioPage(
            `
                <div class="module-container py-6">
                    <div class="wb-container wb-container--simple">
                        <h1>Legacy banner</h1>
                    </div>
                    <section>Legacy body</section>
                </div>
            `,
            'bad_review_response',
        );

        expect(html).toContain('<div class="module-container py-6">');
        expect(html.match(/class="zn-hero"/g)).toHaveLength(1);
        expect(html).not.toContain('wb-container');
        expect(html).not.toContain('Legacy banner');
    });

    it('keeps the module container when loadTemplate has wrapped the template', () => {
        const html = renderBusinessScenarioPage(
            `
                <div class="view-fade-in-initial view-fade-in">
                    <div class="module-container py-6">
                        <section>Legacy body</section>
                    </div>
                </div>
            `,
            'bad_review_response',
        );

        expect(html).toContain('<div class="view-fade-in-initial view-fade-in">\n<div class="module-container py-6">');
        expect(html.match(/class="module-container py-6"/g)).toHaveLength(1);
        expect(html.match(/class="ziniao-case-shell"/g)).toHaveLength(1);
    });
});
