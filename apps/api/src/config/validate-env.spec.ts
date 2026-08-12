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
});
