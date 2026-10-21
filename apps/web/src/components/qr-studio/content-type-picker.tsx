'use client';

import { cn } from '@creatorplus/ui';

type ContentType = {
  value: string;
  label: string;
  description: string;
  mark: string;
  pro?: boolean;
};

const CONTENT_TYPES: ContentType[] = [
  { value: 'FILE', label: 'File or PDF', description: 'Host a document securely', mark: 'PDF' },
  { value: 'WEBSITE', label: 'Website', description: 'Open any web page', mark: 'URL' },
  { value: 'TEXT_NOTE', label: 'Text note', description: 'Share a readable message', mark: 'TXT', pro: true },
  { value: 'WHATSAPP', label: 'WhatsApp', description: 'Start a prefilled chat', mark: 'WA', pro: true },
  { value: 'SOCIAL_LINK_HUB', label: 'Link hub', description: 'Collect your social links', mark: 'BIO', pro: true },
  { value: 'VCARD', label: 'Contact card', description: 'Save contact details', mark: 'VCF', pro: true },
  { value: 'COUPON', label: 'Coupon', description: 'Reveal a promo offer', mark: '%', pro: true },
  { value: 'LOCATION', label: 'Location', description: 'Open a place in maps', mark: 'PIN', pro: true },
  { value: 'EMAIL', label: 'Email', description: 'Compose an email', mark: '@', pro: true },
  { value: 'SMS', label: 'SMS', description: 'Send a prefilled text', mark: 'SMS', pro: true },
  { value: 'EVENT', label: 'Event', description: 'Share an event or ticket', mark: 'CAL', pro: true },
  { value: 'VIDEO', label: 'Video', description: 'YouTube, Vimeo or Bunny', mark: 'VID', pro: true },
  { value: 'AUDIO', label: 'Audio', description: 'Spotify or SoundCloud', mark: 'AUD', pro: true },
  { value: 'APP_LINK', label: 'App download', description: 'Route to the right store', mark: 'APP', pro: true },
  { value: 'WIFI', label: 'Wi-Fi', description: 'Join a wireless network', mark: 'WiFi', pro: true },
  { value: 'MENU', label: 'Menu', description: 'Publish priced items', mark: 'MENU', pro: true },
];

export function ContentTypePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink-800">What will your QR code open?</legend>
      <p className="mt-1 text-xs leading-5 text-ink-500">Choose a destination. You can replace the content later without changing the printed QR code.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
        {CONTENT_TYPES.map((type) => {
          const selected = value === type.value;
          return (
            <button
              key={type.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(type.value)}
              className={cn(
                'group relative min-h-28 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500 focus-visible:ring-offset-2',
                selected
                  ? 'border-forest-600 bg-forest-50 shadow-sm'
                  : 'border-ink-100 bg-white hover:bg-cream-50 active:bg-forest-50',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl text-[0.625rem] font-bold tracking-wide',
                  selected ? 'bg-forest-800 text-cream-50' : 'bg-cream-100 text-forest-800 group-hover:bg-forest-100',
                )}
              >
                {type.mark}
              </span>
              {type.pro && <span className="absolute right-3 top-3 rounded-full bg-gold-100 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-gold-700">Pro</span>}
              <span className="mt-3 block whitespace-nowrap text-sm font-semibold text-ink-900">{type.label}</span>
              <span className="mt-1 block text-[0.6875rem] leading-4 text-ink-500">{type.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

