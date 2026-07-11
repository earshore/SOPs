// src/common/utils/secureStorage.ts
// ================================================================
// 🔐 安全存储工具 (TypeScript版本)
// 提供基于 Web Crypto API 的加密存储功能
// ================================================================

export { SECURE_STORAGE_SECURITY_BOUNDARY } from './secureStorageBoundary';
import { SECURE_STORAGE_SECURITY_BOUNDARY } from './secureStorageBoundary';

/**
 * 加密数据结构
 */
interface EncryptedData {
  iv: number[];
  data: number[];
  version: string;
}

/**
 * 获取设备指纹作为加密密钥
 */
async function getDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform,
  ];

  const fingerprint = components.join('|');

  // 使用 SHA-256 生成固定长度的密钥
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // 转换为 hex 字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 从密钥字符串导入 CryptoKey
 */
async function importKey(keyString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString.slice(0, 32)); // 使用前32字节

  return await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * 安全存储服务
 */
export const SecureStorage = {
  securityBoundary: SECURE_STORAGE_SECURITY_BOUNDARY,

  /**
   * 加密并存储数据
   */
  async setSecure(key: string, data: unknown): Promise<boolean> {
    try {
      // 1. 获取设备指纹作为密钥
      const fingerprint = await getDeviceFingerprint();
      const cryptoKey = await importKey(fingerprint);

      // 2. 准备数据
      const encoder = new TextEncoder();
      const dataString = JSON.stringify(data);
      const dataBuffer = encoder.encode(dataString);

      // 3. 生成随机 IV (初始化向量)
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // 4. 加密
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        dataBuffer
      );

      // 5. 组合 IV 和加密数据
      const encryptedData: EncryptedData = {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encryptedBuffer)),
        version: '1.0', // 版本标识,便于未来升级
      };

      // 6. 直接使用 localStorage 存储，避免循环依赖
      localStorage.setItem(`secure_${key}`, JSON.stringify(encryptedData));
      return true;
    } catch (error) {
      console.error('[SecureStorage] Encryption failed:', error);
      return false;
    }
  },

  /**
   * 读取并解密数据
   */
  async getSecure<T = unknown>(key: string, defaultValue: T | null = null): Promise<T | null> {
    try {
      // 1. 直接从 localStorage 读取加密数据，避免循环依赖
      const raw = localStorage.getItem(`secure_${key}`);
      if (!raw) {
        return defaultValue;
      }

      const encryptedData = JSON.parse(raw) as EncryptedData;

      // 2. 获取密钥
      const fingerprint = await getDeviceFingerprint();
      const cryptoKey = await importKey(fingerprint);

      // 3. 恢复 IV 和数据
      const iv = new Uint8Array(encryptedData.iv);
      const data = new Uint8Array(encryptedData.data);

      // 4. 解密
      const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, data);

      // 5. 解析数据
      const decoder = new TextDecoder();
      const dataString = decoder.decode(decryptedBuffer);
      return JSON.parse(dataString);
    } catch (error) {
      console.error('[SecureStorage] Decryption failed:', error);
      return defaultValue;
    }
  },

  /**
   * 删除加密数据
   */
  async removeSecure(key: string): Promise<void> {
    // 直接从 localStorage 删除，避免循环依赖
    localStorage.removeItem(`secure_${key}`);
  },

  /**
   * 检查是否支持 Web Crypto API
   */
  isSupported(): boolean {
    return (
      typeof crypto !== 'undefined' &&
      typeof crypto.subtle !== 'undefined' &&
      typeof crypto.subtle.encrypt === 'function'
    );
  },
};

/**
 * 向后兼容: 暴露到 window
 */
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as Window & { SecureStorage?: typeof SecureStorage }).SecureStorage = SecureStorage;
}

export default SecureStorage;
