import { BadRequestException } from '@nestjs/common';
import { sanitizeCommunityHtml } from './community-rich-content';

describe('sanitizeCommunityHtml', () => {
  beforeEach(() => {
    process.env.R2_PUBLIC_URL = 'https://cdn.mycreatorplus.com';
  });
  it('keeps safe formatting and CreatorPlus R2 images', () => {
    expect(
      sanitizeCommunityHtml(
        '<h2>Hello</h2><img src="https://cdn.mycreatorplus.com/community/a.png">',
      ),
    ).toContain('community/a.png');
  });
  it('removes scripts, handlers, data images, and unapproved iframes', () => {
    const clean = sanitizeCommunityHtml(
      '<p onclick="x()">Hello</p><script>x()</script><img src="data:image/png;base64,x"><iframe src="https://evil.example/embed"></iframe>',
    );
    expect(clean).not.toMatch(/script|onclick|data:image|evil\.example/);
  });
  it('rejects content with no readable text', () => {
    expect(() => sanitizeCommunityHtml('<script>alert(1)</script>')).toThrow(BadRequestException);
  });
});
