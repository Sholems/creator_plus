import { readVisitorId } from '@/lib/visitor';
import { API_BASE } from '@/lib/env';

interface FetchOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, token } = options;

    const allHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (token) {
      allHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: allHeaders,
      body: body ? JSON.stringify(body) : undefined,
      // Send/receive the httpOnly refresh-token cookie on auth calls.
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      const err = new Error(error.message || `HTTP error ${response.status}`) as Error & {
        status?: number;
      };
      err.status = response.status;
      throw err;
    }

    const text = await response.text();
    if (!text) return undefined as T;

    return JSON.parse(text) as T;
  }

  // Auth
  async register(email: string, password: string, displayName?: string) {
    return this.fetch<{ user: any; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: { email, password, displayName },
    });
  }

  async login(email: string, password: string) {
    return this.fetch<{ user: any; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async getProfile(token: string) {
    return this.fetch<any>('/auth/me', { token });
  }

  /** Exchange the httpOnly refresh cookie for a fresh access token. */
  async refresh() {
    return this.fetch<{ accessToken: string }>('/auth/refresh', { method: 'POST' });
  }

  /** Revoke the refresh token server-side and clear its cookie. */
  async logout() {
    return this.fetch<{ success: boolean }>('/auth/logout', { method: 'POST' });
  }

  async forgotPassword(email: string) {
    return this.fetch<any>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    });
  }

  // Platform status
  async getPlatformStatus() {
    return this.fetch<{ maintenanceMode: boolean; registrationEnabled: boolean }>('/platform/status');
  }

  // Contact
  async submitContact(data: { name: string; email: string; subject: string; message: string; category?: string }) {
    return this.fetch<any>('/contact', {
      method: 'POST',
      body: data,
    });
  }

  // Support tickets
  async createSupportTicket(token: string, data: { subject: string; description: string; category?: string }) {
    return this.fetch<any>('/support-tickets', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async getMyTickets(token: string, params?: { page?: number; perPage?: number; status?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.perPage) searchParams.set('perPage', params.perPage.toString());
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return this.fetch<any>(`/support-tickets${query ? `?${query}` : ''}`, { token });
  }

  async getMyTicket(token: string, id: string) {
    return this.fetch<any>(`/support-tickets/${id}`, { token });
  }

  async replyToTicket(token: string, id: string, message: string) {
    return this.fetch<any>(`/support-tickets/${id}/replies`, {
      method: 'POST',
      body: { message },
      token,
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.fetch<any>('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    });
  }

  async verifyEmail(token: string) {
    return this.fetch<{ success: boolean; email: string }>('/auth/verify-email', {
      method: 'POST',
      body: { token },
    });
  }

  async resendVerification(email: string) {
    return this.fetch<{ success: boolean }>('/auth/resend-verification', {
      method: 'POST',
      body: { email },
    });
  }

  async updateProfile(token: string, data: { displayName?: string; avatar?: string; bio?: string }) {
    return this.fetch<any>('/users/me', {
      method: 'PATCH',
      body: data,
      token,
    });
  }

  // Products
  async getProducts(params?: {
    categoryId?: string;
    creatorId?: string;
    status?: string;
    page?: number;
    perPage?: number;
  }, token?: string) {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.creatorId) searchParams.set('creatorId', params.creatorId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.perPage) searchParams.set('perPage', params.perPage.toString());

    const query = searchParams.toString();
    // token is passed when the viewer is the creator themselves (their own
    // dashboard sees DRAFT/PENDING listings; the public surface stays published-only)
    return this.fetch<any>(`/products${query ? `?${query}` : ''}`, token ? { token } : {});
  }

  async getProduct(slug: string) {
    return this.fetch<any>(`/products/${slug}`);
  }

  // Affiliate program marketplace (public)
  async getAffiliateMarketplace(params?: {
    sort?: string;
    category?: string;
    search?: string;
    perPage?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.perPage) searchParams.set('perPage', params.perPage.toString());
    const query = searchParams.toString();
    return this.fetch<{
      settings: { platformRate: number; holdingDays: number; cookieDays: number; minPayout: number };
      products: any[];
      categories: { id: string; name: string; slug: string }[];
      total: number;
    }>(`/affiliates/marketplace${query ? `?${query}` : ''}`);
  }

  // Affiliate program self-service (authenticated)
  async getAffiliateMe(token: string) {
    return this.fetch<any>('/affiliates/me', { token });
  }

  async applyAffiliate(token: string, data: {
    applicationMessage?: string;
    promotionChannels?: string[];
    websiteUrl?: string;
    socialMediaLinks?: string[];
    country?: string;
    paymentMethod?: string;
    paymentDetails?: string;
    code?: string;
  }) {
    return this.fetch<any>('/affiliates/apply', { method: 'POST', body: data, token });
  }

  async updateAffiliateMe(token: string, data: {
    applicationMessage?: string;
    promotionChannels?: string[];
    websiteUrl?: string;
    socialMediaLinks?: string[];
    country?: string;
    paymentMethod?: string;
    paymentDetails?: string;
    code?: string;
  }) {
    return this.fetch<any>('/affiliates/me', { method: 'PATCH', body: data, token });
  }

  async getAffiliateDashboard(token: string) {
    return this.fetch<any>('/affiliates/dashboard', { token });
  }

  async createAffiliateLink(token: string, data: { productId: string; code?: string }) {
    return this.fetch<any>('/affiliates/links', { method: 'POST', body: data, token });
  }

  async getAffiliateLinks(token: string) {
    return this.fetch<any[]>('/affiliates/links', { token });
  }

  async updateAffiliateLink(token: string, id: string, data: { code?: string; status?: boolean }) {
    return this.fetch<any>(`/affiliates/links/${id}`, { method: 'PATCH', body: data, token });
  }

  async getAffiliateConversions(token: string, params?: { page?: number; perPage?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.perPage) searchParams.set('perPage', params.perPage.toString());
    const query = searchParams.toString();
    return this.fetch<any>(`/affiliates/conversions${query ? `?${query}` : ''}`, { token });
  }

  async requestAffiliatePayout(token: string, data: { amount?: number; method?: string; notes?: string }) {
    return this.fetch<any>('/affiliates/payouts', { method: 'POST', body: data, token });
  }

  async getAffiliatePayouts(token: string) {
    return this.fetch<any[]>('/affiliates/payouts', { token });
  }

  async createProduct(token: string, data: any) {
    return this.fetch<any>('/products', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updateProduct(token: string, id: string, data: any) {
    return this.fetch<any>(`/products/${id}`, {
      method: 'PATCH',
      body: data,
      token,
    });
  }

  async publishProduct(token: string, id: string) {
    return this.fetch<any>(`/products/${id}/publish`, {
      method: 'POST',
      token,
    });
  }

  // Categories
  async getCategories() {
    return this.fetch<any[]>('/categories');
  }

  // Orders
  async getOrders(token: string, params?: { page?: number; perPage?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.perPage) searchParams.set('perPage', params.perPage.toString());

    const query = searchParams.toString();
    return this.fetch<any>(`/orders${query ? `?${query}` : ''}`, { token });
  }

  async getOrder(token: string, id: string) {
    return this.fetch<any>(`/orders/${id}`, { token });
  }

  async createOrder(token: string, items: any[], options?: { couponCode?: string }) {
    const visitorId = readVisitorId();
    const body: any = options?.couponCode ? { items, couponCode: options.couponCode } : { items };
    if (visitorId) body.visitorId = visitorId;
    return this.fetch<any>('/orders', {
      method: 'POST',
      body,
      token,
    });
  }

  // Refunds
  async requestRefund(token: string, orderId: string, reason: string) {
    return this.fetch<any>('/refunds', {
      method: 'POST',
      body: { orderId, reason },
      token,
    });
  }

  async getMyRefunds(token: string) {
    return this.fetch<any[]>('/refunds/mine', { token });
  }

  // Payments
  async getPaymentProviders() {
    return this.fetch<string[]>('/payments/providers');
  }

  async createCheckout(token: string, orderId: string, provider?: string) {
    return this.fetch<any>(`/payments/checkout/${orderId}`, {
      method: 'POST',
      body: provider ? { provider } : {},
      token,
    });
  }

  // Reviews
  async getProductReviews(productId: string, params?: { page?: number; perPage?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.perPage) searchParams.set('perPage', params.perPage.toString());

    const query = searchParams.toString();
    return this.fetch<any>(`/reviews/product/${productId}${query ? `?${query}` : ''}`);
  }

  async createReview(token: string, data: { productId: string; rating: number; title?: string; comment: string }) {
    return this.fetch<any>('/reviews', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async markReviewHelpful(token: string, reviewId: string) {
    return this.fetch<any>(`/reviews/${reviewId}/helpful`, {
      method: 'POST',
      token,
    });
  }

  async reportReview(token: string, reviewId: string, reason: string) {
    return this.fetch<any>(`/reviews/${reviewId}/report`, {
      method: 'POST',
      body: { reason },
      token,
    });
  }

  // Creators
  async getCreatorsDirectory() {
    return this.fetch<{
      data: {
        id: string;
        storeName: string;
        slug: string;
        avatar?: string | null;
        bio?: string | null;
        verified: boolean;
        verificationStatus: string;
        followerCount: number;
        productCount: number;
      }[];
      total: number;
    }>('/creators');
  }

  async applyCreator(token: string, data: { storeName: string; slug: string }) {
    return this.fetch<any>('/creators/apply', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async getCreatorProfile(token: string) {
    return this.fetch<any>('/creators/profile', { token });
  }

  async updateCreatorProfile(token: string, data: any) {
    return this.fetch<any>('/creators/profile', {
      method: 'PATCH',
      body: data,
      token,
    });
  }

  async getCreatorStorefront(slug: string) {
    return this.fetch<any>(`/creators/storefront/${slug}`);
  }

  async getCreatorEarnings(token: string) {
    return this.fetch<any>('/creators/earnings', { token });
  }

  async getCreatorSales(token: string, params?: { page?: number; perPage?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.perPage) searchParams.set('perPage', params.perPage.toString());
    const query = searchParams.toString();
    return this.fetch<any>(`/creators/sales${query ? `?${query}` : ''}`, { token });
  }

  async getMyPayouts(token: string, params?: { page?: number; perPage?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.perPage) searchParams.set('perPage', params.perPage.toString());
    const query = searchParams.toString();
    return this.fetch<any>(`/creators/payouts${query ? `?${query}` : ''}`, { token });
  }

  async requestPayout(token: string, data: { method?: string; notes?: string }) {
    return this.fetch<any>('/creators/payouts', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async getMyBankAccounts(token: string) {
    return this.fetch<any[]>('/creators/bank-accounts', { token });
  }

  async createBankAccount(
    token: string,
    data: { bankName: string; accountNumber: string; accountName: string; isDefault?: boolean },
  ) {
    return this.fetch<any>('/creators/bank-accounts', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async deleteBankAccount(token: string, id: string) {
    return this.fetch<any>(`/creators/bank-accounts/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  async getCreatorVerification(token: string) {
    return this.fetch<any>('/creators/verification', { token });
  }

  async submitVerification(
    token: string,
    data: { identityType: string; identityNumber: string; identityDocument: string },
  ) {
    return this.fetch<any>('/creators/verification', {
      method: 'POST',
      body: data,
      token,
    });
  }

  // Billing
  async getSubscription(token: string) {
    return this.fetch<any>('/billing/subscription', { token });
  }

  async createSubscriptionCheckout(token: string, data: { tier: string; successUrl?: string; cancelUrl?: string }) {
    return this.fetch<any>('/billing/subscription/checkout', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async cancelSubscription(token: string, reason?: string) {
    return this.fetch<any>('/billing/subscription/cancel', {
      method: 'POST',
      body: { reason },
      token,
    });
  }

  async reactivateSubscription(token: string) {
    return this.fetch<any>('/billing/subscription/reactivate', {
      method: 'POST',
      token,
    });
  }

  async getCreditBalance(token: string) {
    return this.fetch<any>('/billing/credits', { token });
  }

  async getCreditPacks() {
    return this.fetch<any[]>('/billing/credit-packs');
  }

  async purchaseCreditPack(token: string, data: { packId: string; successUrl?: string; cancelUrl?: string }) {
    return this.fetch<any>('/billing/credit-packs/checkout', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async getUsageRecords(token: string) {
    return this.fetch<any>('/billing/usage', { token });
  }

  // Storage / Upload
  async uploadFile(token: string, file: File, folder: string = 'uploads'): Promise<{ key: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const response = await fetch(`${this.baseUrl}/storage/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `Upload failed: ${response.status}`);
    }

    return response.json();
  }

  async uploadProductFile(token: string, productId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/products/${productId}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'File upload failed' }));
      throw new Error(error.message || `File upload failed: ${response.status}`);
    }

    return response.json();
  }

  async deleteProductFile(token: string, productId: string, fileId: string) {
    const response = await fetch(`${this.baseUrl}/products/${productId}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'File delete failed' }));
      throw new Error(error.message || `File delete failed: ${response.status}`);
    }

    return response.json();
  }

  // Search
  async searchProducts(query: string, params?: {
    category?: string;
    creator?: string;
    tags?: string[];
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    sort?: string;
    page?: number;
    perPage?: number;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query || '');
    if (params?.category) searchParams.set('category', params.category);
    if (params?.creator) searchParams.set('creator', params.creator);
    if (params?.tags && params.tags.length > 0) searchParams.set('tags', params.tags.join(','));
    if (params?.minPrice !== undefined) searchParams.set('minPrice', params.minPrice.toString());
    if (params?.maxPrice !== undefined) searchParams.set('maxPrice', params.maxPrice.toString());
    if (params?.rating !== undefined) searchParams.set('rating', params.rating.toString());
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.perPage) searchParams.set('perPage', params.perPage.toString());

    return this.fetch<any>(`/search?${searchParams.toString()}`);
  }

  // Cart
  async getCart(token: string) {
    return this.fetch<any>('/cart', { token });
  }

  async addToCart(token: string, data: { productId: string; licenseType?: string; quantity?: number }) {
    return this.fetch<any>('/cart/items', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updateCartItem(token: string, itemId: string, quantity: number) {
    return this.fetch<any>(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: { quantity },
      token,
    });
  }

  async removeFromCart(token: string, itemId: string) {
    return this.fetch<any>(`/cart/items/${itemId}`, {
      method: 'DELETE',
      token,
    });
  }

  async clearCart(token: string) {
    return this.fetch<any>('/cart', {
      method: 'DELETE',
      token,
    });
  }

  // Downloads
  async getDownloads(token: string, params?: { page?: number; perPage?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.perPage) searchParams.set('perPage', params.perPage.toString());

    const query = searchParams.toString();
    return this.fetch<any>(`/downloads${query ? `?${query}` : ''}`, { token });
  }

  async recordDownload(token: string, downloadToken: string) {
    return this.fetch<any>(`/downloads/token/${downloadToken}`, {
      method: 'POST',
      token,
    });
  }

  // Notifications
  async getNotifications(token: string, params?: { page?: number; perPage?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.perPage) searchParams.set('perPage', params.perPage.toString());
    const query = searchParams.toString();
    return this.fetch<any>(`/notifications${query ? `?${query}` : ''}`, { token });
  }

  async getUnreadNotifications(token: string) {
    return this.fetch<number>('/notifications/unread-count', { token });
  }

  async markNotificationRead(token: string, id: string) {
    return this.fetch<any>(`/notifications/${id}/read`, { method: 'PATCH', token });
  }

  async markAllNotificationsRead(token: string) {
    return this.fetch<any>('/notifications/read-all', { method: 'POST', token });
  }

  // Wishlist
  async getWishlist(token: string) {
    return this.fetch<any>('/wishlist', { token });
  }

  async addToWishlist(token: string, productId: string) {
    return this.fetch<any>(`/wishlist/items/${productId}`, {
      method: 'POST',
      token,
    });
  }

  async removeFromWishlist(token: string, productId: string) {
    return this.fetch<any>(`/wishlist/items/${productId}`, {
      method: 'DELETE',
      token,
    });
  }

  // Coupons
  async getMyCoupons(token: string) {
    return this.fetch<any[]>('/coupons/mine', { token });
  }

  async createCoupon(token: string, data: {
    code: string;
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    minPurchase?: number;
    maxUses?: number;
    startDate?: string;
    endDate?: string;
  }) {
    return this.fetch<any>('/coupons', {
      method: 'POST',
      body: data,
      token,
    });
  }

  async updateCoupon(token: string, id: string, data: any) {
    return this.fetch<any>(`/coupons/${id}`, {
      method: 'PATCH',
      body: data,
      token,
    });
  }

  async deleteCoupon(token: string, id: string) {
    return this.fetch<any>(`/coupons/${id}`, {
      method: 'DELETE',
      token,
    });
  }

  async validateCoupon(token: string, code: string, items: { productId: string; quantity: number }[]) {
    return this.fetch<{ valid: boolean; coupon: any; eligibleSubtotal: number; discountAmount: number }>('/coupons/validate', {
      method: 'POST',
      body: { code, items },
      token,
    });
  }

  // Wallet
  async getWallet(token: string) {
    return this.fetch<any>('/payments/wallet', { token });
  }

  async payWithWallet(token: string, orderId: string) {
    return this.fetch<any>(`/payments/wallet/${orderId}`, {
      method: 'POST',
      token,
    });
  }

  // Reviews
  async updateReview(token: string, reviewId: string, data: { rating?: number; title?: string; comment?: string }) {
    return this.fetch<any>(`/reviews/${reviewId}`, {
      method: 'PATCH',
      body: data,
      token,
    });
  }

  async deleteReview(token: string, reviewId: string) {
    return this.fetch<any>(`/reviews/${reviewId}`, {
      method: 'DELETE',
      token,
    });
  }

  // Creators (storefront)
  async getCreatorStorefrontPublic(slug: string) {
    return this.fetch<any>(`/creators/storefront/${slug}`);
  }

  // ------------------------------------------------------------------
  // Admin
  // ------------------------------------------------------------------

  async adminGetStats(token: string) {
    return this.fetch<any>('/admin/stats', { token });
  }

  async adminGetTracking(token: string) {
    return this.fetch<any>('/admin/settings/tracking', { token });
  }

  async adminUpdateTracking(token: string, data: any) {
    return this.fetch<any>('/admin/settings/tracking', { method: 'PUT', body: data, token });
  }

  /** Public endpoint — no auth required. */
  async getPublicTracking() {
    return this.fetch<any>('/platform/tracking');
  }
}

export const api = new ApiClient(API_BASE);
