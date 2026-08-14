// Fallbacks are production-aware so a missing build-time env var never leaks a
// `localhost` URL into the deployed bundle. In local dev (NODE_ENV !==
// production) they point at the local services.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://api.mycreatorplus.com/api/v1'
    : 'http://localhost:3001/api/v1');

export const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://admin.mycreatorplus.com'
    : 'http://localhost:3002');
