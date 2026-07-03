import deepChatBundleUrl from 'deep-chat/dist/deepChat.bundle.js?url';
import { DEEP_CHAT_SCRIPT_MARKER } from './constants';

let deepChatElementLoadPromise: Promise<void> | null = null;

export async function ensureDeepChatElementDefined(): Promise<void> {
  if (customElements.get('deep-chat')) {
    return;
  }

  deepChatElementLoadPromise ||= loadDeepChatElementScript();
  try {
    await deepChatElementLoadPromise;
  } catch (error) {
    deepChatElementLoadPromise = null;
    throw error;
  }
  await customElements.whenDefined('deep-chat');
}

function loadDeepChatElementScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[data-loader="${DEEP_CHAT_SCRIPT_MARKER}"]`
    );
    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Deep Chat 组件加载失败')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.async = true;
    script.src = deepChatBundleUrl;
    script.dataset.loader = DEEP_CHAT_SCRIPT_MARKER;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true }
    );
    script.addEventListener('error', () => reject(new Error('Deep Chat 组件加载失败')), {
      once: true,
    });
    document.head.appendChild(script);
  });
}
