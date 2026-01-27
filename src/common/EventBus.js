/**
 * Simple Event Bus for module communication
 */
class EventBus {
    constructor() {
        /** @type {Object.<string, Function[]>} */
        this.events = {};
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {function(any): void} callback - Callback function
     * @returns {function(): void} unsubscribe function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);

        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {function(any): void} callback - Callback function
     */
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {any} [data] - Data to pass to listeners
     */
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] Error in listener for event "${event}":`, error);
            }
        });
    }
}

const eventBus = new EventBus();
export default eventBus;
