import { MESSAGE_TOOLBAR_CLASS } from '../constants';

export const DEEP_CHAT_AUXILIARY_STYLE = `
  :host {
    overflow: visible !important;
  }

  #messages {
    padding: 22px 24px 18px;
  }

  :host(.is-empty) #messages {
    display: none !important;
  }

  :host(.is-empty) #chat-view {
    align-content: center !important;
    align-items: center !important;
    grid-template-rows: auto !important;
  }

  .outer-message-container {
    margin-bottom: 26px !important;
  }

  /* 生成中：隐藏原生三点；chrome 在正式回复气泡前 */
  :host(.is-pending-generation) .deep-chat-loading-message-dots-container {
    display: none !important;
  }

  .deep-chat-generation-chrome {
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 0.35rem !important;
    width: 100% !important;
    max-width: min(100%, 42rem) !important;
    margin: 0 0 0.45rem !important;
    border: none !important;
    background: transparent !important;
    box-sizing: border-box !important;
  }

  /* 状态行（等待 / 正在生成）：挂在 message-toolbar 末尾，不在气泡上方 */
  .deep-chat-inline-pending-status {
    display: none !important;
  }

  .deep-chat-toolbar-live-status {
    display: inline-flex !important;
    align-items: center !important;
    min-width: 0 !important;
    margin: 0 0 0 auto !important;
    padding: 0 !important;
    border: none !important;
    background: transparent !important;
    color: #94a3b8 !important;
    font-family: inherit !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    line-height: 1.4 !important;
    white-space: nowrap !important;
    user-select: none !important;
  }

  .deep-chat-dt-stream,
  .deep-chat-dt-settled {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    width: 100% !important;
    border: none !important;
    background: transparent !important;
  }

  .deep-chat-dt-toggle,
  .deep-chat-dt-done-toggle {
    display: inline-flex !important;
    align-items: center !important;
    gap: 0.45rem !important;
    min-height: 32px !important;
    margin: 0 !important;
    padding: 0.15rem 0.1rem !important;
    border: none !important;
    border-radius: 0.35rem !important;
    background: transparent !important;
    box-shadow: none !important;
    /* 默认比正文略淡；hover 与正文同色 */
    color: #94a3b8 !important;
    font-family: inherit !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    line-height: 1.35 !important;
    cursor: pointer !important;
    user-select: none !important;
    transition: color 160ms ease, background-color 160ms ease !important;
  }

  /* 无深度思考内容时「已完成 Xs」仅作状态展示，不展开 */
  .deep-chat-dt-done-toggle.is-static {
    cursor: default !important;
  }

  .deep-chat-dt-done-toggle.is-static .deep-chat-dt-chevron {
    display: none !important;
  }

  .deep-chat-dt-toggle:hover,
  .deep-chat-dt-done-toggle:hover {
    color: #64748b !important; /* 与 .deep-chat-dt-text 正文同色 */
    background: transparent !important;
  }

  .deep-chat-dt-toggle:focus-visible,
  .deep-chat-dt-done-toggle:focus-visible {
    outline: 2px solid rgba(124, 58, 237, 0.45) !important;
    outline-offset: 2px !important;
  }

  .deep-chat-dt-label,
  .deep-chat-dt-done-label {
    min-width: 0 !important;
    font-weight: 400 !important;
  }

  /* SVG chevron: 默认可见一点，hover 更清晰；展开旋转 90° 呈向下 */
  .deep-chat-dt-chevron {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex: 0 0 auto !important;
    width: 14px !important;
    height: 14px !important;
    margin-left: 0.2rem !important;
    color: #94a3b8 !important;
    opacity: 0.55 !important;
    transform: rotate(0deg) !important;
    transition: opacity 160ms ease, transform 200ms ease, color 160ms ease !important;
  }

  .deep-chat-dt-chevron svg {
    display: block !important;
    width: 12px !important;
    height: 12px !important;
  }

  .deep-chat-dt-toggle:hover .deep-chat-dt-chevron,
  .deep-chat-dt-done-toggle:hover .deep-chat-dt-chevron {
    opacity: 1 !important;
    color: #64748b !important;
  }

  .deep-chat-dt-toggle.is-expanded .deep-chat-dt-chevron,
  .deep-chat-dt-done-toggle.is-expanded .deep-chat-dt-chevron,
  .deep-chat-dt-toggle[aria-expanded='true'] .deep-chat-dt-chevron,
  .deep-chat-dt-done-toggle[aria-expanded='true'] .deep-chat-dt-chevron {
    opacity: 1 !important;
    transform: rotate(90deg) !important;
    color: #64748b !important;
  }

  .deep-chat-dt-done-panel {
    display: flex !important;
    flex-direction: column !important;
    gap: 0.2rem !important;
    width: 100% !important;
    padding-left: 0.15rem !important;
  }

  /* Must beat display:flex !important so collapsed 已完成 hides 深度思考 */
  .deep-chat-dt-done-panel[hidden],
  .deep-chat-dt-body[hidden],
  .deep-chat-dt-stream[hidden] {
    display: none !important;
  }

  /* 深度思考正文：左侧引用竖线（仅展开后可见） */
  .deep-chat-dt-body {
    width: 100% !important;
    margin: 0.2rem 0 0.15rem !important;
    padding: 0.1rem 0 0.1rem 0.7rem !important;
    border: none !important;
    border-left: 2px solid rgba(148, 163, 184, 0.65) !important;
    background: transparent !important;
    box-sizing: border-box !important;
  }

  .deep-chat-dt-text {
    margin: 0 !important;
    max-height: 12.5rem !important; /* ~200px：超出后滚动 */
    overflow-x: hidden !important;
    overflow-y: auto !important;
    padding: 0.05rem 0.15rem 0.2rem 0 !important;
    border: none !important;
    background: transparent !important;
    white-space: pre-wrap !important;
    word-break: break-word !important;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
    font-size: 11px !important;
    line-height: 1.5 !important;
    color: #64748b !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .deep-chat-dt-chevron,
    .deep-chat-dt-toggle,
    .deep-chat-dt-done-toggle {
      transition-duration: 0.01ms !important;
    }
  }

  .inner-message-container {
    display: flex !important;
    flex-direction: column !important;
    min-width: 0 !important;
  }

  .deep-chat-outer-container-role-user {
    justify-content: flex-end !important;
  }

  .deep-chat-outer-container-role-user .inner-message-container {
    align-items: flex-end !important;
    max-width: min(78%, 560px) !important;
  }

  .deep-chat-outer-container-role-ai .inner-message-container {
    align-items: flex-start !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  .message-bubble {
    box-sizing: border-box !important;
    overflow-wrap: anywhere !important;
  }

  .message-bubble.user-message {
    max-width: 100% !important;
    padding: 10px 14px !important;
    border: 1px solid rgba(168, 95, 63, 0.12) !important;
    border-radius: 18px !important;
    background: linear-gradient(180deg, #fffdfb 0%, var(--deep-chat-accent-soft, #faf3ee) 100%) !important;
    color: #0f172a !important;
    box-shadow: 0 1px 2px rgba(168, 95, 63, 0.08) !important;
  }

  .message-bubble.ai-message {
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    color: #1e293b !important;
    box-shadow: none !important;
  }

  .message-bubble.user-message h1,
  .message-bubble.user-message h2,
  .message-bubble.user-message h3,
  .message-bubble.user-message p,
  .message-bubble.user-message ul,
  .message-bubble.user-message ol {
    margin: 0 0 8px !important;
    font-size: 14px !important;
    line-height: 1.55 !important;
  }

  .message-bubble.user-message > :last-child,
  .message-bubble.ai-message > :last-child {
    margin-bottom: 0 !important;
  }

  .message-bubble.ai-message p,
  .message-bubble.ai-message li {
    font-size: 14px !important;
    line-height: 1.75 !important;
  }

  .message-bubble.ai-message h1,
  .message-bubble.ai-message h2,
  .message-bubble.ai-message h3 {
    margin: 18px 0 8px !important;
    color: #0f172a !important;
    font-size: 16px !important;
    line-height: 1.45 !important;
  }

  .message-bubble.ai-message ul,
  .message-bubble.ai-message ol {
    padding-inline-start: 20px !important;
  }

  .message-bubble.ai-message pre,
  .message-bubble.ai-message code {
    max-width: 100% !important;
    white-space: pre-wrap !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
  }

  .message-bubble.ai-message pre {
    overflow-x: auto !important;
    padding: 12px 14px !important;
    border: 1px solid rgba(234, 214, 200, 0.9) !important;
    border-radius: 12px !important;
    background: #fffaf7 !important;
    color: #334155 !important;
    font-family: ui-monospace, "SFMono-Regular", Consolas, monospace !important;
    font-size: 12px !important;
    line-height: 1.65 !important;
  }

  .message-bubble.ai-message code {
    border-radius: 5px !important;
    background: #faf3ee !important;
    color: #6f3925 !important;
    font-family: ui-monospace, "SFMono-Regular", Consolas, monospace !important;
    font-size: 0.92em !important;
    padding: 1px 5px !important;
  }

  .message-bubble.ai-message pre code {
    padding: 0 !important;
    background: transparent !important;
  }

  /*
   * 发送钮状态矩阵（class 由 deep-chat 切换，stop-active 由我们在「可中止生成」时挂上）：
   * - disabled-button：空输入，灰底不可点
   * - submit-button / 默认：可发送，旗袍色
   * - loading-button 或 [data-deep-chat-stop-active]：生成中，红底方块停止
   * deep-chat 在 stream onOpen 后会去掉 loading-button，只剩 input-button + stop 图标，
   * 因此颜色/图标必须以 data-deep-chat-stop-active 为准，不能只依赖 loading-button。
   */
  .input-button.inside-end {
    background: var(--deep-chat-accent, #a85f3f) !important;
    box-shadow: 0 2px 8px rgba(168, 95, 63, 0.28) !important;
    cursor: pointer !important;
    opacity: 1 !important;
    transition: background 150ms cubic-bezier(0, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0, 0, 0.2, 1) !important;
  }

  .input-button.inside-end.disabled-button {
    background: #94a3b8 !important;
    opacity: 0.82 !important;
    box-shadow: none !important;
    cursor: not-allowed !important;
  }

  .input-button.inside-end.loading-button:not([data-deep-chat-stop-active]) {
    background: var(--deep-chat-accent, #a85f3f) !important;
    cursor: progress !important;
    opacity: 0.84 !important;
  }

  .input-button.inside-end.loading-button[data-deep-chat-stop-active],
  .input-button.inside-end[data-deep-chat-stop-active] {
    background: #dc2626 !important;
    cursor: pointer !important;
    opacity: 1 !important;
  }

  .input-button.inside-end.loading-button[data-deep-chat-stop-active]:hover,
  .input-button.inside-end.loading-button[data-deep-chat-stop-active]:focus-visible,
  .input-button.inside-end[data-deep-chat-stop-active]:hover,
  .input-button.inside-end[data-deep-chat-stop-active]:focus-visible {
    background: #b91c1c !important;
  }

  .input-button.inside-end[data-deep-chat-stop-active]:focus-visible {
    outline: 2px solid rgba(220, 38, 38, 0.75) !important;
    outline-offset: 2px !important;
  }

  .input-button.inside-end[data-deep-chat-stop-active]:active {
    background: #991b1b !important;
  }

  /* 请求预检保留原生 loading 指示；仅可中止的生成态改用白色方块停止标。 */
  .input-button.inside-end.loading-button:not([data-deep-chat-stop-active]) #submit-icon,
  .input-button.inside-end.loading-button:not([data-deep-chat-stop-active]) #stop-icon,
  .input-button.inside-end.loading-button[data-deep-chat-stop-active] #submit-icon,
  .input-button.inside-end.loading-button[data-deep-chat-stop-active] .loading-submit-button,
  .input-button.inside-end.loading-button[data-deep-chat-stop-active] #stop-icon,
  .input-button.inside-end[data-deep-chat-stop-active] #submit-icon,
  .input-button.inside-end[data-deep-chat-stop-active] .loading-submit-button,
  .input-button.inside-end[data-deep-chat-stop-active] #stop-icon {
    display: none !important;
  }

  .input-button.inside-end.loading-button[data-deep-chat-stop-active]::before,
  .input-button.inside-end[data-deep-chat-stop-active]::before {
    content: '' !important;
    width: 12px !important;
    height: 12px !important;
    display: block !important;
    border-radius: 3px !important;
    background: #ffffff !important;
  }

  #submit-icon,
  #submit-icon * {
    color: #ffffff !important;
    fill: #ffffff !important;
    stroke: #ffffff !important;
  }

  .${MESSAGE_TOOLBAR_CLASS} {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 7px;
    color: #64748b;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 12px;
    line-height: 1;
    user-select: none;
  }

  .${MESSAGE_TOOLBAR_CLASS}[data-role="user"] {
    justify-content: flex-end;
    padding-inline-end: 4px;
  }

  .${MESSAGE_TOOLBAR_CLASS}[data-role="ai"] {
    justify-content: flex-start;
    margin-top: 12px;
  }

  .deep-chat-message-time {
    color: #64748b;
    font-variant-numeric: tabular-nums;
  }

  .deep-chat-message-status {
    color: #b45309;
    font-weight: 600;
  }

  /* Distinct incomplete vs user-stopped so status stays readable after switch/remount */
  .deep-chat-message-status[data-status='partial'] {
    color: #b45309;
  }

  .deep-chat-message-status[data-status='stopped'] {
    color: #b91c1c;
  }

  .deep-chat-message-tool {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: background 150ms cubic-bezier(0, 0, 0.2, 1), color 150ms cubic-bezier(0, 0, 0.2, 1), border-color 150ms cubic-bezier(0, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0, 0, 0.2, 1);
  }

  .deep-chat-message-tool:hover,
  .deep-chat-message-tool:focus-visible {
    background: #faf3ee;
    color: #8f4f33;
    outline: none;
  }

  /* Emphasize via icon color only — no fill/border so it stays aligned with sibling tools */
  .deep-chat-message-tool--emphasized {
    background: transparent;
    border: 0;
    box-shadow: none;
    color: #a85f3f;
  }

  .deep-chat-message-tool--emphasized:hover,
  .deep-chat-message-tool--emphasized:focus-visible {
    background: #faf3ee;
    border: 0;
    box-shadow: none;
    color: #6f3925;
    outline: none;
  }

  .deep-chat-message-tool svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    stroke-width: 1.8;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  #input {
    box-sizing: border-box !important;
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    min-height: 0 !important;
    min-width: 0 !important;
    height: 100% !important;
    width: 100% !important;
    max-width: 100% !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 0.5rem !important;
    padding: 0 !important;
    background: transparent !important;
  }

  :host(.is-empty) #input {
    align-items: center !important;
    justify-content: center !important;
    height: auto !important;
  }

  /* 正在载入技能：贴输入框上方，无边框背景 */
  #input > .deep-chat-skill-load-banner {
    position: relative !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0.35rem !important;
    flex: 0 0 auto !important;
    width: min(100%, 768px) !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0.1rem 0.25rem !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: #8f4f33 !important;
    font-size: 0.75rem !important;
    font-weight: 500 !important;
    line-height: 1.35 !important;
  }

  #input > .deep-chat-skill-load-banner[hidden] {
    display: none !important;
  }

  #text-input-container {
    box-sizing: border-box !important;
    position: relative !important;
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: flex-end !important;
    flex: 0 0 auto !important;
    width: min(100%, 768px) !important;
    min-width: 0 !important;
    max-width: 100% !important;
    min-height: 58px !important;
    max-height: min(42vh, 420px) !important;
    margin: 0 auto !important;
    border: 1px solid rgba(234, 214, 200, 0.95) !important;
    border-radius: 29px !important;
    background: linear-gradient(180deg, #ffffff 0%, #fffdfb 100%) !important;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.04),
      0 8px 20px -16px rgba(168, 95, 63, 0.18) !important;
    /* 容器不滚：发送钮贴底固定；长文在 #text-input 内滚动 */
    overflow: hidden !important;
    transition: border-color 150ms cubic-bezier(0, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0, 0, 0.2, 1) !important;
  }

  #text-input-container:focus-within {
    border-color: rgba(168, 95, 63, 0.42) !important;
    box-shadow:
      0 0 0 3px rgba(168, 95, 63, 0.14),
      0 8px 20px -14px rgba(168, 95, 63, 0.2) !important;
  }

  /* 发送后仍显示会话技能；Dock 是 text-input 的兄弟节点，不会被 Deep Chat 读进消息。 */
  #deep-chat-session-skill-chip-dock {
    display: none !important;
  }

  @media (min-width: 641px) {
    #text-input-container.has-session-skill-chip-dock {
      flex-direction: column !important;
      align-items: stretch !important;
    }

    #text-input-container.has-session-skill-chip-dock > #deep-chat-session-skill-chip-dock {
      display: flex !important;
      flex: 0 0 auto !important;
      flex-wrap: wrap !important;
      align-items: center !important;
      gap: 0.28rem !important;
      min-width: 0 !important;
      padding: 10px 58px 0 14px !important;
    }

    #text-input-container.has-session-skill-chip-dock > #text-input {
      width: 100% !important;
      padding-top: 8px !important;
    }
  }

  #text-input {
    box-sizing: border-box !important;
    flex: 1 1 auto !important;
    min-width: 0 !important;
    max-width: 100% !important;
    min-height: 24px !important;
    /* 相对容器 max-height 留出上下 padding，避免长文被裁切且无法滚动 */
    max-height: min(calc(42vh - 20px), 400px) !important;
    padding: 18px 62px 16px 22px !important;
    color: #0f172a !important;
    font-size: 15px !important;
    line-height: 1.55 !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    overscroll-behavior: contain !important;
    -webkit-overflow-scrolling: touch !important;
    overflow-wrap: anywhere !important;
    word-break: break-word !important;
    white-space: pre-wrap !important;
  }

  /*
   * 全局技能上下文 Chip（输入框 / 消息气泡共用）
   * - --dismissible：输入框、编辑回填 — hover 时 × 覆盖左侧图标
   * - --static：已发送消息 — 仅展示，永不显示 ×
   */
  .deep-chat-context-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.28rem;
    max-width: min(100%, 14rem);
    margin: 0 0.12em;
    padding: 0.1rem 0.45rem 0.1rem 0.28rem;
    border-radius: 9999px;
    border: 1px solid rgba(168, 95, 63, 0.28);
    background: #faf3ee;
    color: #8f4f33;
    font-size: 0.8125em;
    font-weight: 600;
    line-height: 1.25;
    vertical-align: baseline;
    user-select: none;
    cursor: default;
    -webkit-user-modify: read-only;
    white-space: nowrap;
  }

  .deep-chat-context-chip--dismissible:hover,
  .deep-chat-context-chip--dismissible:focus-within {
    border-color: rgba(168, 95, 63, 0.4);
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(168, 95, 63, 0.14);
  }

  .deep-chat-context-chip__leading {
    position: relative;
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .deep-chat-context-chip__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #a85f3f;
    transition: opacity 120ms cubic-bezier(0, 0, 0.2, 1);
  }

  .deep-chat-context-chip__label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .deep-chat-context-chip__dismiss {
    position: absolute;
    inset: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 9999px;
    background: transparent;
    color: #8f4f33;
    line-height: 1;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 120ms cubic-bezier(0, 0, 0.2, 1),
      background 120ms cubic-bezier(0, 0, 0.2, 1);
  }

  /* 仅可编辑场景：hover 用 × 覆盖技能图标 */
  .deep-chat-context-chip--dismissible:hover .deep-chat-context-chip__icon,
  .deep-chat-context-chip--dismissible:focus-within .deep-chat-context-chip__icon {
    opacity: 0;
  }

  .deep-chat-context-chip--dismissible:hover .deep-chat-context-chip__dismiss,
  .deep-chat-context-chip--dismissible:focus-within .deep-chat-context-chip__dismiss {
    opacity: 1;
    pointer-events: auto;
  }

  .deep-chat-context-chip--dismissible .deep-chat-context-chip__dismiss:hover,
  .deep-chat-context-chip--dismissible .deep-chat-context-chip__dismiss:focus-visible {
    background: rgba(168, 95, 63, 0.14);
    outline: none;
  }

  /* 消息气泡内 static Chip：略紧凑，无交互态 */
  .message-bubble .deep-chat-context-chip--static {
    font-size: 0.78em;
    vertical-align: text-bottom;
  }

  /*
   * 用户气泡底色 #faf3ee 与默认 Chip 同色会糊成一片。
   * 气泡内改用白底 + 实色描边，保证 Chip 从旗袍背景中跳出来。
   */
  .message-bubble.user-message .deep-chat-context-chip,
  .message-bubble.user-message-text .deep-chat-context-chip,
  .user-message .deep-chat-context-chip {
    border: 1px solid rgba(168, 95, 63, 0.45);
    background: #ffffff;
    color: #6f3925;
    box-shadow: 0 1px 2px rgba(111, 57, 37, 0.1);
  }

  .message-bubble.user-message .deep-chat-context-chip__icon,
  .message-bubble.user-message-text .deep-chat-context-chip__icon,
  .user-message .deep-chat-context-chip__icon {
    color: #a85f3f;
  }

  /*
   * 默认铺满 #input；controller.alignSubmitButtonLayerToTextInput 会把几何对齐到
   * #text-input-container，避免技能条/gap 把发送钮贴底基准抬偏。
   */
  .input-button-container.inner-button-container {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
    z-index: 2 !important;
  }

  .input-button-container.inner-button-container .input-button {
    pointer-events: auto !important;
  }

  #text-input[contenteditable]:empty:before {
    color: #64748b !important;
  }

  #microphone-button,
  #dropup-button,
  #upload-images-button,
  #upload-gifs-button,
  #upload-audio-button,
  #upload-mixed-files-button,
  #camera-button,
  #file-input,
  #dropup-menu {
    display: none !important;
  }

  /*
   * 位置与尺寸：覆盖 deep-chat 默认 inside-end（约 10%+0.35em 贴右下）。
   * 选择器必须包含裸 .input-button.inside-end：stream stop 态会去掉
   * submit/disabled/loading class，只剩 input-button + inside-end。
   */
  .inside-end.input-button,
  .inside-end.submit-button,
  .inside-end.disabled-button,
  .inside-end.loading-button {
    width: 36px !important;
    height: 36px !important;
    /*
     * 贴底定位：单行时 min-height(58) - 按钮(36) = 22 → 上下各 11px，视觉居中；
     * 多行撑高后仍贴底，不会漂在输入区中间。
     */
    inset-inline-end: max(11px, calc((100% - 768px) / 2 + 11px)) !important;
    inset-block-end: 11px !important;
    inset-block-start: auto !important;
    margin: 0 !important;
    transform: none !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 50% !important;
    box-shadow: none !important;
  }

  /* 可发送：旗袍色 hover；禁用/生成中不走此规则 */
  .inside-end.input-button:not(.disabled-button):not(.loading-button):not(
      [data-deep-chat-stop-active]
    ):hover,
  .inside-end.input-button:not(.disabled-button):not(.loading-button):not(
      [data-deep-chat-stop-active]
    ):focus-visible,
  .inside-end.submit-button:not(.disabled-button):not(.loading-button):not(
      [data-deep-chat-stop-active]
    ):hover,
  .inside-end.submit-button:not(.disabled-button):not(.loading-button):not(
      [data-deep-chat-stop-active]
    ):focus-visible {
    background: var(--deep-chat-accent-hover, #8f4f33) !important;
  }

  .inside-end.input-button:not(.disabled-button):not(.loading-button):not(
      [data-deep-chat-stop-active]
    ):focus-visible {
    outline: 2px solid rgba(168, 95, 63, 0.75) !important;
    outline-offset: 2px !important;
  }

  .inside-end.input-button:not(.disabled-button):not(.loading-button):not(
      [data-deep-chat-stop-active]
    ):active {
    background: #6f3925 !important;
  }

  .inside-end.disabled-button:hover,
  .inside-end.disabled-button:focus-visible {
    background: #94a3b8 !important;
    opacity: 0.82 !important;
    cursor: not-allowed !important;
  }

  .inside-end #submit-icon {
    width: 17px !important;
    height: 17px !important;
    filter: brightness(0) invert(1) !important;
  }

  @media (max-width: 640px) {
    #messages {
      padding: 18px 16px;
    }

    .deep-chat-outer-container-role-user .inner-message-container {
      max-width: 88% !important;
    }

    #text-input-container {
      width: 100% !important;
      min-height: 56px !important;
      max-height: min(46vh, 340px) !important;
      border-radius: 28px !important;
      overflow: hidden !important;
    }

    #text-input {
      max-height: min(calc(46vh - 18px), 320px) !important;
      padding: 17px 60px 15px 18px !important;
      font-size: 14px !important;
      overflow-y: auto !important;
    }

    .inside-end.input-button,
    .inside-end.submit-button,
    .inside-end.disabled-button,
    .inside-end.loading-button {
      inset-inline-end: 10px !important;
      inset-block-end: 10px !important;
      inset-block-start: auto !important;
      transform: none !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .input-button.inside-end,
    .deep-chat-message-tool,
    .deep-chat-context-chip,
    #text-input-container {
      transition-duration: 0.01ms !important;
    }

    .deep-chat-inline-pending-dot {
      animation: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }

`;
