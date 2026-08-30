import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger } from './logger';
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

    try {
      logger.info({
        requestId,
        method: req.method,
        url: req.url,
      }, 'Request received');
      await persistLog({
        level: 'info',
        message: 'Request received',
        module: moduleName,
        requestId,
        url: req.url,
        method: req.method,
      });

      const response = await handler(req);

      logger.info({
        requestId,
        status: response.status,
      }, 'Request completed');
      await persistLog({
        level: 'info',
        message: 'Request completed',
        module: moduleName,
        requestId,
        url: req.url,
        method: req.method,
        statusCode: response.status,
      });

      return response;

    } catch (error) {
      if (error instanceof HttpError) {
        logger.warn({
          requestId,
          error: error.message,
          statusCode: error.statusCode,
        }, 'Request rejected');
        // Persist warn đến DB
        await persistLog({
          level: 'warn',
          message: error.message,
          module: moduleName,
          requestId,
          url: req.url,
          method: req.method,
          statusCode: error.statusCode,
        });

        return NextResponse.json(
          { error: error.message, requestId },
          { status: error.statusCode }
        );
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      const stacktrace = error instanceof Error ? error.stack : undefined;

      logger.error({
        requestId,
        error: message,
        stack: stacktrace,
      }, 'Request failed');

      // Persist log vào DB (fire-and-forget)
      await persistLog({
        level: 'error',
        message,
        stacktrace,
        module: moduleName,
        requestId,
        url: req.url,
        method: req.method,
        statusCode: 500,
      });

      // Trả về client message chung chung (không leak stacktrace)
      return NextResponse.json(
        { error: 'Internal server error', requestId },
        { status: 500 }
      );
    }
  };
}
