import { prisma } from '@creatormarket/database';
import { SettingsService } from '../src/settings/settings.service';
import { resetDb } from './helpers';

/**
 * Integration coverage for admin-configurable Paystack settings. Requires a
 * live Postgres (see test/README.md).
 */
describe('SettingsService — Paystack (integration)', () => {
  const service = new SettingsService();
  const ORIGINAL_ENV = process.env.PAYSTACK_SECRET_KEY;

  beforeEach(async () => {
    await resetDb();
    delete process.env.PAYSTACK_SECRET_KEY;
  });
  afterAll(async () => {
    if (ORIGINAL_ENV === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = ORIGINAL_ENV;
    await prisma.$disconnect();
  });

  it('reports nothing configured when neither DB nor env has a key', async () => {
    const masked = await service.getMaskedPaystack();
    expect(masked).toMatchObject({ enabled: false, hasSecretKey: false, source: 'none' });
  });

  it('falls back to the environment key when the DB is empty', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_env_abcdef1234';
    const cfg = await service.getPaystackConfig();
    expect(cfg.secretKey).toBe('sk_env_abcdef1234');
    expect(cfg.source).toBe('env');
    expect(cfg.enabled).toBe(true); // defaults on when a secret exists
  });

  it('stores a secret and returns only a masked preview', async () => {
    const masked = await service.updatePaystack({ secretKey: 'sk_test_123456789', enabled: true });
    expect(masked.hasSecretKey).toBe(true);
    expect(masked.enabled).toBe(true);
    expect(masked.source).toBe('db');
    expect(masked.secretKeyPreview).toBe('sk_test…6789');
    // The raw secret is never in the masked view.
    expect(JSON.stringify(masked)).not.toContain('123456789');
    // ...but the effective config exposes it for the provider.
    expect((await service.getPaystackConfig()).secretKey).toBe('sk_test_123456789');
  });

  it('DB config takes precedence over the environment', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_env_should_lose';
    await service.updatePaystack({ secretKey: 'sk_db_wins_0000' });
    const cfg = await service.getPaystackConfig();
    expect(cfg.secretKey).toBe('sk_db_wins_0000');
    expect(cfg.source).toBe('db');
  });

  it('toggling enabled does not wipe the stored secret', async () => {
    await service.updatePaystack({ secretKey: 'sk_test_keepme_9999' });
    const afterToggle = await service.updatePaystack({ enabled: false });
    expect(afterToggle.enabled).toBe(false);
    expect(afterToggle.hasSecretKey).toBe(true); // secret preserved
    expect((await service.getPaystackConfig()).secretKey).toBe('sk_test_keepme_9999');
  });

  it('updates the public key without touching the secret', async () => {
    await service.updatePaystack({ secretKey: 'sk_test_secret_1234' });
    const masked = await service.updatePaystack({ publicKey: 'pk_test_public_1' });
    expect(masked.publicKey).toBe('pk_test_public_1');
    expect(masked.hasSecretKey).toBe(true);
  });
});
