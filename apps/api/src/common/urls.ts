/**
 * The web application's base URL, used for emails, payment redirects and
 * affiliate links. Falls back to the production domain when WEB_URL is unset
 * in production so creators/buyers never receive `localhost` links.
 */
export function webBaseUrl(): string {
  return (
    process.env.WEB_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://mycreatorplus.com' : 'http://localhost:3000')
  );
}
