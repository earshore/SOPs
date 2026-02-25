/**
 * QA Lab 状态管理
 * 
 * ⚠️ 此文件已废弃，状态已迁移到 Zustand
 * 新代码请使用: import { appStore } from '@/stores/useAppStore'
 * 
 * 迁移指南:
 * - 读取状态: appStore.getState().qalab.currentLang
 * - 更新状态: appStore.getState().setQALabLang('en')
 */

import { appStore } from '@/stores/useAppStore';
import type { QA } from './qaData';
import { EventManager } from './utils';
import type { RufusMode } from './rufusSimulator';

/**
 * @deprecated 使用 appStore.getState().qalab 代替
 */
export class QALabState {
    get currentLang(): string {
        return appStore.getState().qalab.currentLang;
    }
    set currentLang(value: string) {
        appStore.getState().setQALabLang(value);
    }

    get currentCategory(): string {
        return appStore.getState().qalab.currentCategory;
    }
    set currentCategory(value: string) {
        appStore.getState().setQALabCategory(value);
    }

    get allExpanded(): boolean {
        return appStore.getState().qalab.allExpanded;
    }
    set allExpanded(value: boolean) {
        appStore.getState().setQALabAllExpanded(value);
    }

    get reportData(): any {
        return appStore.getState().qalab.reportData;
    }
    set reportData(value: any) {
        appStore.getState().setQALabReportData(value);
    }

    get generatedQAs(): QA[] {
        return appStore.getState().qalab.generatedQAs;
    }
    set generatedQAs(value: QA[]) {
        appStore.getState().setQALabGeneratedQAs(value);
    }

    registeredActions: string[] = [];
    dataUpdateHandler: (() => void) | null = null;
    eventManager: EventManager = new EventManager();
    
    get rufusMessages() {
        return appStore.getState().qalab.rufusMessages;
    }
    
    get rufusThinking(): boolean {
        return appStore.getState().qalab.rufusThinking;
    }
    set rufusThinking(value: boolean) {
        appStore.getState().setRufusThinking(value);
    }

    get rufusMode(): RufusMode {
        return appStore.getState().qalab.rufusMode;
    }
    set rufusMode(value: RufusMode) {
        appStore.getState().setRufusMode(value);
    }

    reset(): void {
        appStore.getState().resetQALab();
        this.dataUpdateHandler = null;
    }

    cleanup(): void {
        this.eventManager.cleanup();
        this.reset();
    }
}

/**
 * @deprecated 使用 appStore.getState().qalab 代替
 */
export const qalabState = new QALabState();
