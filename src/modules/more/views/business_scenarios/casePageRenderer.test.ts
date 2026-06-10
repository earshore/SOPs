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
});
