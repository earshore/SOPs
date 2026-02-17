/**
 * QA Lab 类型定义
 */

export interface EventListenerRecord {
    element: HTMLElement | Document | Window;
    event: string;
    handler: EventListenerOrEventListenerObject;
}

export interface ModuleState {
    currentLang: string;
    currentCategory: string;
    allExpanded: boolean;
    reportData: any;
    generatedQAs: any[];
    eventListeners: EventListenerRecord[];
    timeouts: number[];
    registeredActions: string[];
    dataUpdateHandler: (() => void) | null;
}
