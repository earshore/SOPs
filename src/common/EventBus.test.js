import { describe, it, expect, vi } from 'vitest';
import eventBus from './EventBus.js';

describe('EventBus', () => {
    it('should register and trigger events', () => {
        const callback = vi.fn();
        eventBus.on('test-event', callback);
        
        eventBus.emit('test-event', { foo: 'bar' });
        
        expect(callback).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('should handle multiple listeners for the same event', () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        
        eventBus.on('multi-event', callback1);
        eventBus.on('multi-event', callback2);
        
        eventBus.emit('multi-event', 'data');
        
        expect(callback1).toHaveBeenCalledWith('data');
        expect(callback2).toHaveBeenCalledWith('data');
    });

    it('should unsubscribe from events', () => {
        const callback = vi.fn();
        const unsubscribe = eventBus.on('unsub-event', callback);
        
        unsubscribe();
        eventBus.emit('unsub-event', 'data');
        
        expect(callback).not.toHaveBeenCalled();
    });

    it('should unsubscribe using off', () => {
        const callback = vi.fn();
        eventBus.on('off-event', callback);
        eventBus.off('off-event', callback);
        
        eventBus.emit('off-event', 'data');
        
        expect(callback).not.toHaveBeenCalled();
    });

    it('should catch errors in listeners and continue', () => {
        const errorCallback = () => { throw new Error('Test Error'); };
        const successCallback = vi.fn();
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        eventBus.on('error-event', errorCallback);
        eventBus.on('error-event', successCallback);
        
        eventBus.emit('error-event', 'data');
        
        expect(successCallback).toHaveBeenCalledWith('data');
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
    });
});
