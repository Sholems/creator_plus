import { validateEnv } from './validate-env';

describe('validateEnv', () => {
  const base = { DATABASE_URL: 'postgresql://x', JWT_SECRET: 'a'.repeat(40) };

  it('passes when required vars are present', () => {
    expect(() => validateEnv({ ...base } as any)).not.toThrow();
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() => validateEnv({ JWT_SECRET: 'a'.repeat(40) } as any)).toThrow(/DATABASE_URL/);
  });

  it('throws when JWT_SECRET is missing', () => {
    expect(() => validateEnv({ DATABASE_URL: 'postgresql://x' } as any)).toThrow(/JWT_SECRET/);
  });

  it('rejects the insecure default secret in production', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://x',
        JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
        NODE_ENV: 'production',
      } as any),
    ).toThrow(/default JWT secret/);
  });

  it('rejects a too-short secret in production', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://x',
        JWT_SECRET: 'short',
        NODE_ENV: 'production',
      } as any),
    ).toThrow(/at least 32/);
  });

  it('allows a short secret outside production', () => {
    expect(() =>
      validateEnv({ DATABASE_URL: 'postgresql://x', JWT_SECRET: 'short' } as any),
    ).not.toThrow();
  });

  it('rejects invalid QR signed URL TTL values', () => {
    expect(() =>
      validateEnv({
        ...base,
        QR_SIGNED_URL_TTL_SECONDS: '30',
      } as any),
    ).toThrow(/QR_SIGNED_URL_TTL_SECONDS/);
  });

  it('rejects a too-short QR analytics hash secret in production when QR Studio is enabled', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        QR_ANALYTICS_HASH_SECRET: 'short',
      } as any),
    ).toThrow(/QR_ANALYTICS_HASH_SECRET/);
  });

  it('allows a short QR analytics hash secret in production when QR Studio is disabled', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        QR_STUDIO_ENABLED: 'false',
        QR_ANALYTICS_HASH_SECRET: 'short',
      } as any),
    ).not.toThrow();
  });
});
