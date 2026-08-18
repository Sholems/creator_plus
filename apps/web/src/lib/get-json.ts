import { API_BASE } from './env';

/**
 * Fetch JSON from the API with ISR-friendly caching.
 * Returns `null` on any failure so pages can degrade gracefully.
 */
export async function getJson(
  path: string,
  opts?: { revalidate?: number },
): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: opts?.revalidate ?? 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
