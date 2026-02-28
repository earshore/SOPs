/**
 * QA Lab 常量定义
 */

export interface Language {
    code: string;
    flag: string;
    name: string;
    label: string;
}

export interface Category {
    id: string;
    label: string;
    icon: string;
}

export const LANGUAGES: Language[] = [
    { code: 'de', flag: '🇩🇪', name: 'Deutsch', label: 'DE' },
    { code: 'en', flag: '🇬🇧', name: 'English', label: 'EN' },
    { code: 'fr', flag: '🇫🇷', name: 'Français', label: 'FR' },
    { code: 'it', flag: '🇮🇹', name: 'Italiano', label: 'IT' },
    { code: 'es', flag: '🇪🇸', name: 'Español', label: 'ES' },
    { code: 'nl', flag: '🇳🇱', name: 'Nederlands', label: 'NL' },
    { code: 'sv', flag: '🇸🇪', name: 'Svenska', label: 'SV' },
    { code: 'pl', flag: '🇵🇱', name: 'Polski', label: 'PL' },
    { code: 'be', flag: '🇧🇪', name: 'Belgique', label: 'BE' },
    { code: 'ie', flag: '🇮🇪', name: 'Ireland', label: 'IE' }
];

export const CATEGORIES: Category[] = [
    { id: 'all', label: '全部', icon: 'fa-solid fa-layer-group' },
    { id: 'performance', label: '性能表现', icon: 'fa-solid fa-gauge-high' },
    { id: 'feature', label: '产品特性', icon: 'fa-solid fa-star' },
    { id: 'scenario', label: '使用场景', icon: 'fa-solid fa-location-dot' },
    { id: 'trust', label: '信任决策', icon: 'fa-solid fa-shield-halved' },
    { id: 'safety', label: '安全品质', icon: 'fa-solid fa-heart-pulse' },
    { id: 'gift', label: '送礼相关', icon: 'fa-solid fa-gift' }
];

export const MARKET_LANG_MAP: Record<string, string> = {
    'DE': 'de',
    'UK': 'en',
    'GB': 'en',
    'FR': 'fr',
    'IT': 'it',
    'ES': 'es',
    'NL': 'nl',
    'SE': 'sv',
    'PL': 'pl',
    'BE': 'be',
    'IE': 'ie',
    'US': 'en'
};
