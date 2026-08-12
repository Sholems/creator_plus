import Link from 'next/link';

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">API Documentation</h1>
        <p className="mt-4 text-xl text-gray-600">
          Build integrations with the CreatorPlus API
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">REST API</h2>
        <p className="text-gray-600 mb-4">
          Our API provides programmatic access to CreatorPlus data and functionality. Build custom integrations, automate workflows, or create your own buyer/creator tools.
        </p>
        <div className="rounded-lg bg-gray-900 p-4 font-mono text-sm text-green-400">
          Base URL: https://api.creatormarket.com/v1
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Authentication</h3>
          <p className="text-gray-600 text-sm mb-3">
            All API requests require a Bearer token in the Authorization header:
          </p>
          <div className="rounded-lg bg-gray-900 p-4 font-mono text-sm text-green-400">
            Authorization: Bearer YOUR_API_TOKEN
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Endpoints</h3>
          <div className="space-y-3">
            {[
              { method: 'GET', path: '/products', desc: 'List all products' },
              { method: 'GET', path: '/products/:slug', desc: 'Get product by slug' },
              { method: 'POST', path: '/products', desc: 'Create a product (auth)' },
              { method: 'GET', path: '/categories', desc: 'List categories' },
              { method: 'GET', path: '/search', desc: 'Search products' },
              { method: 'POST', path: '/orders', desc: 'Create an order (auth)' },
              { method: 'GET', path: '/downloads', desc: 'List user downloads (auth)' },
            ].map((ep) => (
              <div key={ep.path} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${
                  ep.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-gray-800">{ep.path}</code>
                <span className="text-sm text-gray-500 ml-auto">{ep.desc}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Rate Limiting</h3>
          <p className="text-gray-600 text-sm">
            API requests are limited to 100 requests per minute per API key. If you exceed this limit, you will receive a 429 Too Many Requests response.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Swagger UI</h3>
          <p className="text-gray-600 text-sm mb-3">
            Explore the full API documentation interactively:
          </p>
          <a
            href="/api/docs"
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Open Swagger UI →
          </a>
        </section>
      </div>
    </div>
  );
}
