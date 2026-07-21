/**
 * deep-chat vendor scroll guard — shared by vite build plugin and unit tests.
 * @param {string} source
 * @param {{ strict?: boolean }} [options]
 */
export const DEEP_CHAT_SCROLL_BUG =
  'getFirstMessageContentEl(){const{text:t,html:e,files:s}=this.messageToElements[this.messageToElements.length-1][1];return t||e||(null==s?void 0:s[0])}';
export const DEEP_CHAT_SCROLL_FIX =
  'getFirstMessageContentEl(){const n=this.messageToElements[this.messageToElements.length-1];if(!n||!n[1])return;const{text:t,html:e,files:s}=n[1];return t||e||(null==s?void 0:s[0])}';

/**
 * @param {string} source
 * @param {{ strict?: boolean }} [options]
 */
export function patchDeepChatBundleSource(source, options = {}) {
  if (source.includes(DEEP_CHAT_SCROLL_FIX)) {
    return source;
  }
  if (source.includes(DEEP_CHAT_SCROLL_BUG)) {
    return source.replace(DEEP_CHAT_SCROLL_BUG, DEEP_CHAT_SCROLL_FIX);
  }
  const message =
    '[sops:deep-chat-bundle-asset] scroll guard pattern not found; deep-chat vendor may have changed';
  if (options.strict) {
    throw new Error(message);
  }
  console.warn(message);
  return source;
}
