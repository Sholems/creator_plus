'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/products?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={submitSearch} className="mt-8" role="search">
      <label htmlFor="hero-search" className="sr-only">
        Search the market
      </label>
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 p-1.5 backdrop-blur focus-within:border-gold-400 focus-within:ring-1 focus-within:ring-gold-400">
        <svg className="ml-3 h-5 w-5 shrink-0 text-cream-100/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
        </svg>
        <input
          id="hero-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the market — prompts, templates, courses…"
          className="w-full bg-transparent py-2.5 text-sm text-cream-50 placeholder:text-cream-100/50 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-gold-400 px-5 py-2.5 text-sm font-semibold text-forest-950 transition-colors hover:bg-gold-300"
        >
          Search
        </button>
      </div>
    </form>
  );
}
