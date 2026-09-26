import { BadRequestException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';
import { CommunityEventsService } from './community-events.service';

jest.mock('@creatorplus/database', () => ({
  prisma: {
    communityEvent: { findFirst: jest.fn() },
    communityEventRsvp: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}));

const p = prisma as any;

describe('CommunityEventsService', () => {
  const access = { assertAccess: jest.fn().mockResolvedValue({ isAdmin: false }) } as any;
  const service = new CommunityEventsService(access);

  beforeEach(() => jest.clearAllMocks());

  it('does not reveal a live meeting link before RSVP', async () => {
    p.communityEvent.findFirst.mockResolvedValue({
      id: 'e1',
      accessLevel: 'FREE',
      meetingUrl: 'https://meet.google.com/example',
      rsvps: [],
      _count: { rsvps: 3 },
    });

    await expect(service.get('u1', 'office-hours')).resolves.toEqual(
      expect.objectContaining({ meetingUrl: null, rsvpStatus: null, attendeeCount: 3 }),
    );
  });

  it('enforces event capacity when a member reserves a place', async () => {
    p.communityEvent.findFirst.mockResolvedValue({
      id: 'e1',
      accessLevel: 'FREE',
      meetingUrl: null,
      capacity: 20,
      _count: { rsvps: 20 },
    });
    p.communityEventRsvp.findUnique.mockResolvedValue(null);

    await expect(service.rsvp('u1', 'e1', true)).rejects.toBeInstanceOf(BadRequestException);
    expect(p.communityEventRsvp.upsert).not.toHaveBeenCalled();
  });
});
