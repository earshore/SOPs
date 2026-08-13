// src/common/components/TransitionLoader.ts
// ================================================================
// 企业级韧性转场加载组件
// 以“运行时上下文同步”为主题，提供深浅色适配、低噪粒子与可控动效。
// ================================================================

import { setSafeHtml } from '@/common/utils/security';

const TRANSITION_SVG_TEMPLATE = `
<svg
  width="100%"
  height="100%"
  viewBox="0 0 400 400"
  xmlns="http://www.w3.org/2000/svg"
  class="transition-svg"
  role="img"
  aria-labelledby="transition-loader-title transition-loader-description"
>
  <title id="transition-loader-title">正在准备工作台上下文</title>
  <desc id="transition-loader-description">企业工作台正在同步页面数据和布局</desc>

  <style>
    .transition-svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
      --tl-surface: var(--color-bg-secondary, #f7f9fc);
      --tl-panel: var(--color-bg-primary, #ffffff);
      --tl-panel-muted: var(--color-bg-tertiary, #e8eef5);
      --tl-border: var(--color-border-default, #cbd5e1);
      --tl-text: var(--color-text-primary, #172033);
      --tl-text-muted: var(--color-text-secondary, #526277);
      --tl-accent: var(--color-primary, #2563eb);
      --tl-accent-soft: #bfdbfe;
      --tl-accent-pale: #e0edff;
      --tl-success: #0f766e;
    }

    .dark .transition-svg,
    [data-color-mode='dark'] .transition-svg,
    [data-color-mode-resolved='dark'] .transition-svg {
      --tl-surface: #0b1220;
      --tl-panel: #16243b;
      --tl-panel-muted: #24344f;
      --tl-border: rgba(148, 163, 184, 0.38);
      --tl-text: #f1f5f9;
      --tl-text-muted: #b3c0d4;
      --tl-accent: #60a5fa;
      --tl-accent-soft: rgba(96, 165, 250, 0.28);
      --tl-accent-pale: rgba(96, 165, 250, 0.16);
      --tl-success: #5eead4;
    }

    .transition-surface {
      fill: var(--tl-surface);
      stroke: var(--tl-border);
      stroke-width: 1;
    }

    .transition-panel {
      fill: var(--tl-panel);
      stroke: var(--tl-border);
      stroke-width: 1;
    }

    .transition-panel-muted { fill: var(--tl-panel-muted); }
    .transition-border { stroke: var(--tl-border); stroke-width: 1; }
    .transition-accent { fill: var(--tl-accent); }
    .transition-accent-soft { fill: var(--tl-accent-soft); }
    .transition-accent-pale { fill: var(--tl-accent-pale); }
    .transition-text { fill: var(--tl-text); }
    .transition-text-muted { fill: var(--tl-text-muted); }
    .transition-success { fill: var(--tl-success); }

    .transition-grid-line {
      stroke: var(--tl-border);
      stroke-width: 1;
      opacity: 0.56;
    }

    .transition-circuit {
      fill: none;
      stroke: var(--tl-accent);
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-dasharray: 5 8;
      opacity: 0.54;
      animation: transition-circuit-flow 3.6s linear infinite;
    }

    .transition-orbit {
      fill: none;
      stroke: var(--tl-accent);
      stroke-width: 1;
      stroke-dasharray: 2 7;
      opacity: 0.46;
      transform-box: fill-box;
      transform-origin: center;
      animation: transition-orbit-spin 12s linear infinite;
    }

    .transition-particle {
      fill: var(--tl-accent);
      opacity: 0;
      transform-box: fill-box;
      transform-origin: center;
      animation: transition-particle-drift 4.4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
    }

    .transition-particle--2 { animation-delay: -0.7s; }
    .transition-particle--3 { animation-delay: -1.5s; }
    .transition-particle--4 { animation-delay: -2.2s; }
    .transition-particle--5 { animation-delay: -3s; }

    .transition-breath {
      transform-box: fill-box;
      transform-origin: center;
      animation: transition-breath 2.8s ease-in-out infinite;
    }

    .transition-skeleton {
      fill: var(--tl-panel-muted);
      animation: transition-skeleton-pulse 2.4s ease-in-out infinite;
    }

    .transition-skeleton--delay { animation-delay: -0.8s; }
    .transition-skeleton--late { animation-delay: -1.5s; }

    .transition-activity-dot {
      fill: var(--tl-success);
      animation: transition-status-pulse 1.8s ease-in-out infinite;
    }

    .transition-progress-track { fill: var(--tl-panel-muted); }

    .transition-progress-value {
      fill: var(--tl-accent);
      transform-box: fill-box;
      transform-origin: left center;
      animation: transition-progress-sweep 3.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
    }

    .transition-egg {
      fill: var(--tl-text-muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.2px;
      opacity: 0;
      transform-box: fill-box;
      transform-origin: center;
      animation: transition-egg-cycle 16s linear infinite;
    }

    .transition-egg--2 { animation-delay: 4s; }
    .transition-egg--3 { animation-delay: 8s; }
    .transition-egg--4 { animation-delay: 12s; }

    @keyframes transition-circuit-flow {
      to { stroke-dashoffset: -78; }
    }

    @keyframes transition-orbit-spin {
      to { transform: rotate(360deg); }
    }

    @keyframes transition-particle-drift {
      0%, 100% { opacity: 0; transform: translate(0, 9px) scale(0.82); }
      22% { opacity: 0.52; }
      56% { opacity: 0.85; transform: translate(0, -7px) scale(1); }
      78% { opacity: 0.18; }
    }

    @keyframes transition-breath {
      0%, 100% { opacity: 0.86; transform: scale(0.98); }
      50% { opacity: 1; transform: scale(1.02); }
    }

    @keyframes transition-skeleton-pulse {
      0%, 100% { opacity: 0.72; }
      50% { opacity: 1; }
    }

    @keyframes transition-status-pulse {
      0%, 100% { opacity: 0.5; transform: scale(0.85); }
      50% { opacity: 1; transform: scale(1.18); }
    }

    @keyframes transition-progress-sweep {
      0% { transform: scaleX(0.08); opacity: 0.38; }
      46% { transform: scaleX(0.74); opacity: 1; }
      74% { transform: scaleX(1); opacity: 0.86; }
      100% { transform: scaleX(0.08); opacity: 0.38; }
    }

    @keyframes transition-egg-cycle {
      0%, 25%, 100% { opacity: 0; transform: translateY(4px); }
      5%, 20% { opacity: 0.9; transform: translateY(0); }
    }

    @media (prefers-reduced-motion: reduce) {
      .transition-svg * { animation: none !important; }
      .transition-egg { opacity: 0 !important; transform: none !important; }
      .transition-egg--1 { opacity: 0.9 !important; }
      .transition-particle { opacity: 0.34 !important; }
    }

    [data-animations='disabled'] .transition-svg *,
    .no-loading-animations .transition-svg * {
      animation: none !important;
    }

    [data-animations='disabled'] .transition-egg,
    .no-loading-animations .transition-egg {
      opacity: 0 !important;
      transform: none !important;
    }

    [data-animations='disabled'] .transition-egg--1,
    .no-loading-animations .transition-egg--1 {
      opacity: 0.9 !important;
    }

    [data-animations='disabled'] .transition-particle,
    .no-loading-animations .transition-particle {
      opacity: 0.34 !important;
    }
  </style>

  <rect class="transition-surface" x="24" y="24" width="352" height="352" rx="22" />

  <g aria-hidden="true">
    <path class="transition-grid-line" d="M52 128H348M52 176H348M52 224H348M52 272H348" />
    <path class="transition-grid-line" d="M104 104V296M152 104V296M200 104V296M248 104V296M296 104V296" />
    <circle class="transition-orbit" cx="200" cy="204" r="128" />
    <path class="transition-circuit" d="M72 132H112V160H146M328 132H288V160H254M72 276H112V248H146M328 276H288V248H254" />
    <circle class="transition-particle transition-particle--1" cx="112" cy="160" r="2.4" />
    <circle class="transition-particle transition-particle--2" cx="288" cy="160" r="2.2" />
    <circle class="transition-particle transition-particle--3" cx="112" cy="248" r="2.1" />
    <circle class="transition-particle transition-particle--4" cx="288" cy="248" r="2.3" />
    <circle class="transition-particle transition-particle--5" cx="324" cy="294" r="1.8" />
  </g>

  <g class="transition-breath">
    <rect class="transition-panel" x="52" y="72" width="296" height="224" rx="14" />
    <rect class="transition-accent-soft" x="52" y="72" width="5" height="224" rx="2.5" />

    <g transform="translate(76, 96)">
      <rect class="transition-accent-pale" width="30" height="30" rx="9" />
      <path class="transition-accent" d="M9 11.5h12v2H9zm0 5h8v2H9z" />
      <circle class="transition-activity-dot" cx="22" cy="8" r="3" />
      <text class="transition-text" x="44" y="12" font-family="Inter, system-ui, sans-serif" font-size="13" font-weight="700">工作台上下文</text>
      <text class="transition-text-muted" x="44" y="27" font-family="ui-monospace, monospace" font-size="8" letter-spacing="1.2">RUNTIME SYNC</text>
    </g>

    <g transform="translate(76, 146)">
      <rect class="transition-skeleton" width="116" height="10" rx="5" />
      <rect class="transition-skeleton transition-skeleton--delay" y="20" width="208" height="7" rx="3.5" />
      <rect class="transition-skeleton transition-skeleton--late" y="35" width="164" height="7" rx="3.5" />
    </g>

    <g transform="translate(76, 205)">
      <rect class="transition-panel-muted" width="79" height="54" rx="9" />
      <rect class="transition-panel-muted" x="91" width="79" height="54" rx="9" />
      <rect class="transition-panel-muted" x="182" width="66" height="54" rx="9" />
      <rect class="transition-accent-soft" x="12" y="12" width="26" height="5" rx="2.5" />
      <rect class="transition-skeleton transition-skeleton--delay" x="12" y="26" width="48" height="6" rx="3" />
      <rect class="transition-accent-soft" x="103" y="12" width="26" height="5" rx="2.5" />
      <rect class="transition-skeleton transition-skeleton--late" x="103" y="26" width="48" height="6" rx="3" />
      <rect class="transition-accent-soft" x="194" y="12" width="24" height="5" rx="2.5" />
      <rect class="transition-skeleton" x="194" y="26" width="39" height="6" rx="3" />
    </g>
  </g>

  <g transform="translate(76, 323)">
    <rect class="transition-progress-track" width="248" height="3" rx="1.5" />
    <rect class="transition-progress-value" width="248" height="3" rx="1.5" />
  </g>

  <g transform="translate(200, 352)">
    <text class="transition-egg transition-egg--1" text-anchor="middle">正在整理本次作业的上下文…</text>
    <text class="transition-egg transition-egg--2" text-anchor="middle">正在校验流程节点与权限边界…</text>
    <text class="transition-egg transition-egg--3" text-anchor="middle">正在让数据和界面保持同频…</text>
    <text class="transition-egg transition-egg--4" text-anchor="middle">正在准备下一步高效作业…</text>
  </g>
</svg>
`;

/**
 * 转场加载器
 */
export class TransitionLoader {
  static render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'transition-loader-wrapper';
    setSafeHtml(container, TRANSITION_SVG_TEMPLATE);
    return container;
  }
}
