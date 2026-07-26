import { describe, expect, it } from 'vitest';
import { applyVisionPartsToChatMessages, toChatImageUrlParts } from './chatVision';

describe('chatVision', () => {
  it('maps responses input_image to chat image_url parts', () => {
    expect(toChatImageUrlParts([{ type: 'input_image', image_url: 'https://x/a.png' }])).toEqual([
      { type: 'image_url', image_url: { url: 'https://x/a.png' } },
    ]);
  });

  it('applies vision parts to last user message', () => {
    const messages = applyVisionPartsToChatMessages(
      [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'what is this?' },
      ],
      [{ type: 'input_image', image_url: 'https://x/a.png' }]
    );
    expect(messages[1]?.content).toEqual([
      { type: 'text', text: 'what is this?' },
      { type: 'image_url', image_url: { url: 'https://x/a.png' } },
    ]);
  });

  it('maps input_audio parts with valid formats only', () => {
    expect(
      toChatImageUrlParts([
        { type: 'input_audio', input_audio: { data: 'BASE64', format: 'wav' } },
        { type: 'input_audio', input_audio: { data: 'BASE64', format: 'mp3' } },
        { type: 'input_audio', input_audio: { data: 'BASE64', format: 'ogg' } },
        { type: 'input_audio', input_audio: { data: '', format: 'wav' } },
      ])
    ).toEqual([
      { type: 'input_audio', input_audio: { data: 'BASE64', format: 'wav' } },
      { type: 'input_audio', input_audio: { data: 'BASE64', format: 'mp3' } },
    ]);
  });

  it('maps file parts requiring file_data or file_id', () => {
    expect(
      toChatImageUrlParts([
        { type: 'file', file: { file_id: 'file_1' } },
        { type: 'file', file: { file_data: 'data:application/pdf;base64,AA', filename: 'a.pdf' } },
        { type: 'file', file: { filename: 'orphan.pdf' } },
      ])
    ).toEqual([
      { type: 'file', file: { file_id: 'file_1' } },
      { type: 'file', file: { file_data: 'data:application/pdf;base64,AA', filename: 'a.pdf' } },
    ]);
  });
});
