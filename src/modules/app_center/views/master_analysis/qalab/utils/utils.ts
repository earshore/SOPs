/**
 * QA Lab 工具函数
 * 已迁移到新架构：移除 escapeHtml（使用 SafeRenderer）和 delay（使用原生 Promise）
 * Toast 功能已迁移到全局 notifications 系统
 */

import type { EventListenerRecord } from '../types';

/**
 * 下载文件
 */
export function downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 事件监听器管理器
 */
export class EventManager {
    private listeners: EventListenerRecord[] = [];
    private timeouts: number[] = [];

    addEventListener(element: HTMLElement | Document | Window, event: string, handler: EventListenerOrEventListenerObject): void {
        element.addEventListener(event, handler);
        this.listeners.push({ element: element as any, event, handler });
    }

    addTimeout(callback: () => void, delay: number): number {
        const id = window.setTimeout(callback, delay);
        this.timeouts.push(id);
        return id;
    }

    cleanup(): void {
        this.listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.listeners = [];

        this.timeouts.forEach(id => clearTimeout(id));
        this.timeouts = [];
    }

    getListeners(): EventListenerRecord[] {
        return this.listeners;
    }

    getTimeouts(): number[] {
        return this.timeouts;
    }
}

