import { NextRequest, NextResponse } from 'next/server';
import { VISITOR_COOKIE } from '@/lib/visitor';
import { API_BASE } from '@/lib/env';

const DAY = 24 * 60 * 60;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;

  let data: { url: string; productSlug: string; visitorId: string; cookieDays: number };
  try {
    const res = await fetch(`${API_BASE}/affiliates/go/${encodeURIComponent(code)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitorId: existing || undefined,
        referer: request.headers.get('referer') ?? undefined,
      }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`track failed: ${res.status}`);
    data = await res.json();
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const destination = data.url || `${new URL(request.url).origin}/products/${data.productSlug}`;
  const response = NextResponse.redirect(destination, 307);
  response.cookies.set(VISITOR_COOKIE, data.visitorId, {
    maxAge: (data.cookieDays || 30) * DAY,
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
