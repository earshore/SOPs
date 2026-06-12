import { beforeEach, describe, expect, it, vi } from 'vitest';
import eventBus from '../../../../../../common/EventBus';
import { APP_EVENTS, MODULE_EVENTS } from '../../../../../../common/constants/eventConstants';
import { showToast } from '../../../../../../common/ui';
import { HistoryService } from '../../services/historyService';
import { handleImportFiles } from './importHandler';
import type { ScrapedData, ScraperSite } from '../types';

vi.mock('../../services/historyService', () => ({
    HistoryService: {
        saveAsync: vi.fn()
    }
}));

vi.mock('../../../../../../common/ui', () => ({
    showToast: vi.fn()
}));

vi.mock('../../../../../../common/EventBus', () => ({
    default: {
        emit: vi.fn()
    }
}));

function createImportData(marketplace: string): ScrapedData {
    return {
        metadata: {
            scrape_timestamp: '2026-01-01T00:00:00.000Z',
            marketplace,
            domain: 'amazon.fr',
            language: 'French',
            total_asins: 1
        },
        products: [
            {
                asin: 'B0TEST0001',
                url: 'https://example.test/dp/B0TEST0001',
                language: 'French',
                productTitle: 'Imported product',
                feature_bullets: ['Feature'],
                customer_reviews: [],
                scrape_status: 'success',
                error: ''
            }
        ]
    };
}

function createImportFile(data: ScrapedData): File {
    return new File([JSON.stringify(data)], 'import.json', { type: 'application/json' });
}

describe('handleImportFiles', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(HistoryService.saveAsync).mockResolvedValue([]);
    });

    it('uses the imported marketplace for a single-site file', async () => {
        const selectedSite: ScraperSite = 'DE';
        const result = await handleImportFiles([createImportFile(createImportData('FR'))], null, selectedSite);

        expect(result.success).toBe(true);
        expect(result.data?.metadata?.marketplace).toBe('FR');
        expect(result.data?.metadata?.domain).toBe('amazon.fr');
        expect(result.data?.products).toHaveLength(1);
        expect(HistoryService.saveAsync).toHaveBeenCalledWith(result.data);
        expect(eventBus.emit).toHaveBeenCalledWith(MODULE_EVENTS.SCRAPER.SCRAPE_SUCCESS, result.data);
        expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.DATA_UPDATED);
        expect(eventBus.emit).toHaveBeenCalledWith(APP_EVENTS.HISTORY_UPDATED);
        expect(showToast).toHaveBeenCalledWith(
            '成功导入并合并 1 个ASIN (基准站点: FR)',
            { type: 'success' }
        );
    });
});
