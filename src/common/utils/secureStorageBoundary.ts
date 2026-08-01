// Security-boundary copy only — keep this free of crypto/runtime so settings
// can import it without forcing secureStorage into a static chunk graph.
export const SECURE_STORAGE_SECURITY_BOUNDARY =
  '浏览器本地混淆保存（非服务端加密），密钥仍会在当前页面运行时解密；这不是服务端密钥托管，也不能隔离同源脚本、浏览器扩展或本机访问。';
