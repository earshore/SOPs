// Alpine.js 类型声明
declare module 'alpinejs' {
  interface Alpine {
    start(): void;
    [key: string]: any;
  }
  const Alpine: Alpine;
  export default Alpine;
}

declare module '@alpinejs/csp' {
  interface Alpine {
    start(): void;
    [key: string]: any;
  }
  const Alpine: Alpine;
  export default Alpine;
}
