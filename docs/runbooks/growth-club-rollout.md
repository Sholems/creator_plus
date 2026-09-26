# Bold Ideas Growth Club rollout

This release keeps community registration free. Premium checks apply only to records explicitly marked `PREMIUM` and continue to use the existing membership entitlement backed by Paystack or Stripe. Community uploads must use the existing Cloudflare R2 storage endpoint.

## Deployment order

1. Take a database backup and record current worker queue depth and error rate.
2. Apply migrations in repository order. All Growth Club migrations are additive; do not enable new flags while mixed application versions are running.
3. Deploy the API, then web, then workers. Confirm the event sweep and community digest repeat jobs register once.
4. Keep all six community flags disabled while running the smoke checks below.
5. Enable flags in this order: `community-shell`, `community-profiles`, `community-knowledge`, `community-learning`, `community-programming`, `community-challenges`.
6. For each flag, use the deterministic rollout percentage: administrators/internal users, 5%, 25%, 50%, then 100%. Hold each stage long enough to observe API errors, access denials, queue lag, and reports.

## Required smoke checks

- A newly registered account can join Growth Club and use free discussions, profiles, courses, events, and challenges.
- A free member receives `403` for direct premium course, event, challenge, and contextual-content API requests.
- An active Paystack membership unlocks premium records; cancellation/expiry removes access without affecting marketplace purchases.
- Rich posts, lesson text, and descriptions remove scripts, event handlers, unsafe protocols, external images, and unapproved iframes.
- Every uploaded cover, resource, or attachment resolves from the configured CreatorPlus R2 public origin.
- Bunny Stream lesson and replay URLs render; an unapproved video host is rejected.
- RSVP capacity is enforced; meeting links are absent before RSVP; one 24-hour and one 1-hour reminder are queued per member.
- Final lesson completion creates one certificate and its public verification route works.
- Challenge retries do not create duplicate enrollment; check-ins award points once per saved check-in.
- Admins can hide/restore content, resolve reports, suspend only community participation, and inspect the audit history.
- Marketplace browse, checkout, downloads, creator dashboards, QR Studio, login, notification bell, and existing membership checkout still work.

## Operational checks

Use `/community/manage/moderation` to watch open reports, failed deliveries, overdue delivery intents, active members, upcoming events, and active challenges. Alert when failed deliveries are non-zero for two consecutive sweeps or overdue deliveries remain after the next worker interval. Never log meeting links, private profile fields, raw post bodies, or payment credentials.

## Rollback

1. Set the newest affected flag rollout to `0`; if the fault is broad, disable all six flags in reverse order.
2. Leave additive tables and columns in place. Do not roll back migrations while an older or newer application process may still reference them.
3. Stop the worker only when it is the source of the fault; durable delivery keys allow a corrected worker to resume without duplicate sends.
4. Restore the previous API/web release and rerun the marketplace and free-community smoke checks.
5. Preserve reports, moderation actions, RSVP records, progress, certificates, and delivery intents for investigation. Do not delete user data as part of rollback.

## Post-release review

After 24 hours and again after seven days, review registration-to-join conversion, weekly active members, course starts/completions, unanswered questions, RSVP attendance, challenge check-ins, report backlog, premium access denials, payment webhook health, and worker delivery failures. Expand rollout only when the previous cohort is stable.
