/**
 * Lazy load heavy libraries to improve initial bundle size
 */

let chartJsPromise = null;
let gridStackPromise = null;

/**
 * Lazy load Chart.js
 * @returns {Promise<any>}
 */
export function loadChartJs() {
    if (window.Chart) return Promise.resolve(window.Chart);
    if (!chartJsPromise) {
        console.log("⏳ Loading Chart.js...");
        chartJsPromise = import('chart.js/auto').then(module => {
            window.Chart = module.default;
            console.log("✅ Chart.js Loaded");
            return window.Chart;
        }).catch(err => {
            console.error("Failed to load Chart.js", err);
            chartJsPromise = null; // Allow retry
            throw err;
        });
    }
    return chartJsPromise;
}

/**
 * Lazy load GridStack
 * @returns {Promise<any>}
 */
export function loadGridStack() {
    if (window.GridStack) return Promise.resolve(window.GridStack);
    if (!gridStackPromise) {
        console.log("⏳ Loading GridStack...");
        // Load CSS first
        import('gridstack/dist/gridstack.min.css');
        
        gridStackPromise = import('gridstack').then(module => {
            window.GridStack = module.GridStack;
            console.log("✅ GridStack Loaded");
            return window.GridStack;
        }).catch(err => {
            console.error("Failed to load GridStack", err);
            gridStackPromise = null;
            throw err;
        });
    }
    return gridStackPromise;
}
