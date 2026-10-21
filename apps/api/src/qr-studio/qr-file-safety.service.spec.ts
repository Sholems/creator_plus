import { QrFileSafetyService } from './qr-file-safety.service';

const passivePdf = {
  mimetype: 'application/pdf',
  buffer: Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF'),
};

describe('QrFileSafetyService', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAutoApprove = process.env.QR_STUDIO_AUTO_APPROVE_UPLOADS;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAutoApprove === undefined) {
      delete process.env.QR_STUDIO_AUTO_APPROVE_UPLOADS;
    } else {
      process.env.QR_STUDIO_AUTO_APPROVE_UPLOADS = originalAutoApprove;
    }
  });

  it('approves a passive PDF immediately in production so it can be activated', () => {
    process.env.NODE_ENV = 'production';
    process.env.QR_STUDIO_AUTO_APPROVE_UPLOADS = 'false';

    expect(new QrFileSafetyService().initialStatus(passivePdf)).toBe('APPROVED');
  });

  it('keeps a PDF with active content pending for manual review', () => {
    process.env.NODE_ENV = 'production';
    process.env.QR_STUDIO_AUTO_APPROVE_UPLOADS = 'false';
    const activePdf = {
      ...passivePdf,
      buffer: Buffer.from('%PDF-1.7\n<< /OpenAction 1 0 R /JavaScript (alert) >>\n%%EOF'),
    };

    expect(new QrFileSafetyService().initialStatus(activePdf)).toBe('PENDING_SCAN');
  });

  it('keeps files that are not structurally PDFs pending in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.QR_STUDIO_AUTO_APPROVE_UPLOADS = 'false';

    expect(
      new QrFileSafetyService().initialStatus({
        mimetype: 'application/pdf',
        buffer: Buffer.from('not really a pdf'),
      }),
    ).toBe('PENDING_SCAN');
  });
});
