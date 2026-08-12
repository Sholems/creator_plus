'use client';

import { useEffect, useState } from 'react';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
}

export function SearchBox({ value, onChange, placeholder = 'Search…', delay = 400 }: SearchBoxProps) {
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (text !== value) onChange(text);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [text, delay, onChange, value]);

  return (
    <div className="relative w-full sm:w-72">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="input pl-9"
      />
    </div>
  );
}
