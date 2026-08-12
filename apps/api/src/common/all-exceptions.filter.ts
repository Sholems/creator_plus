import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { captureException } from './observability';

/**
 * Global error boundary. Maps every thrown error to a consistent JSON shape,
 * logs 5xx with a stack (and forwards to Sentry when configured) while keeping
 * 4xx at warn level. Ensures clients never receive an unstructured stack trace.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';
    const message =
      typeof body === 'string' ? body : (body as { message?: unknown }).message ?? body;

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      captureException(exception, { method: req.method, url: req.url });
    } else {
      this.logger.warn(`${req.method} ${req.url} -> ${status}: ${JSON.stringify(message)}`);
    }

    res.status(status).json({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
