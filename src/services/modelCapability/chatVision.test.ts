import { describe, expect, it } from 'vitest';
import { applyVisionPartsToChatMessages, toChatImageUrlParts } from './chatVision';

describe('chatVision', () => {
  it('maps responses input_image to chat image_url parts', () => {
    expect(
      toChatImageUrlParts([{ type: 'input_image', image_url: 'https://x/a.png' }])
    ).toEqual([{ type: 'image_url', image_url: { url: 'https://x/a.png' } }]);
  });

  it('applies vision parts to last user message', () => {
    const messages = applyVisionPartsToChatMessages(
      [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'what is this?' },
      ],
      [{ type: 'input_image', image_url: 'https://x/a.png' }]
    );
    expect(messages[1].content).toEqual([
      { type: 'text', text: 'what is this?' },
      { type: 'image_url', image_url: { url: 'https://x/a.png' } },
    ]);
  });
});
