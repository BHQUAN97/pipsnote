import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  // Đảm bảo error object (err/error) không bị mất stack — pino render {…, stack}
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export function createRequestLogger(module: string) {
  return logger.child({ module });
}

// Tiện ích: trích stack có ý nghĩa từ lỗi để lưu DB đầy đủ
export function extractStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack || `${error.name}: ${error.message}`;
  }
  if (typeof error === 'object' && error !== null && 'stack' in error) {
    const s = (error as { stack?: unknown }).stack;
    return typeof s === 'string' ? s : undefined;
  }
  return undefined;
}