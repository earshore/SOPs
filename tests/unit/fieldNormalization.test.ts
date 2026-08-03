/**
 * fieldNormalization 单元测试
 * 覆盖不同命名约定字段访问与 snake/camel 互转
 */

import { describe, expect, it } from 'vitest';
import {
  camelToSnake,
  getField,
  getFieldVariants,
  snakeToCamel,
} from '@/modules/app_center/views/master_analysis/utils/fieldNormalization';

describe('fieldNormalization - getFieldVariants', () => {
  it('按优先级返回第一个存在的字段', () => {
    const obj = { user_name: 'John', userName: 'Jane' };
    expect(getFieldVariants(obj, ['userName', 'user_name'])).toBe('Jane');
    expect(getFieldVariants(obj, ['user_name', 'userName'])).toBe('John');
    expect(getFieldVariants(obj, ['email', 'e_mail'], 'N/A')).toBe('N/A');
  });

  it('跳过 undefined 值并回退默认值', () => {
    const obj = { title: undefined, name: 'x' };
    expect(getFieldVariants(obj, ['title', 'name'])).toBe('x');
    expect(getFieldVariants(obj, ['missing'], 'fallback')).toBe('fallback');
  });

  it('对非对象输入直接返回默认值', () => {
    expect(getFieldVariants(null, ['a'], 'd')).toBe('d');
    expect(getFieldVariants('string', ['a'], 'd')).toBe('d');
    expect(getFieldVariants(undefined, ['a'], 'd')).toBe('d');
  });
});

describe('fieldNormalization - getField / convert', () => {
  it('getField 同时尝试 snake_case 与 camelCase', () => {
    expect(getField({ user_name: 'A' }, 'user_name')).toBe('A');
    expect(getField({ userName: 'B' }, 'user_name')).toBe('B');
    expect(getField({}, 'user_name', 'none')).toBe('none');
  });

  it('snakeToCamel 与 camelToSnake 互转', () => {
    expect(snakeToCamel('user_name')).toBe('userName');
    expect(snakeToCamel('first_name_last_name')).toBe('firstNameLastName');
    expect(camelToSnake('userName')).toBe('user_name');
    expect(camelToSnake('firstName')).toBe('first_name');
  });
});
