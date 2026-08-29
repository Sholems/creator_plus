/**
 * Fail-fast environment validation. Called once at boot (see main.ts). A
 * marketplace must never start with a missing or default JWT secret — the app
 * would either crash on the first token operation or, worse, sign tokens with a
 * publicly-known key. Surface the problem loudly at startup instead.
 */

const INSECURE_JWT_DEFAULT = 'your-super-secret-jwt-key-change-in-production';

/** Env vars the API cannot run without, in any environment. */
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'] as const;

export function validateEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = REQUIRED.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        `Set them in your environment or .env file before starting the API.`,
    );
  }

  const isProd = env.NODE_ENV === 'production';
  if (isProd && env.JWT_SECRET === INSECURE_JWT_DEFAULT) {
    throw new Error(
      'Refusing to boot in production with the default JWT secret. ' +
        'Set JWT_SECRET to a strong, unique value.',
    );
  }

  if (isProd && (env.JWT_SECRET as string).length < 32) {
    throw new Error(
      'JWT_SECRET is too short for production (need at least 32 characters).',
    );
  }

  if (env.QR_SIGNED_URL_TTL_SECONDS) {
    const ttl = Number(env.QR_SIGNED_URL_TTL_SECONDS);
    if (!Number.isInteger(ttl) || ttl < 60 || ttl > 900) {
      throw new Error(
        'QR_SIGNED_URL_TTL_SECONDS must be an integer between 60 and 900 seconds.',
      );
    }
  }

  const qrStudioEnabled = env.QR_STUDIO_ENABLED !== 'false';
  if (isProd && qrStudioEnabled && env.QR_ANALYTICS_HASH_SECRET && env.QR_ANALYTICS_HASH_SECRET.length < 32) {
    throw new Error(
      'QR_ANALYTICS_HASH_SECRET is too short for production (need at least 32 characters).',
    );
  }
}
