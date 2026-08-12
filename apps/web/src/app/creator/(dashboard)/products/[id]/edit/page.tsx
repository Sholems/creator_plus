'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { RichTextEditor } from '@/components/market/rich-text-editor';
import { htmlToPlainText } from '@/lib/rich-text';
import { AffiliateProgramForm } from '@/components/creator/affiliate-program-form';

const inputClass =
  'mt-1 block w-full rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 transition focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/30';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = use(params);
  const router = useRouter();
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [description, setDescription] = useState('');
  const [originalProduct, setOriginalProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    price: '',
    licenseType: 'personal',
    tags: '',
  });
  const [affiliate, setAffiliate] = useState({
    affiliateEnabled: false,
    affiliateCommissionRate: 20,
    affiliateStatus: '',
  });

  const descriptionPlain = htmlToPlainText(description);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (token && productId) {
      loadProduct();
    }
  }, [token, productId]);

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadProduct = async () => {
    if (!token) return;
    setIsFetching(true);
    try {
      // We need to fetch the product by ID. The findById returns full product
      // with tags and category. The API uses slug for GET /products/:slug but
      // we have the ID. We'll use the update endpoint's underlying findById
      // indirectly — let's fetch via the creator's product list and find it.
      const profile = await api.getCreatorProfile(token);
      const result = await api.getProducts({ creatorId: profile.id, perPage: 100 }, token);
      const product = (result.data || []).find((p: any) => p.id === productId);

      if (!product) {
        setError('Product not found or you do not have permission to edit it.');
        setIsFetching(false);
        return;
      }

      setOriginalProduct(product);
      setFormData({
        title: product.title || '',
        categoryId: product.categoryId || '',
        price: product.price?.toString() || '',
        licenseType: (product.licenseType || 'personal').toLowerCase(),
        tags: product.tags
          ? product.tags.map((t: any) => t.tag?.name || t.name || '').filter(Boolean).join(', ')
          : '',
      });
      setAffiliate({
        affiliateEnabled: !!product.affiliateEnabled,
        affiliateCommissionRate: product.affiliateCommissionRate || 20,
        affiliateStatus: product.affiliateStatus || 'DISABLED',
      });
      setDescription(product.description || '');
      if (product.thumbnail) {
        setThumbnailPreview(product.thumbnail);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load product');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!formData.title.trim()) {
      setError('Please enter a product title.');
      setIsLoading(false);
      return;
    }
    if (!formData.categoryId) {
      setError('Please select a category.');
      setIsLoading(false);
      return;
    }
    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) {
      setError('Please enter a valid price greater than 0.');
      setIsLoading(false);
      return;
    }
    if (descriptionPlain.length < 50) {
      setError(
        `Description must be at least 50 characters (currently ${descriptionPlain.length}).`,
      );
      setIsLoading(false);
      return;
    }

    try {
      let thumbnailUrl = originalProduct?.thumbnail || '';

      if (thumbnailFile) {
        setUploadingThumbnail(true);
        try {
          const uploadResult = await api.uploadFile(token, thumbnailFile, 'products');
          thumbnailUrl = uploadResult.url;
        } finally {
          setUploadingThumbnail(false);
        }
      }

      const tags = formData.tags
        ? formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      await api.updateProduct(token, productId, {
        title: formData.title,
        description,
        categoryId: formData.categoryId,
        price,
        licenseType: formData.licenseType,
        tags,
        thumbnail: thumbnailUrl,
        affiliateEnabled: affiliate.affiliateEnabled,
        affiliateCommissionRate: affiliate.affiliateEnabled
          ? affiliate.affiliateCommissionRate
          : undefined,
      });

      setSuccess('Product updated successfully!');
      setTimeout(() => {
        router.push('/creator/products');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
      setIsLoading(false);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Thumbnail must be under 5MB');
        return;
      }
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setThumbnailPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (isFetching) {
    return (
      <div>
        <p className="eyebrow text-gold-600">Creator Studio</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink-900">
          Edit Product
        </h1>
        <div className="mt-8 max-w-3xl space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow text-gold-600">Creator Studio</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink-900">
        Edit Product
      </h1>
      {originalProduct && (
        <p className="mt-1 text-sm text-ink-500">
          Editing: <span className="font-medium text-ink-700">{originalProduct.title}</span>
          {originalProduct.status && (
            <span
              className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                originalProduct.status === 'PUBLISHED'
                  ? 'bg-green-100 text-green-700'
                  : originalProduct.status === 'DRAFT'
                    ? 'bg-gray-100 text-gray-700'
                    : originalProduct.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
              }`}
            >
              {originalProduct.status}
            </span>
          )}
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-xl border border-forest-200 bg-forest-50 px-4 py-3 text-sm text-forest-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-8 max-w-3xl">
        <div className="space-y-6">
          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
            <h2 className="font-display text-lg font-semibold text-ink-900">Basic Information</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-ink-700">
                  Product Title
                </label>
                <input
                  type="text"
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={inputClass}
                  placeholder="Enter product title"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-ink-700">
                  Description (min 50 characters)
                </label>
                <div className="mt-1">
                  <RichTextEditor
                    id="description"
                    value={description}
                    onChange={setDescription}
                    placeholder="Describe your product in detail..."
                  />
                </div>
                <p
                  className={`mt-1 text-xs ${descriptionPlain.length >= 50 ? 'text-forest-600' : 'text-ink-500'}`}
                >
                  {descriptionPlain.length}/50 minimum characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-ink-700">
                    Category
                  </label>
                  <select
                    id="category"
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-ink-700">
                    Price (₦ NGN)
                  </label>
                  <input
                    type="number"
                    id="price"
                    min="0"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className={inputClass}
                    placeholder="1500.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="licenseType" className="block text-sm font-medium text-ink-700">
                    License Type
                  </label>
                  <select
                    id="licenseType"
                    value={formData.licenseType}
                    onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                    className={inputClass}
                  >
                    <option value="personal">Personal</option>
                    <option value="commercial">Commercial</option>
                    <option value="extended">Extended</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-ink-700">
                    Tags
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className={inputClass}
                    placeholder="template, react, dashboard"
                  />
                  <p className="mt-1 text-xs text-ink-400">Comma-separated</p>
                </div>
              </div>
            </div>
          </div>

          <AffiliateProgramForm
            enabled={affiliate.affiliateEnabled}
            rate={affiliate.affiliateCommissionRate}
            price={parseFloat(formData.price) || 0}
            status={affiliate.affiliateStatus}
            onChange={(data) =>
              setAffiliate({ ...affiliate, ...data, affiliateStatus: affiliate.affiliateStatus })
            }
          />

          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
            <h2 className="font-display text-lg font-semibold text-ink-900">Thumbnail Image</h2>
            <p className="mt-1 text-sm text-ink-500 mb-4">
              Upload a preview image for your product (PNG, JPG, max 5MB)
            </p>

            {thumbnailPreview ? (
              <div className="relative">
                <img
                  src={thumbnailPreview}
                  alt="Thumbnail preview"
                  className="h-48 w-full rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setThumbnailFile(null);
                    setThumbnailPreview(null);
                  }}
                  className="absolute top-2 right-2 rounded-full bg-white p-1.5 shadow-sm hover:bg-cream-100"
                >
                  <svg
                    className="h-4 w-4 text-ink-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 cursor-pointer rounded-xl border-2 border-dashed border-ink-200 bg-cream-50 transition-colors hover:border-forest-400">
                <svg
                  className="h-10 w-10 text-ink-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="mt-2 text-sm text-ink-600">Click to upload a thumbnail</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-medium text-ink-700 transition hover:bg-cream-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || uploadingThumbnail}
            className="rounded-full bg-forest-800 px-6 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading
              ? uploadingThumbnail
                ? 'Uploading thumbnail…'
                : 'Saving…'
              : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
