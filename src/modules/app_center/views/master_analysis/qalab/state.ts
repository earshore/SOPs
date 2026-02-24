/**
 * QA Lab 状态管理
 */

import type { QA } from './qaData';
import { EventManager } from './utils';
import type { RufusMode } from './rufusSimulator';

export class QALabState {
    currentLang: string = 'de';
    currentCategory: string = 'all';
    allExpanded: boolean = false;
    reportData: any = null;
    generatedQAs: QA[] = [];
    registeredActions: string[] = [];
    dataUpdateHandler: (() => void) | null = null;
    eventManager: EventManager = new EventManager();
    
    // Rufus AI 模拟器状态
    rufusMessages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }> = [];
    rufusThinking: boolean = false;
    rufusMode: RufusMode = 'ai'; // 默认 AI 模式

    reset(): void {
        this.currentLang = 'de';
        this.currentCategory = 'all';
        this.allExpanded = false;
        this.reportData = null;
        this.generatedQAs = [];
        this.dataUpdateHandler = null;
        this.rufusMessages = [];
        this.rufusThinking = false;
        this.rufusMode = 'ai';
    }

    cleanup(): void {
        this.eventManager.cleanup();
        this.reset();
    }
}

export const qalabState = new QALabState();
