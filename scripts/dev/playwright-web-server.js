import { createServer } from 'vite';

const port = Number(process.env.PORT || 5173);
const server = await createServer({
  configFile: 'vite.config.js',
  server: {
    host: '127.0.0.1',
    port,
    strictPort: true
  }
});

let isClosing = false;

async function closeServer(exitCode) {
  if (isClosing) {
    return;
  }

  isClosing = true;
  try {
    await server.close();
  } finally {
    process.exit(exitCode);
  }
}

process.on('SIGINT', () => {
  void closeServer(0);
});

process.on('SIGTERM', () => {
  void closeServer(0);
});

process.on('uncaughtException', (error) => {
  console.error(error);
  void closeServer(1);
});

process.on('unhandledRejection', (error) => {
  console.error(error);
  void closeServer(1);
});

await server.listen();
server.printUrls();

await new Promise(() => {});
