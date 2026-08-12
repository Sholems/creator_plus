// Common types for CreatorMarket

export type ProductStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'published' | 'archived';

export type LicenseType = 'personal' | 'commercial' | 'extended' | 'enterprise';

export type OrderStatus = 'pending' | 'processing' | 'paid' | 'fulfilled' | 'completed' | 'failed' | 'cancelled' | 'refunded';

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';

export type UserRole = 'guest' | 'buyer' | 'creator' | 'affiliate' | 'moderator' | 'finance' | 'support' | 'admin' | 'super_admin';

export interface Product {
  id: string;
  creatorId: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  status: ProductStatus;
  coverImage?: string;
  previewImages: string[];
  price: number;
  compareAtPrice?: number;
  currency: string;
  licenseType: LicenseType;
  version: string;
  fileSize: number;
  downloadCount: number;
  viewCount: number;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Creator {
  id: string;
  userId: string;
  storeName: string;
  slug: string;
  bio?: string;
  avatar?: string;
  banner?: string;
  verified: boolean;
  verificationStatus: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  socialLinks?: Record<string, string>;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
  emailVerified: boolean;
  status: 'active' | 'suspended' | 'deactivated';
  createdAt: Date;
}

export interface Order {
  id: string;
  buyerId: string;
  status: OrderStatus;
  totalAmount: number;
  currency: string;
  invoiceNumber: string;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  licenseType: LicenseType;
}

export interface Review {
  id: string;
  productId: string;
  buyerId: string;
  rating: number;
  title?: string;
  comment?: string;
  helpful: number;
  reported: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  id: string;
  userId: string;
  pendingBalance: number;
  availableBalance: number;
  reservedBalance: number;
  lifetimeEarnings: number;
  lifetimePayouts: number;
  currency: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface PaginationParams {
  page?: number;
  perPage?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}
