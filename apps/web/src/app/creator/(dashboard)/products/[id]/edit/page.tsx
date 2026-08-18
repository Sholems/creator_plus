'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { RichTextEditor } from '@/components/market/rich-text-editor';
import { htmlToPlainText } from '@/lib/rich-text';
import { AffiliateProgramForm } from '@/components/creator/affiliate-program-form';
import { cn } from '@creatormarket/ui';

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
  const [digitalFile, setDigitalFile] = useState<File | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'file' | 'url'>('file');
  const [deliveryUrl, setDeliveryUrl] = useState('');
  const [existingFiles, setExistingFiles] = useState<any[]>([]);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);
  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState<string | null>(null);
  const [originalProduct, setOriginalProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    price: '',
    compareAtPrice: '',
    licenseType: 'personal',
    tags: '',
  });
  const [affiliate, setAffiliate] = useState({
    affiliateEnabled: false,
    affiliateCommissionRate: 20,
    affiliateStatus: '',
  });

  const descriptionPlain = htmlToPlainText(description);

  const formatFileSize = (bytes: any) => {
    const n = Number(bytes) || 0;
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${n} B`;
  };

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
        compareAtPrice: product.compareAtPrice ? product.compareAtPrice.toString() : '',
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
      setDeliveryUrl(product.deliveryUrl || '');
      setExistingFiles(product.files || []);
      if (product.deliveryUrl) {
        setDeliveryMode('url');
      }
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
    const compareAt = formData.compareAtPrice ? parseFloat(formData.compareAtPrice) : undefined;
    if (compareAt !== undefined && (isNaN(compareAt) || compareAt <= price)) {
      setError('Sale price (original) must be higher than the selling price.');
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
        compareAtPrice: compareAt,
        licenseType: formData.licenseType,
        tags,
        thumbnail: thumbnailUrl,
        deliveryUrl: deliveryUrl.trim(),
        affiliateEnabled: affiliate.affiliateEnabled,
        affiliateCommissionRate: affiliate.affiliateEnabled
          ? affiliate.affiliateCommissionRate
          : undefined,
      });

      if (digitalFile) {
        try {
          await api.uploadProductFile(token, productId, digitalFile);
        } catch (uploadErr: any) {
          setError(
            `Product updated but the digital file failed to upload: ${
              uploadErr.message || 'please try again'
            }`,
          );
          setIsLoading(false);
          return;
        }
      }

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

  const handleRemoveFile = async (fileId: string) => {
    if (!token) return;
    setBusyFileId(fileId);
    setError('');
    try {
      await api.deleteProductFile(token, productId, fileId);
      setExistingFiles((files) => files.filter((f) => f.id !== fileId));
    } catch (err: any) {
      setError(err.message || 'Failed to remove file');
    } finally {
      setBusyFileId(null);
      setConfirmDeleteFileId(null);
    }
  };

  const handleReplaceFile = async (fileId: string, file: File) => {
    if (!token) return;
    if (file.size > 500 * 1024 * 1024) {
      setError('Digital file must be under 500MB');
      return;
    }
    setBusyFileId(fileId);
    setError('');
    try {
      const created = await api.uploadProductFile(token, productId, file);
      await api.deleteProductFile(token, productId, fileId);
      setExistingFiles((files) => [
        ...files.filter((f) => f.id !== fileId),
        { id: created.id, fileName: file.name, fileSize: created.fileSize, mimeType: file.type },
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to replace file');
    } finally {
      setBusyFileId(null);
    }
  };

  const uploadedFilesList =
    existingFiles.length > 0 ? (
      <div className="mt-4">
        <p className="text-xs font-semibold text-ink-500">Uploaded files</p>
        <p className="mt-0.5 text-xs text-ink-400">
          These stay attached to your product and are delivered to buyers.
        </p>
        <ul className="mt-2 space-y-2">
          {existingFiles.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-xl border border-ink-100 bg-cream-50 px-3 py-2"
            >
              <svg className="h-4 w-4 shrink-0 text-forest-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a.75.75 0 01.75.75v.75m0 0h6.75a.75.75 0 01.75.75v.75m-7.5 0v6.75a.75.75 0 00.75.75h6.75a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75m-7.5 0h7.5" />
              </svg>
              <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{f.fileName}</span>
              <span className="shrink-0 text-xs text-ink-400">{formatFileSize(f.fileSize)}</span>
              {busyFileId === f.id ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-500">
                  Working…
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1.5">
                  <label className="cursor-pointer rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-600 transition hover:bg-cream-100">
                    Replace
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) handleReplaceFile(f.id, file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmDeleteFileId === f.id) {
                        handleRemoveFile(f.id);
                      } else {
                        setConfirmDeleteFileId(f.id);
                      }
                    }}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      confirmDeleteFileId === f.id
                        ? 'border-clay-300 bg-clay-600 text-white hover:bg-clay-700'
                        : 'border-ink-200 bg-white text-clay-700 hover:bg-clay-50'
                    }`}
                  >
                    {confirmDeleteFileId === f.id ? 'Confirm?' : 'Remove'}
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    ) : null;

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

              <div>
                <label htmlFor="compareAtPrice" className="block text-sm font-medium text-ink-700">
                  Sale Price (₦ NGN) <span className="text-ink-400 font-normal">— optional</span>
                </label>
                <input
                  type="number"
                  id="compareAtPrice"
                  min="0"
                  step="0.01"
                  value={formData.compareAtPrice}
                  onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
                  className={inputClass}
                  placeholder="Original price (shown as strikethrough)"
                />
                <p className="mt-1 text-xs text-ink-400">
                  Enter a price higher than the selling price to show a strikethrough &ldquo;was&rdquo; price and discount badge.
                </p>
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

          <div className="rounded-2xl border border-ink-100 bg-white p-6 shadow-[0_1px_2px_rgba(22,33,27,0.04)]">
            <h2 className="font-display text-lg font-semibold text-ink-900">Digital File</h2>
            <p className="mt-1 text-sm text-ink-500">
              What buyers receive after purchase — an uploaded file, an external link, or both.
            </p>

            <div className="mt-4 inline-flex rounded-full border border-ink-100 bg-cream-50 p-1">
              <button
                type="button"
                onClick={() => setDeliveryMode('file')}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-semibold transition',
                  deliveryMode === 'file' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700',
                )}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMode('url')}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-semibold transition',
                  deliveryMode === 'url' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700',
                )}
              >
                External link (URL)
              </button>
            </div>

            {deliveryMode === 'url' ? (
              <div className="mt-4">
                <label htmlFor="deliveryUrl" className="block text-sm font-medium text-ink-700">
                  Delivery link
                </label>
                <input
                  type="url"
                  id="deliveryUrl"
                  value={deliveryUrl}
                  onChange={(e) => setDeliveryUrl(e.target.value)}
                  className={`${inputClass} mt-1.5`}
                  placeholder="https://drive.google.com/… or https://your-site.com/download"
                />
                <p className="mt-1 text-xs text-ink-500">
                  Paste a link to the file or resource buyers should access after purchase (hosted file,
                  Google Drive, Dropbox, or a landing page).
                </p>
                {digitalFile && (
                  <p className="mt-2 text-xs text-forest-700">
                    {digitalFile.name} is also attached and will be delivered alongside the link.
                  </p>
                )}

                {uploadedFilesList}
              </div>
            ) : (
              <>
                {digitalFile ? (
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-forest-200 bg-forest-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-100">
                        <svg className="h-5 w-5 text-forest-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink-900">{digitalFile.name}</p>
                        <p className="text-xs text-ink-500">{formatFileSize(digitalFile.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDigitalFile(null)}
                      className="rounded-full bg-white p-1.5 shadow-sm hover:bg-cream-100"
                    >
                      <svg className="h-4 w-4 text-ink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="mt-4 flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-200 bg-cream-50 transition-colors hover:border-forest-400">
                    <svg className="h-8 w-8 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="mt-2 text-sm text-ink-600">
                      Click to upload an additional file (existing files are kept)
                    </span>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 500 * 1024 * 1024) {
                          setError('Digital file must be under 500MB');
                          return;
                        }
                        setError('');
                        setDigitalFile(file);
                      }}
                      className="hidden"
                    />
                  </label>
                )}

                {uploadedFilesList}

                {deliveryUrl && (
                  <p className="mt-2 text-xs text-forest-700">
                    Delivery link set — it will be delivered alongside the uploaded file{existingFiles.length > 0 ? 's' : ''}.
                  </p>
                )}
              </>
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
