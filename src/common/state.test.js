import { describe, it, expect, vi, beforeEach } from 'vitest';
import state, { subscribe, batchUpdate } from './state.js';

describe('state (Proxy)', () => {
    beforeEach(() => {
        // Reset some state for testing
        state.ui.currentTab = 'scraper';
    });

    it('should get values from namespaces', () => {
        expect(state.ui.currentTab).toBe('scraper');
    });

    it('should get values via legacy fallback', () => {
        // currentTab is actually state.ui.currentTab
        expect(state.currentTab).toBe('scraper');
    });

    it('should set values in namespaces and notify subscribers', () => {
        const callback = vi.fn();
        subscribe('ui.currentTab', callback);
        
        state.ui.currentTab = 'home';
        
        expect(state.ui.currentTab).toBe('home');
        expect(callback).toHaveBeenCalledWith('home', 'scraper');
    });

    it('should set values via legacy fallback and notify subscribers', () => {
        const callback = vi.fn();
        subscribe('currentTab', callback);
        
        state.currentTab = 'home';
        
        expect(state.ui.currentTab).toBe('home');
        expect(callback).toHaveBeenCalledWith('home', 'scraper');
    });

    it('should handle batch updates', () => {
        const tabCallback = vi.fn();
        const scrapingCallback = vi.fn();
        
        subscribe('currentTab', tabCallback);
        subscribe('isScraping', scrapingCallback);
        
        batchUpdate({
            currentTab: 'analysis',
            isScraping: true
        });
        
        expect(state.ui.currentTab).toBe('analysis');
        expect(state.scraper.isScraping).toBe(true);
        expect(tabCallback).toHaveBeenCalledWith('analysis', 'scraper');
        expect(scrapingCallback).toHaveBeenCalledWith(true, false);
    });

    it('should warn when setting non-existent property', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        
        state.nonExistentProp = 'foo';
        
        expect(state.nonExistentProp).toBe('foo');
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
    });
});
