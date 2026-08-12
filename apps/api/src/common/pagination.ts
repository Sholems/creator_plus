/**
 * One place for list pagination. Callers pass raw page/perPage (often from
 * query strings) and get back sanitized values plus Prisma skip/take. Crucially
 * this CAPS perPage so a client can't request an unbounded page and exhaust the
 * database — the previous per-service `perPage || 20` had no upper bound.
 */

export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;

export interface Paginated {
  page: number;
  perPage: number;
  skip: number;
  take: number;
}

export function paginate(page?: number, perPage?: number): Paginated {
  const p = Number.isFinite(page) ? Math.max(1, Math.floor(page as number)) : 1;
  const requested = Number.isFinite(perPage)
    ? Math.floor(perPage as number)
    : DEFAULT_PER_PAGE;
  const size = Math.min(MAX_PER_PAGE, Math.max(1, requested));
  return { page: p, perPage: size, skip: (p - 1) * size, take: size };
}

export interface PageMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export function pageMeta(page: number, perPage: number, total: number): PageMeta {
  return { page, perPage, total, totalPages: Math.ceil(total / perPage) };
}
