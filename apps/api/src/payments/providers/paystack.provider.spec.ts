import { PaystackProvider } from './paystack.provider';

describe('PaystackProvider', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.restoreAllMocks();
    fetchMock.mockReset();
    jest.spyOn(global, 'fetch').mockImplementation(fetchMock as any);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.test/pay',
          reference: undefined,
        },
      }),
    });
  });

  it('keeps marketplace checkout references and metadata backwards compatible', async () => {
    const provider = new PaystackProvider('sk_test_x');

    const result = await provider.createCheckout({
      orderId: 'order_123',
      buyerEmail: 'buyer@example.com',
      totalAmount: 2500,
      platformFeePercent: 10,
      currency: 'NGN',
      successUrl: 'https://mycreatorplus.com/checkout/success',
      cancelUrl: 'https://mycreatorplus.com/checkout/cancel',
      items: [],
    });

    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(request.body);

    expect(result.providerReference).toMatch(/^CM_/);
    expect(body.reference).toMatch(/^CM_/);
    expect(body.metadata).toMatchObject({
      purpose: 'marketplace_order',
      orderId: 'order_123',
    });
  });

  it('creates QR Studio checkout references with QR metadata', async () => {
    const provider = new PaystackProvider('sk_test_x');

    const result = await provider.createCheckout({
      orderId: 'qr_payment_123',
      buyerEmail: 'creator@example.com',
      totalAmount: 2000,
      platformFeePercent: 0,
      currency: 'NGN',
      successUrl: 'https://mycreatorplus.com/creator/qr-studio?checkout=success',
      cancelUrl: 'https://mycreatorplus.com/creator/qr-studio?checkout=cancelled',
      items: [],
      purpose: 'qr_studio',
      referencePrefix: 'QR',
      metadata: {
        qrPaymentId: 'qr_payment_123',
        purpose: 'marketplace_order',
      },
    });

    const [, request] = fetchMock.mock.calls[0];
    const body = JSON.parse(request.body);

    expect(result.providerReference).toMatch(/^QR_/);
    expect(body.reference).toMatch(/^QR_/);
    expect(body.metadata).toMatchObject({
      purpose: 'qr_studio',
      qrPaymentId: 'qr_payment_123',
    });
  });
});
