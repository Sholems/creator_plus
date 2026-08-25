# License integration — prompt for your AI agent

Give this whole file to your AI coding agent, together with the two files in
this folder: **`license-client.js`** and **`README.md`**.

---

You are integrating license-key protection into my offline PWA. It's sold on
CreatorPlus, which issues each buyer a license key that may be activated on a
limited number of devices (default: 2). The app must require a valid license
before it runs.

## How it must work

One-time **online** activation (the server enforces the device limit and returns
a signed certificate), then the app runs **offline** by verifying that
certificate locally. The certificate lasts 30 days and auto-renews whenever the
app is online.

## Use the provided files — do not rewrite them

I've given you `license-client.js` — a dependency-free ES module that handles
device identity, activation, offline signature verification (ECDSA P-256 / JWS
via Web Crypto), 30-day certificate renewal, and deactivation — and `README.md`
with its API. Add `license-client.js` to the project as-is. If reimplementing is
truly unavoidable for my framework, keep its behaviour and the exact crypto.

## Config to use

- `apiBase`: `https://api.mycreatorplus.com/api/v1`
- `productId`: `581c3d50-f6c1-46bd-93d4-899d9c4ae243`
- `appName`: `Momentum`

## Tasks

1. Instantiate the client and call `init()` at startup.
2. Before rendering the main app, call `check()`. If `status.active` is true,
   load the app. Otherwise show an **Activation screen** with a license-key
   input.
3. On the activation screen, call `activate(key)`. On success, enter the app. On
   error, show the message (e.g. the device-limit message) — never crash.
4. Add `window.addEventListener('online', () => client.check())` so the
   certificate renews silently in the background.
5. Add a **"Deactivate this device"** control in settings that calls
   `deactivate()` and returns the user to the activation screen (frees a slot so
   they can use another device).
6. Don't persist license data yourself — the client handles storage.

## Activation-screen UX / copy

- Explain a key activates on up to 2 devices, and a slot can be freed from the
  CreatorPlus dashboard (**Dashboard → Licenses**) or by deactivating here.
- Handle offline gracefully: if `check()` returns `expired` while offline, tell
  the user to connect to the internet once to renew.

## Acceptance criteria

- A fresh install shows the activation screen; a valid key activates and opens
  the app.
- After activating, the app opens on subsequent launches **with no network**
  (airplane mode) for up to 30 days.
- Activating on a 3rd device shows a "device limit reached" message instead of
  unlocking.
- Deactivating a device frees a slot and returns to the activation screen.

Follow `README.md` for exact method signatures.

---

## Minimal example (for reference)

```html
<script type="module">
  import { LicenseClient } from './license-client.js';

  const license = new LicenseClient({
    apiBase: 'https://api.mycreatorplus.com/api/v1',
    productId: '581c3d50-f6c1-46bd-93d4-899d9c4ae243',
    appName: 'Momentum',
  });

  await license.init();
  const status = await license.check();

  if (status.active) {
    startApp();
  } else {
    showActivationScreen();
  }

  async function onActivate(keyFromInput) {
    try {
      await license.activate(keyFromInput);
      startApp();
    } catch (e) {
      showError(e.message); // e.g. "already active on the maximum of 2 device(s)"
    }
  }

  window.addEventListener('online', () => license.check());
</script>
```
