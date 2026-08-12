'use client';

import { useState, useEffect } from 'react';
import { api } from './api';
import { useAuth } from './auth';

export function useProducts(params?: {
  categoryId?: string;
  creatorId?: string;
  page?: number;
  perPage?: number;
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [params?.categoryId, params?.creatorId, params?.page]);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getProducts(params);
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { products, pagination, isLoading, error, refetch: loadProducts };
}

export function useProduct(slug: string) {
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProduct();
  }, [slug]);

  const loadProduct = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getProduct(slug);
      setProduct(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { product, isLoading, error, refetch: loadProduct };
}

export function useCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return { categories, isLoading };
}

export function useOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadOrders();
    }
  }, [token]);

  const loadOrders = async (page = 1) => {
    if (!token) return;
    try {
      setIsLoading(true);
      const response = await api.getOrders(token, { page });
      setOrders(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return { orders, pagination, isLoading, refetch: loadOrders };
}

export function useCreatorProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadProducts();
    }
  }, [token]);

  const loadProducts = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const response = await api.getProducts({
        creatorId: 'current', // API should resolve from token
      });
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return { products, isLoading, refetch: loadProducts };
}

export function useProductReviews(productId: string) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      loadReviews();
    }
  }, [productId]);

  const loadReviews = async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await api.getProductReviews(productId, { page });
      setReviews(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return { reviews, pagination, isLoading, refetch: loadReviews };
}
