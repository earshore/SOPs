/**
 * Web Worker for heavy keyword matching and text analysis
 */

self.onmessage = function(e) {
    const { action, payload } = e.data;

    switch(action) {
        case 'ANALYZE_KEYWORDS':
            const { text, keywords, options } = payload;
            const result = analyzeMatching(text, keywords, options);
            self.postMessage({ action: 'ANALYZE_KEYWORDS_RESULT', payload: result });
            break;
        case 'CALCULATE_FREQUENCY':
            const freq = calculateFrequency(payload.text);
            self.postMessage({ action: 'CALCULATE_FREQUENCY_RESULT', payload: freq });
            break;
    }
};

function analyzeMatching(text, keywords, options = {}) {
    if (!text || !keywords || keywords.length === 0) {
        return { matched: [], unmatched: [] };
    }

    const matched = [];
    const unmatched = [];
    const lowerText = text.toLowerCase();

    keywords.forEach(kw => {
        const lowerKw = kw.toLowerCase();
        // Simple matching logic for now
        const regex = new RegExp(escapeRegex(lowerKw), 'gi');
        const matches = text.match(regex);
        
        if (matches && matches.length > 0) {
            matched.push({
                keyword: kw,
                count: matches.length
            });
        } else {
            unmatched.push(kw);
        }
    });

    return { matched, unmatched };
}

function calculateFrequency(text) {
    if (!text) return [];
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const freqMap = {};
    
    words.forEach(w => {
        if (w.length > 2) { // Only words longer than 2 chars
            freqMap[w] = (freqMap[w] || 0) + 1;
        }
    });

    return Object.entries(freqMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
