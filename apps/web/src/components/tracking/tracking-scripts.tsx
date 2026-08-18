'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { API_BASE } from '@/lib/env';

interface TrackingConfig {
  trackingEnabled: boolean;
  facebookPixelId: string;
  ga4MeasurementId: string;
  gtmContainerId: string;
  tiktokPixelId: string;
  twitterPixelId: string;
  hotjarId: string;
}

/**
 * Fetches tracking/analytics IDs from the public API and injects the
 * corresponding third-party scripts. Runs client-side only so it never
 * blocks initial render.
 */
export function TrackingScripts() {
  const [config, setConfig] = useState<TrackingConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/platform/tracking`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setConfig(data);
      })
      .catch(() => {
        /* silently ignore — no tracking is fine */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!config || !config.trackingEnabled) return null;

  return (
    <>
      {/* Google Tag Manager */}
      {config.gtmContainerId && (
        <>
          <Script
            id="gtm-script"
            src={`https://www.googletagmanager.com/gtm.js?id=${config.gtmContainerId}`}
            strategy="afterInteractive"
          />
          <Script id="gtm-datalayer" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${config.gtmContainerId}');`}
          </Script>
        </>
      )}

      {/* Google Analytics 4 (only if GTM isn't handling it) */}
      {config.ga4MeasurementId && !config.gtmContainerId && (
        <Script
          id="ga4-script"
          src={`https://www.googletagmanager.com/gtag/js?id=${config.ga4MeasurementId}`}
          strategy="afterInteractive"
        />
      )}
      {config.ga4MeasurementId && (
        <Script id="ga4-config" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${config.ga4MeasurementId}');`}
        </Script>
      )}

      {/* Facebook Pixel */}
      {config.facebookPixelId && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${config.facebookPixelId}');
            fbq('track', 'PageView');`}
        </Script>
      )}

      {/* TikTok Pixel */}
      {config.tiktokPixelId && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`!function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e+""]=+new Date,ttq._o=ttq._o||{},ttq._o[e+""]=n||{};var a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src=r+"?sdkid="+e+"&lib="+t;var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(a,s)};
            ttq.load('${config.tiktokPixelId}');
            ttq.page();}(window, document, 'ttq');`}
        </Script>
      )}

      {/* Twitter/X Pixel */}
      {config.twitterPixelId && (
        <Script id="twitter-pixel" strategy="afterInteractive">
          {`!function(e,t,n,u,v,i,a,o){e.twq||(i=e.twq=function(){i.exe?i.exe.apply(i,arguments):
            i.queue.push(arguments)},i.version='1.1',i.queue=[],a=t.createElement(n),
            a.async=!0,a.src='https://static.ads-twitter.com/uwt.js',
            o=t.getElementsByTagName(n)[0],o.parentNode.insertBefore(a,o))}(window,document,'script');
            twq('init','${config.twitterPixelId}');
            twq('track','PageView');`}
        </Script>
      )}

      {/* Hotjar */}
      {config.hotjarId && (
        <Script id="hotjar" strategy="afterInteractive">
          {`(function(h,o,t,j,a,r){
            h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
            h._hjSettings={hjid:${config.hotjarId},hjsv:6};
            a=o.getElementsByTagName('head')[0];
            r=o.createElement('script');r.async=1;
            r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
            a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`}
        </Script>
      )}

      {/* GTM noscript fallback (for users with JS disabled) */}
      {config.gtmContainerId && (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${config.gtmContainerId}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
      )}
    </>
  );
}
