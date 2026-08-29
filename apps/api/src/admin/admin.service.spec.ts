import { NotFoundException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { AdminService } from './admin.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    qrCampaign: { findUnique: jest.fn(), update: jest.fn() },
    qrAsset: { findFirst: jest.fn() },
    qrAdminAction: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

const p = prisma as any;

function makeService() {
  return new AdminService(
    {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
  );
}

describe('AdminService.pauseOrArchiveQrCampaign (U9)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    p.auditLog.create.mockResolvedValue({});
  });

  it('throws NotFound for a missing campaign', async () => {
    p.qrCampaign.findUnique.mockResolvedValue(null);
    await expect(makeService().pauseOrArchiveQrCampaign('admin-1', 'c1', {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('pauses a campaign and writes an audited admin action with a reason code (R31)', async () => {
    p.qrCampaign.findUnique.mockResolvedValue({ id: 'c1', status: 'ACTIVE', archivedAt: null });
    const tx = {
      qrCampaign: { update: jest.fn().mockResolvedValue({ id: 'c1', status: 'PAUSED' }) },
      qrAdminAction: { create: jest.fn() },
    };
    p.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await makeService().pauseOrArchiveQrCampaign('admin-1', 'c1', { reasonCode: 'ABUSE_REPORT', reason: 'spam' });

    expect(tx.qrCampaign.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' }, data: expect.objectContaining({ status: 'PAUSED' }) }),
    );
    expect(tx.qrAdminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'pause', reasonCode: 'ABUSE_REPORT', actorId: 'admin-1' }) }),
    );
  });

  it('archives when archive=true', async () => {
    p.qrCampaign.findUnique.mockResolvedValue({ id: 'c1', status: 'ACTIVE', archivedAt: null });
    const tx = {
      qrCampaign: { update: jest.fn().mockResolvedValue({ id: 'c1', status: 'ARCHIVED' }) },
      qrAdminAction: { create: jest.fn() },
    };
    p.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await makeService().pauseOrArchiveQrCampaign('admin-1', 'c1', { reasonCode: 'POLICY_VIOLATION', archive: true });

    expect(tx.qrCampaign.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ARCHIVED' }) }),
    );
    expect(tx.qrAdminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'archive' }) }),
    );
  });

  it('approves a pending file asset and audits it (unblocks activation)', async () => {
    p.qrAsset.findFirst.mockResolvedValue({ id: 'a1', campaignId: 'c1', safetyStatus: 'PENDING_SCAN' });
    const tx = {
      qrAsset: { update: jest.fn().mockResolvedValue({ id: 'a1', safetyStatus: 'APPROVED' }) },
      qrAdminAction: { create: jest.fn() },
    };
    p.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await makeService().setQrAssetSafety('admin-1', 'c1', 'a1', { status: 'APPROVED' });

    expect(tx.qrAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1' }, data: expect.objectContaining({ safetyStatus: 'APPROVED', safetyReason: null }) }),
    );
    expect(tx.qrAdminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'approve_asset', actorId: 'admin-1' }) }),
    );
  });

  it('blocks a file asset with a reason', async () => {
    p.qrAsset.findFirst.mockResolvedValue({ id: 'a1', campaignId: 'c1', safetyStatus: 'PENDING_SCAN' });
    const tx = {
      qrAsset: { update: jest.fn().mockResolvedValue({ id: 'a1', safetyStatus: 'BLOCKED' }) },
      qrAdminAction: { create: jest.fn() },
    };
    p.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await makeService().setQrAssetSafety('admin-1', 'c1', 'a1', { status: 'BLOCKED', reason: 'malware' });

    expect(tx.qrAsset.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ safetyStatus: 'BLOCKED', safetyReason: 'malware' }) }),
    );
    expect(tx.qrAdminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'block_asset' }) }),
    );
  });

  it('throws NotFound when the asset is not on the campaign', async () => {
    p.qrAsset.findFirst.mockResolvedValue(null);
    await expect(makeService().setQrAssetSafety('admin-1', 'c1', 'zzz', { status: 'APPROVED' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
