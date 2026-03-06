/**
 * 字段规范化工具函数
 * 用于处理不同命名约定的字段访问（snake_case, camelCase, kebab-case）
 */

/**
 * 从对象中获取字段值，支持多种命名约定
 *
 * 尝试按顺序访问提供的字段名变体，返回第一个存在的值
 *
 * @param obj 源对象
 * @param fieldNames 字段名变体数组，按优先级排序
 * @param defaultValue 默认值，如果所有字段都不存在则返回此值
 * @returns 字段值或默认值
 *
 * @example
 * const obj = { user_name: 'John', age: 30 };
 * getFieldVariants(obj, ['userName', 'user_name']); // 返回 'John'
 * getFieldVariants(obj, ['email', 'e_mail'], 'N/A'); // 返回 'N/A'
 */
export function getFieldVariants<T = unknown>(
  obj: unknown,
  fieldNames: string[],
  defaultValue?: T
): T | undefined {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }

  const record = obj as Record<string, unknown>;

  for (const fieldName of fieldNames) {
    if (fieldName in record && record[fieldName] !== undefined) {
      return record[fieldName] as T;
    }
  }

  return defaultValue;
}

/**
 * 从对象中获取字段值，自动尝试 snake_case 和 camelCase 两种命名
 *
 * @param obj 源对象
 * @param snakeCaseName snake_case 格式的字段名
 * @param defaultValue 默认值
 * @returns 字段值或默认值
 *
 * @example
 * const obj = { user_name: 'John' };
 * getField(obj, 'user_name'); // 返回 'John'
 *
 * const obj2 = { userName: 'Jane' };
 * getField(obj2, 'user_name'); // 返回 'Jane' (自动尝试 camelCase)
 */
export function getField<T = unknown>(
  obj: unknown,
  snakeCaseName: string,
  defaultValue?: T
): T | undefined {
  const camelCaseName = snakeToCamel(snakeCaseName);
  return getFieldVariants<T>(obj, [snakeCaseName, camelCaseName], defaultValue);
}

/**
 * 将 snake_case 转换为 camelCase
 *
 * @param str snake_case 字符串
 * @returns camelCase 字符串
 *
 * @example
 * snakeToCamel('user_name'); // 返回 'userName'
 * snakeToCamel('first_name_last_name'); // 返回 'firstNameLastName'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * 将 camelCase 转换为 snake_case
 *
 * @param str camelCase 字符串
 * @returns snake_case 字符串
 *
 * @example
 * camelToSnake('userName'); // 返回 'user_name'
 * camelToSnake('firstName'); // 返回 'first_name'
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
