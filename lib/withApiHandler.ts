import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger } from './logger';
import { persistLog } from './logSink';

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

      const response = await handler(req);

      logger.info({
        requestId,
        status: response.status,
      }, 'Request completed');

      return response;

    } catch (error) {
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
