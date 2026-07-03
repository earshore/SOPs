const UINT32_RANGE = 0x100000000;
let fallbackCounter = 0;

function getCryptoRandomUint32(): number | null {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    return null;
  }

  const values = new Uint32Array(1);
  cryptoApi.getRandomValues(values);
  return values[0] ?? 0;
}

function getFallbackRandomUint32(): number {
  fallbackCounter = (fallbackCounter + 1) >>> 0;
  return (Date.now() + fallbackCounter * 2654435761) >>> 0;
}

export function randomFloat(): number {
  return (getCryptoRandomUint32() ?? getFallbackRandomUint32()) / UINT32_RANGE;
}

export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) {
    return 0;
  }

  return Math.floor(randomFloat() * maxExclusive);
}

export function randomBetween(min: number, max: number): number {
  return min + randomFloat() * (max - min);
}

export function randomBase36(length: number): string {
  let result = '';

  while (result.length < length) {
    result += randomInt(36).toString(36);
  }

  return result;
}

export function createRandomId(prefix: string, separator = '_'): string {
  return `${prefix}${separator}${Date.now()}${separator}${randomBase36(9)}`;
}
