import { ImageResponse } from 'next/og';

export const alt =
  'CreatorPlus — The Marketplace to Buy & Sell Digital Products, Templates, Courses & AI Prompts';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a2e22',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 132,
            height: 132,
            borderRadius: 30,
            background: '#103d2e',
            border: '5px solid #d79b1a',
            marginBottom: 40,
          }}
        >
          <span style={{ fontSize: 74, fontWeight: 800, color: '#ffffff' }}>C</span>
          <span style={{ fontSize: 74, fontWeight: 800, color: '#d79b1a' }}>P</span>
        </div>
        <div style={{ display: 'flex', fontSize: 90, fontWeight: 800, letterSpacing: -2 }}>
          <span style={{ color: '#ffffff' }}>Creator</span>
          <span style={{ color: '#d79b1a' }}>Plus</span>
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 28,
            padding: '0 120px',
            fontSize: 34,
            lineHeight: 1.35,
            color: '#b6d8c6',
            textAlign: 'center',
          }}
        >
          The Marketplace to Buy &amp; Sell Digital Products, Templates, Courses &amp; AI Prompts
        </div>
      </div>
    ),
    { ...size },
  );
}
