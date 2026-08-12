import { Logger } from '@nestjs/common';

/**
 * Optional error tracking. Sentry is a peer dependency that is only loaded when
 * both SENTRY_DSN is configured and `@sentry/node` is installed, so the app runs
 * fine without it. Install `@sentry/node` and set SENTRY_DSN to activate.
 */
let sentry: { captureException: (e: unknown, hint?: unknown) => void } | null = null;
const logger = new Logger('Observability');

export function initObservability(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const s = require('@sentry/node');
    s.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    });
    sentry = s;
    logger.log('Sentry error tracking initialised');
  } catch {
    logger.warn(
      'SENTRY_DSN is set but @sentry/node is not installed — run `npm i @sentry/node` to enable error tracking.',
    );
  }
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!sentry) return;
  sentry.captureException(error, context ? { extra: context } : undefined);
}
