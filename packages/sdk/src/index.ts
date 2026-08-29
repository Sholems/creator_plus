// CreatorPlus API SDK

import type {
  Product,
  Creator,
  User,
  Order,
  Review,
  Category,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
} from '@creatorplus/shared';

export interface SDKConfig {
  baseUrl: string;
  apiKey?: string;
}

export class CreatorPlusSDK {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: SDKConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error: any = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error?.message || 'Request failed');
    }

    return response.json() as Promise<T>;
  }

  // Auth
  async register(email: string, password: string) {
    return this.request<ApiResponse<User>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request<ApiResponse<{ user: User; accessToken: string }>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Products
  async getProducts(params?: PaginationParams & { categoryId?: string; creatorId?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.perPage) searchParams.set('per_page', params.perPage.toString());
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.categoryId) searchParams.set('category', params.categoryId);
    if (params?.creatorId) searchParams.set('creator', params.creatorId);

    return this.request<PaginatedResponse<Product>>(`/products?${searchParams.toString()}`);
  }

  async getProduct(slug: string) {
    return this.request<ApiResponse<Product>>(`/products/${slug}`);
  }

  // Categories
  async getCategories() {
    return this.request<ApiResponse<Category[]>>('/categories');
  }

  async getCategory(slug: string) {
    return this.request<ApiResponse<Category>>(`/categories/${slug}`);
  }

  // Search
  async search(query: string, filters?: Record<string, string>) {
    const searchParams = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        searchParams.set(key, value);
      });
    }

    return this.request<ApiResponse<PaginatedResponse<Product>>>(`/search?${searchParams.toString()}`);
  }

  // Creators
  async getCreator(slug: string) {
    return this.request<ApiResponse<Creator>>(`/creators/${slug}`);
  }

  // Orders
  async getOrders() {
    return this.request<ApiResponse<Order[]>>('/orders');
  }

  async getOrder(id: string) {
    return this.request<ApiResponse<Order>>(`/orders/${id}`);
  }

  // Reviews
  async getProductReviews(productId: string) {
    return this.request<ApiResponse<Review[]>>(`/reviews/product/${productId}`);
  }
}

export default CreatorPlusSDK;
