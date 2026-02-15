/**
 * QA Lab 状态管理
 */

import type { QA } from './qaData';
import { EventManager } from './utils';

export class QALabState {
    currentLang: string = 'de';
    currentCategory: string = 'all';
    allExpanded: boolean = false;
    reportData: any = null;
    generatedQAs: QA[] = [];
    registeredActions: string[] = [];
    dataUpdateHandler: (() => void) | null = null;
    eventManager: EventManager = new EventManager();

    reset(): void {
        this.currentLang = 'de';
        this.currentCategory = 'all';
        this.allExpanded = false;
        this.reportData = null;
        this.generatedQAs = [];
        this.dataUpdateHandler = null;
    }

    cleanup(): void {
        this.eventManager.cleanup();
        this.reset();
    }
}

export const qalabState = new QALabState();
