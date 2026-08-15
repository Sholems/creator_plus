/**
 * Optional Brevo REST integration for marketing. When BREVO_API_KEY is set,
 * new (and updated) users are upserted into a Brevo contact list so the team
 * can run campaigns, newsletters and automation from the Brevo dashboard.
 *
 * Transactional delivery itself goes through Brevo SMTP (see transport.ts);
 * this client is purely for contact/marketing sync and is fully optional —
 * everything degrades to no-ops when the env vars are absent.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3';

interface BrevoContact {
  email: string;
  attributes?: Record<string, unknown>;
  listIds?: number[];
  updateEnabled?: boolean;
}

function apiKey(): string | undefined {
  return process.env.BREVO_API_KEY || undefined;
}

function contactListId(): number | undefined {
  const id = process.env.BREVO_CONTACT_LIST_ID;
  const parsed = id ? parseInt(id, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Upsert a user into the configured Brevo marketing list. Best-effort and
 * non-blocking: failures are swallowed so a broken Brevo key can never break
 * registration or the request path.
 */
export async function syncBrevoContact(input: {
  email: string;
  name?: string | null;
  verified?: boolean;
  createdAt?: Date;
}): Promise<void> {
  const key = apiKey();
  const listId = contactListId();
  if (!key || !listId || !input.email) return;

  const payload: BrevoContact = {
    email: input.email,
    updateEnabled: true,
    listIds: [listId],
    attributes: {
      NOME: input.name || input.email.split('@')[0],
      // Matches Brevo's default contact attributes.
      'VERIFIED_EMAIL': !!input.verified,
      'SIGNED_UP_AT': input.createdAt?.toISOString() || new Date().toISOString(),
    },
  };

  try {
    const res = await fetch(`${BREVO_API_URL}/contacts`, {
      method: 'POST',
      headers: {
        'api-key': key,
        'accept': 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    // 201 = created, 204 = updated — both are fine.
    if (res.status !== 201 && res.status !== 204) {
      const text = await res.text().catch(() => '');
      // Swallow; a failed sync must never surface to the caller.
      if (!text.includes('duplicate')) {
        // eslint-disable-next-line no-console
        console.warn(`[brevo] contact sync failed (${res.status}): ${text.slice(0, 200)}`);
      }
    }
  } catch {
    // No network access to Brevo is never a reason to fail a request.
  }
}
