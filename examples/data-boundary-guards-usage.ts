// examples/data-boundary-guards-usage.ts
// ================================================================
// 数据边界类型守卫使用示例
// 展示如何在关键数据边界使用类型守卫进行运行时验证
// ================================================================

import { 
  isUserProductProfile,
  isLLMProviderConfig,
  isProxyConfig,
  isApiResponse,
  isLLMChatCompletionResponse,
  isAmazonProductData,
  isArrayOf
} from '../src/common/guards/typeGuards';

import type { 
  UserProductProfile,
  LLMProviderConfig,
  ProxyConfig 
} from '../src/types/state';

import type { 
  ApiResponse,
  LLMChatCompletionResponse,
  AmazonProductData 
} from '../src/types/api';

// ==================== 示例 1: localStorage 数据边界 ====================

/**
 * 从 localStorage 安全地加载配置
 * 
 * 数据边界：localStorage → 应用内存
 * 风险：存储的数据可能被用户手动修改、损坏或版本不兼容
 */
function loadConfigFromStorage<T>(
  key: string,
  validator: (value: unknown) => value is T,
  defaultValue: T
): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;

    const parsed = JSON.parse(stored);

    // 🎯 数据边界验证：使用类型守卫验证
    if (validator(parsed)) {
      console.log(`✅ 配置加载成功: ${key}`);
      return parsed;
    } else {
      console.warn(`⚠️ 配置格式无效，使用默认值: ${key}`);
      // 清除无效数据
      localStorage.removeItem(key);
      return defaultValue;
    }
  } catch (error) {
    console.error(`❌ 加载配置失败: ${key}`, error);
    return defaultValue;
  }
}

/**
 * 安全地保存配置到 localStorage
 * 
 * 数据边界：应用内存 → localStorage
 * 风险：保存的数据格式可能不正确
 */
function saveConfigToStorage<T>(
  key: string,
  value: unknown,
  validator: (value: unknown) => value is T
): boolean {
  // 🎯 数据边界验证：保存前验证
  if (!validator(value)) {
    console.error(`❌ 无法保存：数据格式无效: ${key}`);
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    console.log(`✅ 配置保存成功: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ 保存配置失败: ${key}`, error);
    return false;
  }
}

// 使用示例
const userProfile = loadConfigFromStorage(
  'userProductProfile',
  isUserProductProfile,
  {
    targetMarket: 'English',
    keywordsTier1: '',
    keywordsTier2: '',
    audience: '',
    usps: '',
    specs: '',
    socialHook: '',
    negative: '',
    tone: 'professional',
    customStrategy: '',
    useRufus: true,
    useEmoji: true,
    useCosmo: true,
    selectedReportSections: [],
    charLimit: 5000
  }
);

const llmConfig = loadConfigFromStorage(
  'llm_openai',
  isLLMProviderConfig,
  {
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4',
    enabled: true
  }
);

// ==================== 示例 2: API 响应数据边界 ====================

/**
 * 安全地处理 API 响应
 * 
 * 数据边界：外部 API → 应用内存
 * 风险：API 响应格式可能变化、损坏或恶意
 */
async function fetchUserData(userId: string): Promise<UserProductProfile | null> {
  try {
    const response = await fetch(`/api/users/${userId}/profile`);
    const data = await response.json();

    // 🎯 数据边界验证：验证 API 响应格式
    if (isApiResponse(data, isUserProductProfile)) {
      if (data.success && data.data) {
        console.log('✅ 用户数据加载成功');
        return data.data;
      } else {
        console.error('❌ API 返回失败:', data.error?.message);
        return null;
      }
    } else {
      console.error('❌ API 响应格式无效');
      return null;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error);
    return null;
  }
}

/**
 * 安全地处理 LLM API 响应
 * 
 * 数据边界：LLM API → 应用内存
 * 风险：LLM API 响应格式可能不标准或损坏
 */
async function callLLMSafely(prompt: string): Promise<string | null> {
  try {
    const response = await fetch('/api/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    // 🎯 数据边界验证：验证 LLM 响应格式
    if (isLLMChatCompletionResponse(data)) {
      const message = data.choices[0]?.message?.content;
      if (message) {
        console.log('✅ LLM 响应成功');
        return message;
      }
    }

    console.error('❌ LLM 响应格式无效');
    return null;
  } catch (error) {
    console.error('❌ LLM 请求失败:', error);
    return null;
  }
}

// ==================== 示例 3: 用户输入数据边界 ====================

/**
 * 安全地处理表单数据
 * 
 * 数据边界：用户输入 → 应用内存
 * 风险：用户输入可能不完整、格式错误或恶意
 */
function handleFormSubmit(formData: FormData): UserProductProfile | null {
  const rawData = {
    targetMarket: formData.get('targetMarket'),
    keywordsTier1: formData.get('keywordsTier1'),
    keywordsTier2: formData.get('keywordsTier2'),
    audience: formData.get('audience'),
    usps: formData.get('usps'),
    specs: formData.get('specs'),
    socialHook: formData.get('socialHook'),
    negative: formData.get('negative'),
    tone: formData.get('tone'),
    customStrategy: formData.get('customStrategy'),
    useRufus: formData.get('useRufus') === 'true',
    useEmoji: formData.get('useEmoji') === 'true',
    useCosmo: formData.get('useCosmo') === 'true',
    selectedReportSections: JSON.parse(formData.get('selectedReportSections') as string || '[]'),
    charLimit: parseInt(formData.get('charLimit') as string || '5000', 10)
  };

  // 🎯 数据边界验证：验证表单数据
  if (isUserProductProfile(rawData)) {
    console.log('✅ 表单验证通过');
    return rawData;
  } else {
    console.error('❌ 表单数据验证失败');
    return null;
  }
}

// ==================== 示例 4: 文件上传数据边界 ====================

/**
 * 安全地处理上传的 JSON 文件
 * 
 * 数据边界：文件系统 → 应用内存
 * 风险：文件内容可能损坏、格式错误或恶意
 */
async function handleFileUpload(file: File): Promise<UserProductProfile | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // 🎯 数据边界验证：验证文件内容
    if (isUserProductProfile(data)) {
      console.log('✅ 文件内容验证通过');
      return data;
    } else {
      console.error('❌ 文件内容格式无效');
      return null;
    }
  } catch (error) {
    console.error('❌ 文件解析失败:', error);
    return null;
  }
}

// ==================== 示例 5: 数组数据边界 ====================

/**
 * 安全地处理产品列表
 * 
 * 数据边界：外部 API → 应用内存
 * 风险：数组中的某些元素可能格式错误
 */
async function fetchProductList(): Promise<AmazonProductData[]> {
  try {
    const response = await fetch('/api/products');
    const data = await response.json();

    // 🎯 数据边界验证：验证数组数据
    if (isArrayOf(data, isAmazonProductData)) {
      console.log(`✅ 产品列表验证通过: ${data.length} 个产品`);
      return data;
    } else {
      console.error('❌ 产品列表格式无效');
      return [];
    }
  } catch (error) {
    console.error('❌ 获取产品列表失败:', error);
    return [];
  }
}

// ==================== 示例 6: 跨窗口通信数据边界 ====================

/**
 * 安全地处理 postMessage 数据
 * 
 * 数据边界：其他窗口/iframe → 当前窗口
 * 风险：消息可能来自不可信源，内容可能恶意
 */
window.addEventListener('message', (event) => {
  // 验证消息来源
  if (event.origin !== window.location.origin) {
    console.warn('⚠️ 拒绝来自不可信源的消息:', event.origin);
    return;
  }

  // 🎯 数据边界验证：验证消息数据
  if (isUserProductProfile(event.data)) {
    console.log('✅ 接收到有效的配置数据');
    // 处理配置数据
  } else {
    console.warn('⚠️ 接收到无效的消息数据');
  }
});

// ==================== 示例 7: WebSocket 数据边界 ====================

/**
 * 安全地处理 WebSocket 消息
 * 
 * 数据边界：WebSocket 服务器 → 应用内存
 * 风险：消息可能损坏、格式错误或恶意
 */
function setupWebSocket(url: string) {
  const ws = new WebSocket(url);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // 🎯 数据边界验证：验证 WebSocket 消息
      if (isApiResponse(data)) {
        console.log('✅ WebSocket 消息验证通过');
        // 处理消息
      } else {
        console.warn('⚠️ WebSocket 消息格式无效');
      }
    } catch (error) {
      console.error('❌ WebSocket 消息解析失败:', error);
    }
  };
}

// ==================== 示例 8: IndexedDB 数据边界 ====================

/**
 * 安全地从 IndexedDB 读取数据
 * 
 * 数据边界：IndexedDB → 应用内存
 * 风险：存储的数据可能损坏或版本不兼容
 */
async function loadFromIndexedDB(key: string): Promise<UserProductProfile | null> {
  try {
    // 假设已经打开了 IndexedDB 连接
    const db = await openDatabase();
    const transaction = db.transaction(['configs'], 'readonly');
    const store = transaction.objectStore('configs');
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const data = request.result;

        // 🎯 数据边界验证：验证 IndexedDB 数据
        if (isUserProductProfile(data)) {
          console.log('✅ IndexedDB 数据验证通过');
          resolve(data);
        } else {
          console.warn('⚠️ IndexedDB 数据格式无效');
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('❌ IndexedDB 读取失败');
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ IndexedDB 操作失败:', error);
    return null;
  }
}

// 模拟的 openDatabase 函数
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('myDatabase', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ==================== 最佳实践总结 ====================

/**
 * 数据边界类型守卫使用最佳实践：
 * 
 * 1. 识别数据边界
 *    - localStorage/sessionStorage 读取
 *    - API 响应
 *    - 用户输入（表单、文件上传）
 *    - 跨窗口通信（postMessage）
 *    - WebSocket 消息
 *    - IndexedDB 读取
 *    - URL 参数
 * 
 * 2. 选择合适的验证策略
 *    - 关键数据：使用 Zod 进行详细验证
 *    - 一般数据：使用类型守卫进行快速验证
 *    - 性能敏感：只验证关键字段
 * 
 * 3. 错误处理
 *    - 验证失败时记录详细日志
 *    - 提供合理的默认值或降级方案
 *    - 清除无效数据（localStorage）
 *    - 向用户显示友好的错误消息
 * 
 * 4. 安全考虑
 *    - 永远不要信任外部数据
 *    - 验证数据来源（origin check）
 *    - 防止 XSS 和注入攻击
 *    - 限制数据大小和复杂度
 * 
 * 5. 性能优化
 *    - 避免在热路径中过度验证
 *    - 缓存验证结果（如果适用）
 *    - 使用增量验证（只验证变化的部分）
 *    - 考虑异步验证（大数据集）
 * 
 * 6. 可维护性
 *    - 集中管理验证逻辑
 *    - 使用描述性的错误消息
 *    - 记录验证失败的原因
 *    - 定期审查和更新验证规则
 */

export {
  loadConfigFromStorage,
  saveConfigToStorage,
  fetchUserData,
  callLLMSafely,
  handleFormSubmit,
  handleFileUpload,
  fetchProductList,
  setupWebSocket,
  loadFromIndexedDB
};
