// src/common/components/TransitionLoader.ts
// ================================================================
// 🎯 韧性转场加载组件 (Easter Egg Version)
// 提供基于共享元素演变与彩蛋文案的高阶加载体验
// ================================================================

import { setSafeHtml } from '@/common/utils/security';

const TRANSITION_SVG_TEMPLATE = `
<svg width="100%" height="100%" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" class="transition-svg">
  <style>
    .transition-svg { display: block; margin: auto; max-width: 400px; }
    
    /* 1. Container Morphing */
    .main-container {
      fill: var(--color-bg-tertiary, #f1f5f9);
      animation: container-morph 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    @keyframes container-morph {
      0%, 100% { x: 160; y: 160; width: 80; height: 80; rx: 40; }
      20%, 80% { x: 20; y: 20; width: 360; height: 360; rx: 20; }
    }

    /* 2. Content Lines */
    .content-line {
      fill: var(--color-bg-tertiary, #f1f5f9);
      opacity: 0.6;
      animation: line-pulse 2s ease-in-out infinite;
    }

    @keyframes line-pulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }

    /* 3. Shimmer Effect */
    .shimmer {
      fill: url(#shimmer-grad);
      animation: shimmer-move 2s linear infinite;
    }

    @keyframes shimmer-move {
      from { transform: translateX(-400px); }
      to { transform: translateX(400px); }
    }

    /* 4. Easter Egg Text */
    .egg-text {
      fill: var(--color-primary, #0ea5e9);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 500;
      opacity: 0;
      pointer-events: none;
      animation: egg-fade 16s linear infinite;
    }

    @keyframes egg-fade {
      0%, 25%, 100% { opacity: 0; transform: translateY(5px); }
      5%, 20% { opacity: 0.8; transform: translateY(0); }
    }

    .msg-1 { animation-delay: 0s; }
    .msg-2 { animation-delay: 4s; }
    .msg-3 { animation-delay: 8s; }
    .msg-4 { animation-delay: 12s; }

    .progress-bar-inner {
      transform-box: fill-box;
      transform-origin: left center;
      animation: progress-sweep 3s ease-in-out infinite;
    }

    @keyframes progress-sweep {
      0% { transform: translateX(0) scaleX(0.08); }
      50% { transform: translateX(0) scaleX(1); }
      100% { transform: translateX(100px) scaleX(0.08); }
    }

    /* Disable animations if requested */
    [data-animations='disabled'] .main-container,
    [data-animations='disabled'] .content-line,
    [data-animations='disabled'] .shimmer,
    [data-animations='disabled'] .egg-text,
    [data-animations='disabled'] .progress-bar-inner {
      animation: none !important;
      opacity: 0.7 !important;
    }
  </style>

  <defs>
    <linearGradient id="shimmer-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="transparent" />
      <stop offset="50%" stop-color="white" stop-opacity="0.15" />
      <stop offset="100%" stop-color="transparent" />
    </linearGradient>
    <clipPath id="container-clip">
       <rect class="main-container" />
    </clipPath>
  </defs>

  <rect class="main-container" />

  <g clip-path="url(#container-clip)">
    <rect class="shimmer" width="800" height="400" />
  </g>

  <g transform="translate(60, 80)">
    <rect class="content-line" x="0" y="0" width="100" height="12" rx="6" style="animation-delay: 0.2s" />
    <rect class="content-line" x="0" y="30" width="280" height="8" rx="4" style="animation-delay: 0.4s" />
    <rect class="content-line" x="0" y="50" width="220" height="8" rx="4" style="animation-delay: 0.6s" />
    <rect class="content-line" x="0" y="90" width="280" height="180" rx="12" style="animation-delay: 0.2s" />
  </g>

  <g transform="translate(200, 350)">
    <text class="egg-text msg-1" text-anchor="middle">正在捕捉逃跑的代码行...</text>
    <text class="egg-text msg-2" text-anchor="middle">正在给服务器喂咖啡...</text>
    <text class="egg-text msg-3" text-anchor="middle">正在说服数据保持冷静...</text>
    <text class="egg-text msg-4" text-anchor="middle">正在搬运像素点，请稍候...</text>
  </g>
  
  <rect x="150" y="365" width="100" height="2" rx="1" fill="var(--color-bg-tertiary, #f1f5f9)" />
  <rect class="progress-bar-inner" x="150" y="365" width="100" height="2" rx="1" fill="var(--color-primary, #0ea5e9)" />
</svg>
`;

/**
 * 转场加载器
 */
export class TransitionLoader {
  /**
   * 生成转场动画 DOM 结构
   */
  static render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'transition-loader-wrapper';

    // 静态模板经项目安全工具净化后插入，确保即时渲染且不引入不受信任内容。
    setSafeHtml(container, TRANSITION_SVG_TEMPLATE);

    return container;
  }
}
