/**
 * QA Lab 工具函数
 */

import type { EventListenerRecord } from './types';

/**
 * HTML转义
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 显示Toast提示
 */
export function showToast(type: 'success' | 'error' | 'info' | 'warning', title: string, desc?: string): void {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `qalab-toast ${type}`;
    
    const iconMap = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        info: 'fa-circle-info',
        warning: 'fa-triangle-exclamation'
    };
    
    const icon = iconMap[type] || 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i><div><strong>${escapeHtml(title)}</strong>${desc ? '<br><span style="font-size:11px;color:var(--text3)">' + escapeHtml(desc) + '</span>' : ''}</div>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        toast.style.transition = 'all .4s';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

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
