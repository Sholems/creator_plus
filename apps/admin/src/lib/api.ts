const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://api.mycreatorplus.com/api/v1'
    : 'http://localhost:3001/api/v1');
export const WEB_URL =
  process.env.NEXT_PUBLIC_WEB_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://mycreatorplus.com' : 'http://localhost:3000');

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminStats {
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingProducts: number;
  pendingReviews: number;
  pendingRefunds: number;
  pendingPayouts: number;
  pendingAffiliates: number;
  openFraudFlags: number;
  pendingVerifications: number;
  totalCreators: number;
  activeAffiliates: number;
  revenueTrend: { date: string; value: number }[];
  orderTrend: { date: string; value: number }[];
  userTrend: { date: string; value: number }[];
  recentOrders: any[];
  pendingProductList: any[];
}

interface FetchOptions {
  method?: string;
  body?: any;
  token?: string;
}

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: any; accessToken: string; requiresTwoFactor?: boolean; tempToken?: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  verifyTwoFactorLogin: (tempToken: string, code: string) =>
    request<{ user: any; accessToken: string }>('/auth/2fa/verify', {
      method: 'POST',
      body: { tempToken, code },
    }),

  getProfile: (token: string) => request<any>('/auth/me', { token }),

  getTwoFactorStatus: (token: string) =>
    request<{ enabled: boolean }>('/auth/2fa/status', { token }),

  setupTwoFactor: (token: string) =>
    request<{ secret: string; otpauthUri: string }>('/auth/2fa/setup', { method: 'POST', token }),

  enableTwoFactor: (token: string, code: string) =>
    request<{ backupCodes: string[] }>('/auth/2fa/enable', { method: 'POST', body: { code }, token }),

  disableTwoFactor: (token: string, password: string) =>
    request<{ success: boolean }>('/auth/2fa/disable', { method: 'POST', body: { password }, token }),

  // Admin
  getStats: (token: string) => request<AdminStats>('/admin/stats', { token }),
  getUsers: (token: string, params?: { page?: number; perPage?: number; search?: string }) =>
    request<any>(
      `/admin/users?page=${params?.page ?? 1}&perPage=${params?.perPage ?? 20}${params?.search ? `&search=${encodeURIComponent(params.search)}` : ''}`,
      { token },
    ),
  verifyCreator: (token: string, id: string) =>
    request<any>(`/admin/creators/${id}/verify`, { method: 'POST', token }),
  rejectCreator: (token: string, id: string, reason?: string) =>
    request<any>(`/admin/creators/${id}/reject`, { method: 'POST', body: { reason }, token }),
  getProducts: (token: string, params?: { status?: string; page?: number; perPage?: number; search?: string }) =>
    request<any>(
      `/admin/products?page=${params?.page ?? 1}&perPage=${params?.perPage ?? 20}${params?.status ? `&status=${params.status}` : ''}${params?.search ? `&search=${encodeURIComponent(params.search)}` : ''}`,
      { token },
    ),
  getQrCampaigns: (token: string, params?: { status?: string; page?: number; perPage?: number; search?: string }) =>
    request<any>(
      `/admin/qr-studio/campaigns?page=${params?.page ?? 1}&perPage=${params?.perPage ?? 20}${params?.status ? `&status=${params.status}` : ''}${params?.search ? `&search=${encodeURIComponent(params.search)}` : ''}`,
      { token },
    ),
  getQrCampaign: (token: string, id: string) =>
    request<any>(`/admin/qr-studio/campaigns/${id}`, { token }),
  pauseOrArchiveQrCampaign: (
    token: string,
    id: string,
    body: { reasonCode: string; reason?: string; archive?: boolean },
  ) =>
    request<any>(`/admin/qr-studio/campaigns/${id}/safety-action`, {
      method: 'POST',
      body,
      token,
    }),
  setQrAssetSafety: (
    token: string,
    campaignId: string,
    assetId: string,
    body: { status: 'APPROVED' | 'BLOCKED'; reasonCode?: string; reason?: string },
  ) =>
    request<any>(`/admin/qr-studio/campaigns/${campaignId}/assets/${assetId}/safety`, {
      method: 'POST',
      body,
      token,
    }),
  listQrCoupons: (token: string) => request<any[]>(`/admin/qr-studio/coupons`, { token }),
  createQrCoupon: (token: string, body: any) =>
    request<any>(`/admin/qr-studio/coupons`, { method: 'POST', body, token }),
  updateQrCoupon: (token: string, id: string, body: any) =>
    request<any>(`/admin/qr-studio/coupons/${id}`, { method: 'PATCH', body, token }),
  deactivateQrCoupon: (token: string, id: string) =>
    request<any>(`/admin/qr-studio/coupons/${id}`, { method: 'DELETE', token }),
  approveProduct: (token: string, id: string) =>
    request<any>(`/admin/products/${id}/approve`, { method: 'POST', token }),
  rejectProduct: (token: string, id: string, reason?: string) =>
    request<any>(`/admin/products/${id}/reject`, { method: 'POST', body: { reason }, token }),
  setProductStatus: (token: string, id: string, status: string) =>
    request<any>(`/admin/products/${id}/status`, {
      method: 'POST',
      body: { status },
      token,
    }),
  setProductFeatured: (token: string, id: string, featured: boolean) =>
    request<any>(`/admin/products/${id}/feature`, {
      method: 'POST',
      body: { featured },
      token,
    }),
  setProductHero: (token: string, id: string, hero: boolean) =>
    request<any>(`/admin/products/${id}/hero`, {
      method: 'POST',
      body: { hero },
      token,
    }),
  setProductAffiliatePick: (token: string, id: string, affiliatePick: boolean) =>
    request<any>(`/admin/products/${id}/affiliate-pick`, {
      method: 'POST',
      body: { affiliatePick },
      token,
    }),
  reindexSearch: (token: string) =>
    request<{ indexed: number }>('/admin/search/reindex', { method: 'POST', token }),
  getOrders: (token: string, params?: { status?: string; page?: number; perPage?: number; search?: string }) =>
    request<any>(
      `/admin/orders?page=${params?.page ?? 1}&perPage=${params?.perPage ?? 20}${params?.status ? `&status=${params.status}` : ''}${params?.search ? `&search=${encodeURIComponent(params.search)}` : ''}`,
      { token },
    ),
  getOrder: (token: string, id: string) => request<any>(`/admin/orders/${id}`, { token }),
  sendOrderReminder: (token: string, id: string) =>
    request<any>(`/admin/orders/${id}/reminder`, { method: 'POST', token }),
  getPayouts: (token: string, params?: { status?: string; page?: number; perPage?: number; search?: string }) =>
    request<any>(
      `/admin/payouts?page=${params?.page ?? 1}&perPage=${params?.perPage ?? 20}${params?.status ? `&status=${params.status}` : ''}${params?.search ? `&search=${encodeURIComponent(params.search)}` : ''}`,
      { token },
    ),
  approvePayout: (token: string, id: string) =>
    request<any>(`/admin/payouts/${id}/approve`, { method: 'POST', token }),
  rejectPayout: (token: string, id: string, reason?: string) =>
    request<any>(`/admin/payouts/${id}/reject`, { method: 'POST', body: { reason }, token }),
  completePayout: (token: string, id: string) =>
    request<any>(`/admin/payouts/${id}/complete`, { method: 'POST', token }),
  getReviews: (token: string, params?: { page?: number; perPage?: number }) =>
    request<any>(`/admin/reviews?page=${params?.page ?? 1}&perPage=${params?.perPage ?? 20}`, { token }),
  hideReview: (token: string, id: string) =>
    request<any>(`/admin/reviews/${id}/hide`, { method: 'POST', token }),
  restoreReview: (token: string, id: string) =>
    request<any>(`/admin/reviews/${id}/restore`, { method: 'POST', token }),
  getRefunds: (token: string, params?: { status?: string; page?: number; perPage?: number }) =>
    request<any>(
      `/admin/refunds?page=${params?.page ?? 1}&perPage=${params?.perPage ?? 20}${params?.status ? `&status=${params.status}` : ''}`,
      { token },
    ),
  approveRefund: (token: string, id: string) =>
    request<any>(`/admin/refunds/${id}/approve`, { method: 'POST', token }),
  rejectRefund: (token: string, id: string) =>
    request<any>(`/admin/refunds/${id}/reject`, { method: 'POST', token }),

  // Affiliates
  getAffiliateApplications: (token: string, status?: string, page = 1, perPage = 20) =>
    request<any>(
      `/admin/affiliates?page=${page}&perPage=${perPage}${status ? `&status=${status}` : ''}`,
      { token },
    ),
  approveAffiliateApplication: (token: string, id: string) =>
    request<any>(`/admin/affiliates/${id}/approve`, { method: 'POST', token }),
  rejectAffiliateApplication: (token: string, id: string, reason?: string) =>
    request<any>(`/admin/affiliates/${id}/reject`, { method: 'POST', body: { reason }, token }),
  suspendAffiliate: (token: string, id: string, reason?: string) =>
    request<any>(`/admin/affiliates/${id}/suspend`, { method: 'POST', body: { reason }, token }),
  unsuspendAffiliate: (token: string, id: string) =>
    request<any>(`/admin/affiliates/${id}/unsuspend`, { method: 'POST', token }),
  getAffiliateProducts: (token: string, status?: string, page = 1, perPage = 20) =>
    request<any>(
      `/admin/affiliates/products?page=${page}&perPage=${perPage}${status ? `&status=${status}` : ''}`,
      { token },
    ),
  approveAffiliateProduct: (token: string, id: string) =>
    request<any>(`/admin/affiliates/products/${id}/approve`, { method: 'POST', token }),
  rejectAffiliateProduct: (token: string, id: string, reason?: string) =>
    request<any>(`/admin/affiliates/products/${id}/reject`, {
      method: 'POST',
      body: { reason },
      token,
    }),

  // Payment settings
  getPaymentSettings: (token: string) =>
    request<{ paystack: { enabled: boolean; hasSecretKey: boolean; secretKeyPreview: string | null; publicKey: string | null; source: string } }>(
      '/admin/settings/payments',
      { token },
    ),
  updatePaystack: (
    token: string,
    body: { secretKey?: string; publicKey?: string; enabled?: boolean },
  ) => request<any>('/admin/settings/payments/paystack', { method: 'PUT', body, token }),

  // Platform settings
  getPlatformSettings: (token: string) =>
    request<{
      commissionRate: number;
      minPayoutAmount: number;
      holdingPeriodDays: number;
      maxFileSize: number;
      maintenanceMode: boolean;
      registrationEnabled: boolean;
    }>('/admin/settings', { token }),
  updatePlatformSettings: (
    token: string,
    body: Partial<{
      commissionRate: number;
      minPayoutAmount: number;
      holdingPeriodDays: number;
      maxFileSize: number;
      maintenanceMode: boolean;
      registrationEnabled: boolean;
    }>,
  ) => request<any>('/admin/settings', { method: 'PUT', body, token }),

  // Broadcasts
  broadcastPreview: (token: string, body: any) =>
    request<{ count: number }>('/admin/broadcasts/preview', { method: 'POST', body, token }),
  sendBroadcast: (token: string, body: any) =>
    request<{ count: number; sentAt: string }>('/admin/broadcasts', { method: 'POST', body, token }),

  // Contact inbox
  getContacts: (token: string, params?: { status?: string; page?: number; perPage?: number }) =>
    request<any>(
      `/admin/contacts?page=${params?.page ?? 1}&perPage=${params?.perPage ?? 20}${params?.status ? `&status=${params.status}` : ''}`,
      { token },
    ),
  getContact: (token: string, id: string) => request<any>(`/admin/contacts/${id}`, { token }),
  setContactStatus: (token: string, id: string, status: 'NEW' | 'READ' | 'ARCHIVED') =>
    request<any>(`/admin/contacts/${id}/status`, { method: 'PATCH', body: { status }, token }),

  // Support tickets
  getTickets: (token: string, params?: {
    page?: number;
    perPage?: number;
    status?: string;
    priority?: string;
    category?: string;
    search?: string;
  }) => {
    const qs = new URLSearchParams();
    qs.set('page', String(params?.page ?? 1));
    qs.set('perPage', String(params?.perPage ?? 20));
    if (params?.status) qs.set('status', params.status);
    if (params?.priority) qs.set('priority', params.priority);
    if (params?.category) qs.set('category', params.category);
    if (params?.search) qs.set('search', params.search);
    return request<any>(`/admin/support-tickets?${qs.toString()}`, { token });
  },
  getTicket: (token: string, id: string) => request<any>(`/admin/support-tickets/${id}`, { token }),
  setTicketStatus: (token: string, id: string, status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED') =>
    request<any>(`/admin/support-tickets/${id}/status`, { method: 'PATCH', body: { status }, token }),
  setTicketPriority: (token: string, id: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') =>
    request<any>(`/admin/support-tickets/${id}/priority`, { method: 'PATCH', body: { priority }, token }),
  assignTicket: (token: string, id: string, assignedTo?: string) =>
    request<any>(`/admin/support-tickets/${id}/assign`, { method: 'POST', body: { assignedTo }, token }),
  replyToTicket: (token: string, id: string, message: string) =>
    request<any>(`/admin/support-tickets/${id}/replies`, { method: 'POST', body: { message }, token }),

  // Roles & permissions
  getRoles: (token: string) =>
    request<{
      data: {
        id: string;
        name: string;
        description: string | null;
        permissions: { id: string; name: string; resource: string; action: string }[];
        memberCount: number;
      }[];
    }>('/admin/roles', { token }),
  getPermissions: (token: string) =>
    request<{ data: { id: string; name: string; resource: string; action: string }[] }>('/admin/permissions', { token }),
  createRole: (token: string, body: { name: string; description?: string; permissions?: string[] }) =>
    request<any>('/admin/roles', { method: 'POST', body, token }),
  setUserRoles: (token: string, userId: string, roles: string[]) =>
    request<any>(`/admin/users/${userId}/roles`, { method: 'PUT', body: { roles }, token }),

  // Feature flags
  getFeatureFlags: (token: string) => request<any>('/admin/feature-flags', { token }),
  createFeatureFlag: (token: string, body: any) =>
    request<any>('/admin/feature-flags', { method: 'POST', body, token }),
  updateFeatureFlag: (token: string, id: string, body: any) =>
    request<any>(`/admin/feature-flags/${id}`, { method: 'PUT', body, token }),
  deleteFeatureFlag: (token: string, id: string) =>
    request<any>(`/admin/feature-flags/${id}`, { method: 'DELETE', token }),

  // Tracking / Analytics
  getTracking: (token: string) =>
    request<{
      trackingEnabled: boolean;
      facebookPixelId: string;
      ga4MeasurementId: string;
      gtmContainerId: string;
      tiktokPixelId: string;
      twitterPixelId: string;
      hotjarId: string;
      customHeadScript: string;
    }>('/admin/settings/tracking', { token }),
  updateTracking: (
    token: string,
    body: {
      trackingEnabled?: boolean;
      facebookPixelId?: string;
      ga4MeasurementId?: string;
      gtmContainerId?: string;
      tiktokPixelId?: string;
      twitterPixelId?: string;
      hotjarId?: string;
      customHeadScript?: string;
    },
  ) => request<any>('/admin/settings/tracking', { method: 'PUT', body, token }),
};
