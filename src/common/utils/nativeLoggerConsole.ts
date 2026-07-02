type NativeLoggerConsole = Pick<Console, 'debug' | 'info' | 'log' | 'warn' | 'error'>;

declare global {
  var nativeLoggerConsole: NativeLoggerConsole;
}

const globalScope = globalThis as typeof globalThis & {
  nativeLoggerConsole?: NativeLoggerConsole;
};

if (!globalScope.nativeLoggerConsole) {
  globalScope.nativeLoggerConsole = globalThis.console;
}

export {};
