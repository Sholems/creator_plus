export const VISITOR_COOKIE = 'cm_visitor_id';

export function readVisitorId(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${VISITOR_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
