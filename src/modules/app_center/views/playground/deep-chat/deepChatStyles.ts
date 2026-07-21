import { MESSAGE_TOOLBAR_CLASS } from './constants';

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
    border: 0 !important;
    border-radius: 18px !important;
    background: var(--deep-chat-accent-soft, #faf3ee) !important;
    color: #0f172a !important;
    box-shadow: none !important;
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
    border: 1px solid #e2e8f0 !important;
    border-radius: 8px !important;
    background: #f8fafc !important;
    color: #334155 !important;
    font-family: ui-monospace, "SFMono-Regular", Consolas, monospace !important;
    font-size: 12px !important;
    line-height: 1.65 !important;
  }

  .message-bubble.ai-message code {
    border-radius: 4px !important;
    background: #f1f5f9 !important;
    color: #334155 !important;
    font-family: ui-monospace, "SFMono-Regular", Consolas, monospace !important;
    font-size: 0.92em !important;
    padding: 1px 4px !important;
  }

  .message-bubble.ai-message pre code {
    padding: 0 !important;
    background: transparent !important;
  }

  .input-button.inside-end {
    background: var(--deep-chat-accent, #a85f3f) !important;
    box-shadow: none !important;
  }

  .input-button.inside-end.disabled-button {
    background: #94a3b8 !important;
    opacity: 0.82 !important;
    box-shadow: none !important;
  }

  .input-button.inside-end.loading-button,
  .input-button.inside-end[data-deep-chat-stop-active] {
    background: #dc2626 !important;
    cursor: pointer !important;
  }

  .input-button.inside-end.loading-button:hover,
  .input-button.inside-end.loading-button:focus-visible,
  .input-button.inside-end[data-deep-chat-stop-active]:hover,
  .input-button.inside-end[data-deep-chat-stop-active]:focus-visible {
    background: #b91c1c !important;
  }

  .input-button.inside-end[data-deep-chat-stop-active] #submit-icon,
  .input-button.inside-end[data-deep-chat-stop-active] .loading-submit-button,
  .input-button.inside-end[data-deep-chat-stop-active] #stop-icon {
    display: none !important;
  }

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

  #stop-icon {
    background-color: #ffffff !important;
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

  .deep-chat-message-tool {
    width: 30px;
    height: 30px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
  }

  .deep-chat-message-tool:hover,
  .deep-chat-message-tool:focus-visible {
    background: #f2f3f5;
    color: #4b5563;
    outline: none;
  }

  /* Emphasize via icon color only — no fill/border so it stays aligned with sibling tools */
  .deep-chat-message-tool--emphasized {
    background: transparent;
    border: 0;
    box-shadow: none;
    color: #4f46e5;
  }

  .deep-chat-message-tool--emphasized:hover,
  .deep-chat-message-tool--emphasized:focus-visible {
    background: #f2f3f5;
    border: 0;
    box-shadow: none;
    color: #4338ca;
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
    min-height: 0 !important;
    min-width: 0 !important;
    height: 100% !important;
    width: 100% !important;
    max-width: 100% !important;
    align-items: flex-end !important;
    justify-content: center !important;
    padding: 0 !important;
    background: transparent !important;
  }

  :host(.is-empty) #input {
    align-items: center !important;
    height: auto !important;
  }

  #text-input-container {
    box-sizing: border-box !important;
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: nowrap !important;
    align-items: flex-end !important;
    width: min(100%, 768px) !important;
    min-width: 0 !important;
    max-width: 100% !important;
    min-height: 58px !important;
    max-height: min(42vh, 420px) !important;
    margin: 0 auto !important;
    border: 1px solid #cbd5e1 !important;
    border-radius: 29px !important;
    background: #ffffff !important;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04) !important;
    overflow-y: auto !important;
  }

  #text-input {
    box-sizing: border-box !important;
    flex: 1 1 auto !important;
    min-width: 0 !important;
    max-width: 100% !important;
    min-height: 24px !important;
    padding: 18px 62px 16px 22px !important;
    color: #0f172a !important;
    font-size: 15px !important;
    line-height: 1.55 !important;
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

  .input-button-container.inner-button-container {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    pointer-events: none !important;
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

  .inside-end.input-button,
  .inside-end.submit-button,
  .inside-end.disabled-button,
  .inside-end.loading-button {
    width: 36px !important;
    height: 36px !important;
    inset-inline-end: max(11px, calc((100% - 768px) / 2 + 11px)) !important;
    inset-block-end: 11px !important;
    margin: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 50% !important;
    background: var(--deep-chat-accent, #a85f3f) !important;
    box-shadow: none !important;
  }

  .inside-end.input-button:hover,
  .inside-end.input-button:focus-visible,
  .inside-end.submit-button:hover,
  .inside-end.submit-button:focus-visible,
  .inside-end.loading-button:hover,
  .inside-end.loading-button:focus-visible,
  .inside-end.disabled-button:hover,
  .inside-end.disabled-button:focus-visible {
    background: var(--deep-chat-accent-hover, #8f4f33) !important;
  }

  .inside-end #submit-icon {
    width: 17px !important;
    height: 17px !important;
    filter: brightness(0) invert(1) !important;
  }

  .inside-end #stop-icon {
    position: absolute !important;
    inset: 0 !important;
    width: 36px !important;
    height: 36px !important;
    border-radius: 50% !important;
    background: var(--deep-chat-accent, #a85f3f) !important;
    pointer-events: none !important;
  }

  .inside-end.loading-button #stop-icon,
  .inside-end[data-deep-chat-stop-active] #stop-icon {
    width: 100% !important;
    height: 100% !important;
    background: #dc2626 !important;
  }

  .inside-end #stop-icon::after {
    content: "" !important;
    position: absolute !important;
    inset: 13px !important;
    border-radius: 2px !important;
    background: #ffffff !important;
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
    }

    #text-input {
      padding: 17px 60px 15px 18px !important;
      font-size: 14px !important;
    }

    .inside-end.input-button,
    .inside-end.submit-button,
    .inside-end.disabled-button,
    .inside-end.loading-button {
      inset-inline-end: 10px !important;
      inset-block-end: 10px !important;
    }
  }
`;
