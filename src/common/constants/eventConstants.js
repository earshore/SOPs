/**
 * eventConstants.js
 * 
 * Centralized registry for all global EventBus events.
 * 
 * @example
 * import { EVENTS } from '.../common/constants/eventConstants.js';
 * eventBus.emit(EVENTS.SCRAPE_COMPLETE, data);
 */

export const EVENTS = {
    /**
     * Triggered when the scraper successfully finishes parsing a product.
     * Payload: {Object} scrapedData (The full product data object)
     */
    SCRAPE_COMPLETE: 'SCRAPE_COMPLETE',

    // Add future events here (e.g., 'ANALYSIS_READY', 'EXPORT_REQUESTED')
};
