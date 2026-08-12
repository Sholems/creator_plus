import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CreatorsModule } from './creators/creators.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SearchModule } from './search/search.module';
import { StorageModule } from './storage/storage.module';
import { EmailModule } from './email/email.module';
import { BillingModule } from './billing/billing.module';
import { CartModule } from './cart/cart.module';
import { DownloadsModule } from './downloads/downloads.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AdminModule } from './admin/admin.module';
import { RefundsModule } from './refunds/refunds.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CouponsModule } from './coupons/coupons.module';
import { AffiliatesModule } from './affiliates/affiliates.module';
import { ContactModule } from './contact/contact.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { HealthModule } from './health/health.module';
import { buildThrottlerStorage } from './common/throttler-redis.storage';
import { StorageController } from './storage/storage.controller';
import { PaymentsController } from './payments/payments.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Global rate limiting: 100 requests/minute per IP by default. Sensitive
    // auth routes tighten this with @Throttle; webhooks opt out with
    // @SkipThrottle. Backed by Redis when REDIS_URL is set (limits shared across
    // instances); otherwise falls back to the in-memory per-instance store.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      storage: buildThrottlerStorage(),
    }),
    AuthModule,
    UsersModule,
    CreatorsModule,
    ProductsModule,
    CategoriesModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    SearchModule,
    StorageModule,
    EmailModule,
    BillingModule,
    CartModule,
    DownloadsModule,
    WishlistModule,
    AdminModule,
    RefundsModule,
    NotificationsModule,
    CouponsModule,
    AffiliatesModule,
    ContactModule,
    FeatureFlagsModule,
    HealthModule,
  ],
  controllers: [StorageController, PaymentsController],
  providers: [
    // Apply the throttler globally.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
