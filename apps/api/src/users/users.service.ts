import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@creatorplus/database';

@Injectable()
export class UsersService {
  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatar: true,
        emailVerified: true,
        status: true,
        createdAt: true,
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, data: { displayName?: string; avatar?: string; bio?: string }) {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userData: Record<string, string> = {};
    if (data.displayName !== undefined) userData.displayName = data.displayName;
    if (data.avatar !== undefined) userData.avatar = data.avatar;

    return prisma.user.update({
      where: { id },
      data: {
        ...userData,
        profile:
          data.bio !== undefined
            ? {
                upsert: {
                  create: { bio: data.bio },
                  update: { bio: data.bio },
                },
              }
            : undefined,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatar: true,
        emailVerified: true,
        status: true,
        createdAt: true,
        profile: true,
      },
    });
  }

  async getProfile(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatar: true,
        emailVerified: true,
        status: true,
        createdAt: true,
        profile: true,
        creatorProfile: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            verified: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
