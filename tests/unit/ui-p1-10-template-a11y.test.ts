import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  mount as mountPromoTools,
  unmount as unmountPromoTools,
} from '@/modules/amz_hub/views/practice/promo_tools';

const readTemplate = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

afterEach(() => {
  unmountPromoTools();
  document.body.replaceChildren();
});

  it('keeps the PPC action table named, described, and column-scoped', () => {
    const html = readTemplate(
      'src/modules/app_center/views/ppc_tools/ppc_search_terms/template.html'
    );

    expect(html).toContain('id="ppc-results-title"');
    expect(html).toContain('id="ppc-table-wrapper"');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-labelledby="ppc-results-title"');
    expect(html).toContain('aria-describedby="ppc-result-count ppc-table-help"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('id="ppc-table-help"');
    expect(html).toContain('表格支持横向滚动');
    expect(html).toContain('<caption class="sr-only">');
    expect(html).toContain('PPC 搜索词动作清单');

    const scopedHeaders = html.match(/<th\b[^>]*\bscope="col"/g) ?? [];
    expect(scopedHeaders).toHaveLength(9);
  });

  it('keeps the NPI lifecycle table named, described, and grouped', () => {
    const html = readTemplate('src/modules/sops/views/growth/npi_tracker/template.html');

    expect(html).toContain('id="npi-lifecycle-table-title"');
    expect(html).toContain('id="npi-lifecycle-table-help"');
    expect(html).toContain('表格支持横向滚动');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-labelledby="npi-lifecycle-table-title"');
    expect(html).toContain('aria-describedby="npi-lifecycle-table-help"');
    expect(html).toContain('id="npi-lifecycle-table"');
    expect(html).toContain('<caption class="sr-only">新品生命周期跟踪明细表</caption>');

    const tableStart = html.indexOf('id="npi-lifecycle-table"');
    const tableBodyStart = html.indexOf('<tbody class="divide-y divide-slate-100"', tableStart);
    const tableHeadHtml = html.slice(tableStart, tableBodyStart);
    const colgroupHeaders = tableHeadHtml.match(/<th\b[^>]*\bscope="colgroup"/g) ?? [];
    const columnHeaders =
      tableHeadHtml.match(/<th\b(?![^>]*\bscope="colgroup")[^>]*\bscope="col"/g) ?? [];

    expect(colgroupHeaders).toHaveLength(5);
    expect(columnHeaders).toHaveLength(29);
  });

  it('keeps NPI supporting rule tables named, described, and column-scoped', () => {
    const html = readTemplate('src/modules/sops/views/growth/npi_tracker/template.html');

    expect(html).toContain('id="npi-stage-rules-table-title"');
    expect(html).toContain('id="npi-stage-rules-table-help"');
    expect(html).toContain('id="npi-stage-rules-table-wrapper"');
    expect(html).toContain('aria-labelledby="npi-stage-rules-table-title"');
    expect(html).toContain('aria-describedby="npi-stage-rules-table-help"');
    expect(html).toContain('id="npi-stage-rules-table"');
    expect(html).toContain('<caption class="sr-only">新品阶段升降级规则速查表</caption>');

    expect(html).toContain('id="npi-review-archive-table-title"');
    expect(html).toContain('id="npi-review-archive-table-help"');
    expect(html).toContain('id="npi-review-archive-table-wrapper"');
    expect(html).toContain('aria-labelledby="npi-review-archive-table-title"');
    expect(html).toContain('aria-describedby="npi-review-archive-table-help"');
    expect(html).toContain('id="npi-review-archive-table"');
    expect(html).toContain('<caption class="sr-only">SKU 复盘归档模板</caption>');

    const stageTableStart = html.indexOf('id="npi-stage-rules-table"');
    const stageTableEnd = html.indexOf('</table>', stageTableStart);
    const archiveTableStart = html.indexOf('id="npi-review-archive-table"');
    const archiveTableEnd = html.indexOf('</table>', archiveTableStart);
    const stageTableHtml = html.slice(stageTableStart, stageTableEnd);
    const archiveTableHtml = html.slice(archiveTableStart, archiveTableEnd);

    expect(stageTableHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(4);
    expect(archiveTableHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(3);
  });

  it('keeps Restricted Words lookup tables named and column-scoped', () => {
    const html = readTemplate('src/modules/sops/views/growth/restricted_words/template.html');

    expect(html).toContain('id="rw-multilingual-title"');
    expect(html).toContain('id="rw-multilingual-description"');
    expect(html).toContain('aria-describedby="rw-multilingual-description"');
    expect(html).toContain('<caption class="sr-only">多语言高危词对照表</caption>');
    expect(html).toContain('id="rw-results-title"');
    expect(html).toContain('id="rw-results-description"');
    expect(html).toContain('id="rw-results-table-help"');
    expect(html).toContain('id="rw-results-table-wrapper"');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-labelledby="rw-results-title"');
    expect(html).toContain(
      'aria-describedby="rw-results-description rw-results-table-help rw-stats-display"'
    );
    expect(html).toContain('id="rw-results-table"');
    expect(html).toContain('<caption class="sr-only">完整高危词条检索结果表</caption>');
    expect(html).toContain('aria-describedby="rw-results-description rw-results-table-help"');
    expect(html).toContain('表格支持横向滚动');
    expect(html).toContain('id="rw-alternatives-title"');
    expect(html).toContain('id="rw-alternatives-description"');
    expect(html).toContain('aria-describedby="rw-alternatives-description"');
    expect(html).toContain('<caption class="sr-only">高危词安全替代词速查表</caption>');

    const multilingualStart = html.indexOf('id="rw-multilingual-title"');
    const resultsStart = html.indexOf('id="rw-results-title"');
    const alternativesStart = html.indexOf('id="rw-alternatives-title"');
    const multilingualHtml = html.slice(multilingualStart, resultsStart);
    const resultsHtml = html.slice(resultsStart, alternativesStart);
    const alternativesHtml = html.slice(alternativesStart, html.indexOf('<!-- ========== 已上架Listing紧急排查', alternativesStart));

    expect(multilingualHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(6);
    expect(resultsHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(6);
    expect(alternativesHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(3);
  });

  it('keeps PPC Advertising long-page tables named, described, and column-scoped', () => {
    const html = readTemplate('src/modules/sops/views/growth/ppc_advertising/template.html');

    expect(html).toContain('id="ppc-stage-goals-table-title"');
    expect(html).toContain('id="ppc-stage-goals-table-help"');
    expect(html).toContain('id="ppc-stage-goals-table-wrapper"');
    expect(html).toContain('aria-labelledby="ppc-stage-goals-table-title"');
    expect(html).toContain('aria-describedby="ppc-stage-goals-table-help"');
    expect(html).toContain('<caption class="sr-only">PPC 分阶段目标表</caption>');

    expect(html).toContain('id="ppc-bid-rules-table-title"');
    expect(html).toContain('id="ppc-bid-rules-table-help"');
    expect(html).toContain('id="ppc-bid-rules-table-wrapper"');
    expect(html).toContain('aria-labelledby="ppc-bid-rules-table-title"');
    expect(html).toContain('aria-describedby="ppc-bid-rules-table-help"');
    expect(html).toContain('<caption class="sr-only">PPC 出价调整规则表</caption>');

    expect(html).toContain('id="ppc-weekly-fields-table-title"');
    expect(html).toContain('id="ppc-weekly-fields-table-help"');
    expect(html).toContain('id="ppc-weekly-fields-table-wrapper"');
    expect(html).toContain('aria-labelledby="ppc-weekly-fields-table-title"');
    expect(html).toContain('aria-describedby="ppc-weekly-fields-table-help"');
    expect(html).toContain('<caption class="sr-only">PPC 周度数据追踪字段表</caption>');

    const stageTableStart = html.indexOf('id="ppc-stage-goals-table"');
    const bidTableStart = html.indexOf('id="ppc-bid-rules-table"');
    const weeklyTableStart = html.indexOf('id="ppc-weekly-fields-table"');
    const stageTableHtml = html.slice(stageTableStart, html.indexOf('</table>', stageTableStart));
    const bidTableHtml = html.slice(bidTableStart, html.indexOf('</table>', bidTableStart));
    const weeklyTableHtml = html.slice(weeklyTableStart, html.indexOf('</table>', weeklyTableStart));

    expect(stageTableHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(7);
    expect(bidTableHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(5);
    expect(weeklyTableHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(2);
    expect(stageTableHtml.match(/<th\b[^>]*\bscope="row"/g) ?? []).toHaveLength(4);
    expect(bidTableHtml.match(/<th\b[^>]*\bscope="row"/g) ?? []).toHaveLength(6);
    expect(weeklyTableHtml.match(/<th\b[^>]*\bscope="row"/g) ?? []).toHaveLength(10);
  });

  it('keeps Email Templates long-page tables named, described, and scoped', () => {
    const html = readTemplate('src/modules/sops/views/service/email_templates/template.html');

    expect(html).toContain('id="email-priority-matrix-title"');
    expect(html).toContain('id="email-priority-matrix-description"');
    expect(html).toContain('id="email-priority-matrix-wrapper"');
    expect(html).toContain('<caption class="sr-only">消息分级响应矩阵</caption>');

    expect(html).toContain('id="email-phrase-table-title"');
    expect(html).toContain('id="email-phrase-table-description"');
    expect(html).toContain('id="email-phrase-table-wrapper"');
    expect(html).toContain('<caption class="sr-only">五语高频短语速查表</caption>');

    expect(html).toContain('id="email-refund-matrix-title"');
    expect(html).toContain('id="email-refund-matrix-description"');
    expect(html).toContain('id="email-refund-matrix-wrapper"');
    expect(html).toContain('<caption class="sr-only">退款决策速查矩阵</caption>');

    const priorityStart = html.indexOf('id="email-priority-matrix-table"');
    const phraseStart = html.indexOf('id="email-phrase-table"');
    const refundStart = html.indexOf('id="email-refund-matrix-table"');
    const priorityHtml = html.slice(priorityStart, html.indexOf('</table>', priorityStart));
    const phraseHtml = html.slice(phraseStart, html.indexOf('</table>', phraseStart));
    const refundHtml = html.slice(refundStart, html.indexOf('</table>', refundStart));

    expect(priorityHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(5);
    expect(priorityHtml.match(/<th\b[^>]*\bscope="row"/g) ?? []).toHaveLength(4);
    expect(phraseHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(6);
    expect(phraseHtml.match(/<th\b[^>]*\bscope="row"/g) ?? []).toHaveLength(9);
    expect(refundHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(4);
    expect(refundHtml.match(/<th\b[^>]*\bscope="row"/g) ?? []).toHaveLength(4);
  });

  it('keeps QA Maintenance long-page tables named, described, and scoped', () => {
    const html = readTemplate('src/modules/sops/views/service/qa_maintenance/template.html');

    expect(html).toContain('id="qa-tracking-fields-title"');
    expect(html).toContain('id="qa-tracking-fields-description"');
    expect(html).toContain('id="qa-tracking-fields-wrapper"');
    expect(html).toContain('<caption class="sr-only">QA 管理追踪字段表</caption>');

    expect(html).toContain('id="qa-baseline-table-title"');
    expect(html).toContain('id="qa-baseline-table-description"');
    expect(html).toContain('id="qa-baseline-table-wrapper"');
    expect(html).toContain('<caption class="sr-only">QA 数量建设基准线表</caption>');

    const trackingStart = html.indexOf('id="qa-tracking-fields-table"');
    const baselineStart = html.indexOf('id="qa-baseline-table"');
    const trackingHtml = html.slice(trackingStart, html.indexOf('</table>', trackingStart));
    const baselineHtml = html.slice(baselineStart, html.indexOf('</table>', baselineStart));

    expect(trackingHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(3);
    expect(trackingHtml.match(/<th\b[^>]*\bscope="row"/g) ?? []).toHaveLength(9);
    expect(baselineHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(5);
    expect(baselineHtml.match(/<th\b[^>]*\bscope="row"/g) ?? []).toHaveLength(3);
  });

  it('keeps AMZ Quality horizontal formula regions named and described', () => {
    const html = readTemplate('src/modules/amz_hub/views/practice/quality_listing/template.html');

    expect(html).toContain('id="quality-title-formula-title"');
    expect(html).toContain('id="quality-title-formula-description"');
    expect(html).toContain('id="quality-title-formula-region"');
    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('aria-labelledby="quality-title-formula-title"');
    expect(html).toContain('aria-describedby="quality-title-formula-description"');
    expect(html).toContain('公式支持横向滚动');
    expect(html).toContain('inline-flex min-w-max items-center gap-2 flex-nowrap');

    expect(html).toContain('id="quality-bullet-formula-title"');
    expect(html).toContain('id="quality-bullet-formula-description"');
    expect(html).toContain('id="quality-bullet-formula-region"');
    expect(html).toContain('aria-labelledby="quality-bullet-formula-title"');
    expect(html).toContain('aria-describedby="quality-bullet-formula-description"');
    expect(html).toContain('inline-flex min-w-max flex-nowrap items-center gap-2');
  });

  it('keeps Mature Phase advertising budget table named, described, and scoped', () => {
    const html = readTemplate('src/modules/amz_hub/views/advanced/mature_phase/template.html');

    expect(html).toContain('id="mature-ad-budget-table-title"');
    expect(html).toContain('id="mature-ad-budget-table-help"');
    expect(html).toContain('id="mature-ad-budget-table-wrapper"');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-labelledby="mature-ad-budget-table-title"');
    expect(html).toContain('aria-describedby="mature-ad-budget-table-help"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('id="mature-ad-budget-table"');
    expect(html).toContain('min-w-[720px]');
    expect(html).toContain('<caption class="sr-only">成熟期广告预算再分配表</caption>');

    const tableStart = html.indexOf('id="mature-ad-budget-table"');
    const tableHtml = html.slice(tableStart, html.indexOf('</table>', tableStart));

    expect(tableHtml.match(/<th\b[^>]*\bscope="col"/g) ?? []).toHaveLength(4);
    expect(tableHtml.match(/<th\b[^>]*\bscope="row"/g) ?? []).toHaveLength(5);
  });

  it('keeps New Product 30 Days prompt examples resilient to long content', () => {
    const html = readTemplate('src/modules/amz_hub/views/advanced/new_product_30days/template.html');
    const css = readTemplate('src/modules/amz_hub/views/advanced/new_product_30days/styles.css');

    expect(html.match(/np30_prompt_block/g) ?? []).toHaveLength(2);
    expect(css).toContain('.np30_prompt_block');
    expect(css).toContain('overflow-x: auto');
    expect(css).toContain('overflow-wrap: anywhere');
  });

  it('keeps Promo Tools dynamic comparison tables named, described, and scoped', async () => {
    const container = document.createElement('main');
    document.body.append(container);

    await mountPromoTools(container);

    const wrappers = Array.from(container.querySelectorAll<HTMLElement>('.amzpt_table_wrapper'));
    const tables = Array.from(container.querySelectorAll<HTMLTableElement>('.amzpt_table'));

    expect(wrappers).toHaveLength(3);
    expect(tables).toHaveLength(3);

    wrappers.forEach(wrapper => {
      const descriptionId = wrapper.getAttribute('aria-describedby');

      expect(wrapper.getAttribute('role')).toBe('region');
      expect(wrapper.getAttribute('aria-label')).toContain('对比表');
      expect(wrapper.getAttribute('tabindex')).toBe('0');
      expect(descriptionId).toBeTruthy();
      expect(container.querySelector(`#${descriptionId}`)?.textContent).toContain('横向滚动');
    });

    tables.forEach(table => {
      expect(table.querySelector('caption')?.textContent).toContain('对比表');
      expect(Array.from(table.querySelectorAll('thead th')).every(th => th.scope === 'col')).toBe(
        true
      );
      expect(
        Array.from(table.querySelectorAll('tbody tr')).every(row =>
          row.querySelector('th[scope="row"]')
        )
      ).toBe(true);
    });
  });
