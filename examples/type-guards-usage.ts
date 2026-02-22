// examples/type-guards-usage.ts
// ================================================================
// 类型守卫使用示例
// 展示如何在实际代码中使用类型守卫进行运行时类型检查
// 包含 Zod 验证示例
// ================================================================

import {
  isUserProductProfile,
  isScrapedDataItem,
  isApiResponse,
  isLLMChatCompletionResponse,
  isAmazonProductData,
  isAnalysisReport,
  isArrayOf,
  isOptional,
  isString,
  isObject
} from '../src/common/guards/typeGuards';

// 导入 Zod schemas
import {
  UserProductProfileSchema,
  ScrapedDataItemSchema,
  AmazonProductDataSchema,
  LLMChatCompletionResponseSchema
} from '../src/common/guards/zodSchemas';

import type { UserProductProfile, ScrapedDataItem } from '../src/types/state';
import type { ApiResponse, AmazonProductData } from '../src/types/api';

// ==================== 示例 1: API 响应验证 ====================

/**
 * 安全地处理 API 响应
 */
async function fetchUserProfile(userId: string): Promise<UserProductProfile | null> {
  try {
    const response = await fetch(`/api/users/${userId}/profile`);
    const data = await response.json();

    // 使用类型守卫验证响应数据
    if (isApiResponse(data, isUserProductProfile)) {
      if (data.success && data.data) {
        // TypeScript 现在知道 data.data 是 UserProductProfile 类型
        console.log('用户配置加载成功:', data.data.targetMarket);
        return data.data;
      } else {
        console.error('API 返回失败:', data.error?.message);
        return null;
      }
    } else {
      console.error('API 响应格式无效');
      return null;
    }
  } catch (error) {
    console.error('请求失败:', error);
    return null;
  }
}

// ==================== 示例 2: LocalStorage 数据验证 ====================

/**
 * 从 localStorage 安全地加载用户配置
 */
function loadUserProfileFromStorage(): UserProductProfile | null {
  try {
    const stored = localStorage.getItem('userProductProfile');
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // 使用类型守卫验证存储的数据
    if (isUserProductProfile(parsed)) {
      console.log('从存储加载用户配置成功');
      return parsed;
    } else {
      console.warn('存储的用户配置格式无效，已清除');
      localStorage.removeItem('userProductProfile');
      return null;
    }
  } catch (error) {
    console.error('加载用户配置失败:', error);
    return null;
  }
}

/**
 * 安全地保存用户配置到 localStorage
 */
function saveUserProfileToStorage(profile: unknown): boolean {
  // 在保存前验证数据
  if (!isUserProductProfile(profile)) {
    console.error('无法保存：数据格式无效');
    return false;
  }

  try {
    localStorage.setItem('userProductProfile', JSON.stringify(profile));
    console.log('用户配置已保存');
    return true;
  } catch (error) {
    console.error('保存用户配置失败:', error);
    return false;
  }
}

// ==================== 示例 3: 数组数据验证 ====================

/**
 * 验证并处理抓取的产品数据
 */
function processScrapedProducts(data: unknown): ScrapedDataItem[] {
  // 验证是否为 ScrapedDataItem 数组
  if (isArrayOf(data, isScrapedDataItem)) {
    console.log(`处理 ${data.length} 个产品数据`);
    
    // TypeScript 现在知道 data 是 ScrapedDataItem[]
    return data.filter(item => item.price !== undefined && item.price > 0);
  } else {
    console.error('产品数据格式无效');
    return [];
  }
}

// ==================== 示例 4: LLM 响应处理 ====================

/**
 * 安全地处理 LLM API 响应
 */
async function generatePrompt(input: string): Promise<string | null> {
  try {
    const response = await fetch('/api/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: input }]
      })
    });

    const data = await response.json();

    // 验证 LLM 响应格式
    if (isLLMChatCompletionResponse(data)) {
      const message = data.choices[0]?.message;
      if (message && message.content) {
        console.log('LLM 响应成功，tokens:', data.usage?.total_tokens);
        return message.content;
      }
    }

    console.error('LLM 响应格式无效');
    return null;
  } catch (error) {
    console.error('LLM 请求失败:', error);
    return null;
  }
}

// ==================== 示例 5: 数据边界验证 ====================

/**
 * 处理来自外部源的数据（如 API、用户输入、文件上传）
 */
function handleExternalData(data: unknown): void {
  // 在数据边界处进行验证
  if (isAmazonProductData(data)) {
    // 安全地使用数据
    console.log(`产品: ${data.title} (${data.asin})`);
    console.log(`价格: $${data.price ?? 'N/A'}`);
    console.log(`评分: ${data.rating ?? 'N/A'} (${data.reviewCount ?? 0} 评论)`);
  } else {
    console.error('数据格式不符合 AmazonProductData 规范');
    // 可以记录详细的验证失败信息用于调试
    console.debug('接收到的数据:', data);
  }
}

// ==================== 示例 6: 可选字段处理 ====================

/**
 * 处理可能包含可选字段的配置
 */
function updateConfiguration(config: unknown): void {
  if (!isObject(config)) {
    console.error('配置必须是对象');
    return;
  }

  // 验证可选的字符串字段
  if ('apiKey' in config) {
    const apiKey = config.apiKey;
    if (isOptional(apiKey, isString)) {
      if (apiKey) {
        console.log('API Key 已设置');
        // 使用 API Key
      } else {
        console.log('API Key 未设置');
      }
    }
  }

  // 验证必需的字符串字段
  if ('endpoint' in config) {
    const endpoint = config.endpoint;
    if (isString(endpoint)) {
      console.log('API 端点:', endpoint);
    } else {
      console.error('缺少必需的 endpoint 字段');
    }
  }
}

// ==================== 示例 7: 错误处理中的类型守卫 ====================

/**
 * 安全地处理可能失败的操作
 */
async function safeOperation<T>(
  operation: () => Promise<T>,
  validator: (value: unknown) => value is T
): Promise<T | null> {
  try {
    const result = await operation();
    
    // 验证操作结果
    if (validator(result)) {
      return result;
    } else {
      console.error('操作返回了无效的数据格式');
      return null;
    }
  } catch (error) {
    console.error('操作失败:', error);
    return null;
  }
}

// 使用示例
async function example() {
  const profile = await safeOperation(
    () => fetch('/api/profile').then(r => r.json()),
    isUserProductProfile
  );

  if (profile) {
    console.log('配置加载成功:', profile.targetMarket);
  }
}

// ==================== 示例 8: 状态迁移和版本控制 ====================

/**
 * 处理不同版本的数据格式
 */
function migrateUserProfile(data: unknown): UserProductProfile | null {
  // 检查是否已经是最新格式
  if (isUserProductProfile(data)) {
    return data;
  }

  // 尝试从旧版本迁移
  if (isObject(data)) {
    console.log('检测到旧版本数据，尝试迁移...');
    
    // 添加缺失的字段并设置默认值
    const migrated = {
      targetMarket: ('targetMarket' in data && isString(data.targetMarket)) ? data.targetMarket : 'English',
      keywordsTier1: ('keywordsTier1' in data && isString(data.keywordsTier1)) ? data.keywordsTier1 : '',
      keywordsTier2: ('keywordsTier2' in data && isString(data.keywordsTier2)) ? data.keywordsTier2 : '',
      audience: ('audience' in data && isString(data.audience)) ? data.audience : '',
      usps: ('usps' in data && isString(data.usps)) ? data.usps : '',
      specs: ('specs' in data && isString(data.specs)) ? data.specs : '',
      socialHook: ('socialHook' in data && isString(data.socialHook)) ? data.socialHook : '',
      negative: ('negative' in data && isString(data.negative)) ? data.negative : '',
      tone: ('tone' in data && isString(data.tone)) ? data.tone : 'professional',
      customStrategy: ('customStrategy' in data && isString(data.customStrategy)) ? data.customStrategy : '',
      useRufus: ('useRufus' in data && typeof data.useRufus === 'boolean') ? data.useRufus : true,
      useEmoji: ('useEmoji' in data && typeof data.useEmoji === 'boolean') ? data.useEmoji : true,
      useCosmo: ('useCosmo' in data && typeof data.useCosmo === 'boolean') ? data.useCosmo : true,
      selectedReportSections: ('selectedReportSections' in data && Array.isArray(data.selectedReportSections)) ? data.selectedReportSections : [],
      charLimit: ('charLimit' in data && typeof data.charLimit === 'number') ? data.charLimit : 5000
    };

    // 验证迁移后的数据
    if (isUserProductProfile(migrated)) {
      console.log('数据迁移成功');
      return migrated;
    }
  }

  console.error('无法迁移数据：格式不兼容');
  return null;
}

// ==================== 示例 9: 表单验证 ====================

/**
 * 验证用户提交的表单数据
 */
function validateFormData(formData: FormData): UserProductProfile | null {
  const data = {
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

  // 使用类型守卫验证表单数据
  if (isUserProductProfile(data)) {
    console.log('表单验证通过');
    return data;
  } else {
    console.error('表单数据验证失败');
    return null;
  }
}

// ==================== 示例 10: 中间件中的类型守卫 ====================

/**
 * 状态管理中间件：验证状态更新
 */
function createValidationMiddleware<T>(
  validator: (value: unknown) => value is T
) {
  return (next: (value: T) => void) => {
    return (value: unknown) => {
      if (validator(value)) {
        // 类型安全地传递给下一个中间件
        next(value);
      } else {
        console.error('状态更新验证失败，已拒绝更新');
        console.debug('无效的值:', value);
      }
    };
  };
}

// 使用示例
const validateAndUpdate = createValidationMiddleware(isUserProductProfile);
const updateState = (profile: UserProductProfile) => {
  console.log('状态已更新:', profile);
};

const safeUpdate = validateAndUpdate(updateState);

// 这会通过验证
safeUpdate({
  targetMarket: 'English',
  keywordsTier1: 'test',
  keywordsTier2: 'test',
  audience: 'test',
  usps: 'test',
  specs: 'test',
  socialHook: 'test',
  negative: 'test',
  tone: 'professional',
  customStrategy: '',
  useRufus: true,
  useEmoji: true,
  useCosmo: true,
  selectedReportSections: [],
  charLimit: 5000
});

// 这会被拒绝
safeUpdate({ invalid: 'data' });

// ==================== 示例 11: 使用 Zod 进行详细验证 ====================

/**
 * 使用 Zod 获取详细的验证错误信息
 */
function validateWithZod(data: unknown): UserProductProfile | null {
  const result = UserProductProfileSchema.safeParse(data);
  
  if (result.success) {
    console.log('Zod 验证通过');
    return result.data;
  } else {
    console.error('Zod 验证失败:');
    result.error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    return null;
  }
}

/**
 * 使用 Zod 进行数据转换和验证
 */
function parseAndValidateFormData(formData: FormData): UserProductProfile | null {
  try {
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

    // Zod 会自动进行类型转换和验证
    const validated = UserProductProfileSchema.parse(rawData);
    console.log('表单数据验证成功');
    return validated;
  } catch (error) {
    if (error instanceof Error) {
      console.error('表单验证失败:', error.message);
    }
    return null;
  }
}

/**
 * 使用 Zod 验证 API 响应
 */
async function fetchProductWithZod(asin: string): Promise<AmazonProductData | null> {
  try {
    const response = await fetch(`/api/products/${asin}`);
    const data = await response.json();

    // 使用 Zod 验证响应数据
    const result = AmazonProductDataSchema.safeParse(data);
    
    if (result.success) {
      console.log('产品数据验证通过:', result.data.title);
      return result.data;
    } else {
      console.error('产品数据格式无效:');
      result.error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      return null;
    }
  } catch (error) {
    console.error('获取产品数据失败:', error);
    return null;
  }
}

/**
 * 使用 Zod 验证数组数据
 */
function validateProductList(data: unknown): AmazonProductData[] {
  const ArraySchema = AmazonProductDataSchema.array();
  const result = ArraySchema.safeParse(data);
  
  if (result.success) {
    console.log(`验证通过: ${result.data.length} 个产品`);
    return result.data;
  } else {
    console.error('产品列表验证失败');
    return [];
  }
}

/**
 * 使用 Zod 进行部分验证（允许额外字段）
 */
function validatePartialData(data: unknown) {
  // 使用 partial() 使所有字段变为可选
  const PartialSchema = UserProductProfileSchema.partial();
  const result = PartialSchema.safeParse(data);
  
  if (result.success) {
    console.log('部分数据验证通过');
    return result.data;
  } else {
    console.error('部分数据验证失败');
    return null;
  }
}

// ==================== 最佳实践总结 ====================

/**
 * 类型守卫使用最佳实践：
 * 
 * 1. 在数据边界使用类型守卫
 *    - API 响应
 *    - localStorage/sessionStorage
 *    - 用户输入
 *    - 文件上传
 *    - 外部库返回值
 * 
 * 2. 组合类型守卫
 *    - 使用 isArrayOf 验证数组
 *    - 使用 isOptional/isNullable 处理可选字段
 *    - 创建自定义组合守卫
 * 
 * 3. 提供友好的错误信息
 *    - 记录验证失败的详细信息
 *    - 在开发环境输出调试信息
 *    - 向用户显示可理解的错误消息
 * 
 * 4. 性能考虑
 *    - 避免在热路径中过度使用类型守卫
 *    - 对于已知类型的内部数据，使用类型断言
 *    - 缓存验证结果（如果适用）
 * 
 * 5. 版本兼容性
 *    - 使用类型守卫处理数据迁移
 *    - 支持向后兼容的数据格式
 *    - 记录数据格式变更
 * 
 * 6. Zod 验证优势
 *    - 提供详细的错误信息（字段路径、错误类型）
 *    - 支持数据转换（字符串转数字、日期解析等）
 *    - 支持复杂验证规则（正则表达式、自定义验证器）
 *    - 可以生成 TypeScript 类型（类型推断）
 *    - 支持 schema 组合和复用
 * 
 * 7. 何时使用 Zod vs 手动类型守卫
 *    - Zod: 需要详细错误信息、复杂验证规则、数据转换
 *    - 手动守卫: 简单快速检查、性能敏感场景、已有守卫逻辑
 */

export {
  fetchUserProfile,
  loadUserProfileFromStorage,
  saveUserProfileToStorage,
  processScrapedProducts,
  generatePrompt,
  handleExternalData,
  updateConfiguration,
  safeOperation,
  migrateUserProfile,
  validateFormData,
  createValidationMiddleware,
  validateWithZod,
  parseAndValidateFormData,
  fetchProductWithZod,
  validateProductList,
  validatePartialData
};


// ==================== 示例 15: 使用 Zod 在 API 边界验证 ====================

/**
 * 使用 Zod Schema 验证 API 响应
 * 
 * 优势：
 * - 更强大的验证能力（嵌套对象、数组、正则等）
 * - 自动类型推断
 * - 详细的错误信息
 * - 支持数据转换和默认值
 */
async function fetchUserProfileWithZod(userId: string): Promise<UserProductProfile | null> {
  try {
    const response = await fetch(`/api/users/${userId}/profile`);
    const data = await response.json();

    // 使用 Zod Schema 验证
    const result = UserProductProfileSchema.safeParse(data);

    if (result.success) {
      // TypeScript 自动推断类型
      console.log('✅ 用户配置验证成功:', result.data.targetMarket);
      return result.data;
    } else {
      // 详细的错误信息
      console.error('❌ 验证失败:', result.error.errors);
      result.error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      return null;
    }
  } catch (error) {
    console.error('请求失败:', error);
    return null;
  }
}

// ==================== 示例 16: 使用 Zod 在 localStorage 边界验证 ====================

/**
 * 使用 Zod 验证 localStorage 数据
 */
function loadUserProfileFromStorageWithZod(): UserProductProfile | null {
  try {
    const stored = localStorage.getItem('userProductProfile');
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // 使用 Zod 验证
    const result = UserProductProfileSchema.safeParse(parsed);

    if (result.success) {
      console.log('✅ 从存储加载用户配置成功（Zod 验证通过）');
      return result.data;
    } else {
      console.warn('⚠️ 存储的用户配置格式无效，已清除');
      console.error('验证错误:', result.error.errors);
      localStorage.removeItem('userProductProfile');
      return null;
    }
  } catch (error) {
    console.error('加载用户配置失败:', error);
    return null;
  }
}

/**
 * 使用 Zod 验证后保存到 localStorage
 */
function saveUserProfileToStorageWithZod(profile: unknown): boolean {
  // 使用 Zod 验证
  const result = UserProductProfileSchema.safeParse(profile);

  if (!result.success) {
    console.error('❌ 无法保存：数据格式无效');
    result.error.errors.forEach(err => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    return false;
  }

  try {
    // 保存验证后的数据（可能经过了类型转换）
    localStorage.setItem('userProductProfile', JSON.stringify(result.data));
    console.log('✅ 用户配置已保存（Zod 验证通过）');
    return true;
  } catch (error) {
    console.error('保存失败:', error);
    return false;
  }
}

// ==================== 示例 17: 使用 Zod 验证数组数据 ====================

/**
 * 验证产品列表（使用 Zod）
 */
function validateProductListWithZod(data: unknown): AmazonProductData[] {
  // 创建数组 Schema
  const ArraySchema = AmazonProductDataSchema.array();
  const result = ArraySchema.safeParse(data);

  if (result.success) {
    console.log(`✅ 验证成功：${result.data.length} 个产品`);
    return result.data;
  } else {
    console.error('❌ 产品列表验证失败:', result.error.errors);
    return [];
  }
}

// ==================== 示例 18: 使用 Zod 部分验证 ====================

/**
 * 验证部分更新数据（使用 Zod partial）
 */
function validatePartialUpdateWithZod(data: unknown): Partial<UserProductProfile> | null {
  // 使用 partial() 使所有字段变为可选
  const PartialSchema = UserProductProfileSchema.partial();
  const result = PartialSchema.safeParse(data);

  if (result.success) {
    console.log('✅ 部分更新数据验证成功');
    return result.data;
  } else {
    console.error('❌ 部分更新数据验证失败:', result.error.errors);
    return null;
  }
}

// ==================== 示例 19: 使用 Zod 进行数据转换 ====================

/**
 * 使用 Zod 进行数据转换和验证
 */
function parseFormDataWithZod(formData: FormData): UserProductProfile | null {
  // 从 FormData 提取数据
  const rawData = {
    targetMarket: formData.get('targetMarket') as string,
    keywordsTier1: formData.get('keywordsTier1') as string,
    keywordsTier2: formData.get('keywordsTier2') as string,
    audience: formData.get('audience') as string,
    usps: formData.get('usps') as string,
    specs: formData.get('specs') as string,
    socialHook: formData.get('socialHook') as string,
    negative: formData.get('negative') as string,
    tone: formData.get('tone') as string,
    customStrategy: formData.get('customStrategy') as string,
    useRufus: formData.get('useRufus') === 'true',
    useEmoji: formData.get('useEmoji') === 'true',
    useCosmo: formData.get('useCosmo') === 'true',
    selectedReportSections: JSON.parse(formData.get('selectedReportSections') as string || '[]'),
    charLimit: parseInt(formData.get('charLimit') as string || '5000', 10)
  };

  // Zod 会自动进行类型转换和验证
  const result = UserProductProfileSchema.safeParse(rawData);

  if (result.success) {
    console.log('✅ 表单数据验证成功');
    return result.data;
  } else {
    console.error('❌ 表单数据验证失败:', result.error.errors);
    return null;
  }
}

// ==================== 示例 20: 使用 Zod 验证 API 响应（复杂类型）====================

/**
 * 验证复杂的 LLM API 响应
 */
async function validateLLMResponseWithZod(prompt: string): Promise<string | null> {
  try {
    const response = await fetch('/api/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    const data = await response.json();

    // 使用 Zod 验证复杂的响应结构
    const result = LLMChatCompletionResponseSchema.safeParse(data);

    if (result.success) {
      const message = result.data.choices[0]?.message?.content;
      console.log('✅ LLM 响应验证成功');
      return message || null;
    } else {
      console.error('❌ LLM 响应验证失败:', result.error.errors);
      return null;
    }
  } catch (error) {
    console.error('请求失败:', error);
    return null;
  }
}

// ==================== 示例 21: 在中间件中使用 Zod 验证 ====================

/**
 * 创建带 Zod 验证的 API 中间件
 */
function createValidatedApiMiddleware<T>(schema: import('zod').ZodSchema<T>) {
  return async (request: Request): Promise<T | null> => {
    try {
      const data = await request.json();
      const result = schema.safeParse(data);

      if (result.success) {
        console.log('✅ 请求数据验证成功');
        return result.data;
      } else {
        console.error('❌ 请求数据验证失败:', result.error.errors);
        // 可以在这里返回 400 错误响应
        return null;
      }
    } catch (error) {
      console.error('解析请求失败:', error);
      return null;
    }
  };
}

// 使用示例
const validateUserProfile = createValidatedApiMiddleware(UserProductProfileSchema);

// ==================== 导出所有示例 ====================

export {
  // 原有示例
  fetchUserProfile,
  loadUserProfileFromStorage,
  saveUserProfileToStorage,
  
  // Zod 验证示例
  fetchUserProfileWithZod,
  loadUserProfileFromStorageWithZod,
  saveUserProfileToStorageWithZod,
  validateProductListWithZod,
  validatePartialUpdateWithZod,
  parseFormDataWithZod,
  validateLLMResponseWithZod,
  createValidatedApiMiddleware,
  validateUserProfile
};
