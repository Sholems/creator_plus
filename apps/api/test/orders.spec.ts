import { prisma } from '@creatorplus/database';
import { OrdersService } from '../src/orders/orders.service';
import { resetDb, createUser, createCreatorWithProduct } from './helpers';

/**
 * Integration coverage for order pricing in Decimal — H4. No coupon is used, so
 * a bare stub stands in for CouponsService. Requires a live Postgres.
 */
describe('OrdersService.create pricing (integration)', () => {
  const couponsStub = {} as any;
  const service = new OrdersService(couponsStub);

  beforeEach(() => resetDb());
  afterAll(() => prisma.$disconnect());

  it('prices a multi-quantity line exactly (no float drift)', async () => {
    const buyer = await createUser();
    const { product } = await createCreatorWithProduct(33.33);

    const order = await service.create(buyer.id, [
      { productId: product.id, quantity: 3, licenseType: 'personal' },
    ]);

    // 33.33 * 3 = 99.99 exactly — the classic float trap.
    expect(order.totalAmount.toString()).toBe('99.99');
    expect(order.items[0].unitPrice.toString()).toBe('33.33');
    expect(order.items[0].totalPrice.toString()).toBe('99.99');
  });

  it('sums multiple line items exactly and takes prices from the server', async () => {
    const buyer = await createUser();
    const a = await createCreatorWithProduct(19.99);
    const b = await createCreatorWithProduct(5.5);

    const order = await service.create(buyer.id, [
      // A client-supplied price must be ignored — server price wins.
      { productId: a.product.id, price: 1, quantity: 2, licenseType: 'personal' },
      { productId: b.product.id, quantity: 1, licenseType: 'commercial' },
    ]);

    // (19.99 * 2) + 5.50 = 45.48
    expect(order.totalAmount.toString()).toBe('45.48');
  });
});
