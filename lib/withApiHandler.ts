import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger, extractStack } from './logger';
import { persistLog } from './logSink';
import { HttpError } from './httpError';

type ApiHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse;

export function withApiHandler(
  moduleName: string,
  handler: ApiHandler
): ApiHandler {
  return async (req: NextRequest) => {
    const logger = createRequestLogger(moduleName);
    const requestId = crypto.randomUUID();

    // Health check không có ý nghĩa để log DB — bỏ qua hoàn toàn.
    const isHealth = moduleName === 'health' || req.url.includes('/api/health');
    const shouldPersist = !isHealth;

    try {
      logger.info({
        requestId,
        method: req.method,
        url: req.url,
      }, 'Request received');
      if (shouldPersist) {
        await persistLog({
          level: 'info',
          message: 'Request received',
          module: moduleName,
          requestId,
          url: req.url,
          method: req.method,
        });
      }

      const response = await handler(req);

      logger.info({
        requestId,
        status: response.status,
      }, 'Request completed');
      if (shouldPersist) {
        await persistLog({
          level: 'info',
          message: 'Request completed',
          module: moduleName,
          requestId,
          url: req.url,
          method: req.method,
          statusCode: response.status,
        });
      }

      return response;

    } catch (error) {
      if (error instanceof HttpError) {
        const stack = extractStack(error);
        logger.warn({
          requestId,
          error: error.message,
          statusCode: error.statusCode,
          stack,
        }, 'Request rejected');
        // Persist warn đến DB (kèm stack nếu có) — trừ health
        if (shouldPersist) {
          await persistLog({
            level: 'warn',
            message: error.message,
            stacktrace: stack,
            module: moduleName,
            requestId,
            url: req.url,
            method: req.method,
            statusCode: error.statusCode,
            metadata: { name: error.name },
          });
        }

        return NextResponse.json(
          { error: error.message, requestId },
          { status: error.statusCode }
        );
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      const stacktrace = extractStack(error);

      logger.error({
        requestId,
        error: message,
        stack: stacktrace,
      }, 'Request failed');

      // Persist log vào DB (fire-and-forget) — đầy đủ message + stacktrace, trừ health
      if (shouldPersist) {
        await persistLog({
          level: 'error',
          message,
          stacktrace,
          module: moduleName,
          requestId,
          url: req.url,
          method: req.method,
          statusCode: 500,
          metadata: { name: error instanceof Error ? error.name : typeof error },
        });
      }

      // Trả về client message chung chung (không leak stacktrace)
      return NextResponse.json(
        { error: 'Internal server error', requestId },
        { status: 500 }
      );
    }
  };
}
