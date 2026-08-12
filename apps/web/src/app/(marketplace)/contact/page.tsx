'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.submitContact({
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
        category: form.subject,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">Contact Us</h1>
        <p className="mt-4 text-xl text-gray-600">
          Have a question or need help? We&apos;d love to hear from you.
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* Contact Info */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Get in Touch</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Email</h3>
                <p className="text-sm text-gray-600">support@creatormarket.com</p>
                <p className="text-sm text-gray-500">We typically respond within 24 hours</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Office</h3>
                <p className="text-sm text-gray-600">Lagos, Nigeria</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Support Hours</h3>
                <p className="text-sm text-gray-600">24/7 via email</p>
                <p className="text-sm text-gray-500">Live chat: Mon-Fri, 9am-5pm WAT</p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
            <h3 className="font-medium text-gray-900 mb-2">Common Topics</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Account and billing questions</li>
              <li>• Product upload and file format help</li>
              <li>• Refund and dispute resolution</li>
              <li>• Creator payout inquiries</li>
              <li>• API and technical integration</li>
            </ul>
          </div>
        </div>

        {/* Contact Form */}
        <div>
          {submitted ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
              <div className="text-4xl mb-4">✉️</div>
              <h3 className="text-xl font-semibold text-gray-900">Message Sent!</h3>
              <p className="mt-2 text-gray-600">
                Thank you for reaching out. We&apos;ll get back to you within 24 hours.
              </p>
              <button
                onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                className="mt-6 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <select
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a topic</option>
                  <option value="general">General Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="billing">Billing & Payments</option>
                  <option value="creator">Creator Support</option>
                  <option value="partnership">Partnership</option>
                  <option value="dmca">DMCA / Copyright</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  rows={5}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Tell us how we can help..."
                />
              </div>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
