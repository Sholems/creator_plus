import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID, randomBytes } from 'crypto';
import { prisma } from '@creatormarket/database';
import { EmailService } from '../email/email.service';

export interface SessionContext {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  private readonly creatorProfileSelect = {
    id: true,
    storeName: true,
    slug: true,
    verified: true,
    verificationStatus: true,
  } as const;

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private signAccessToken(userId: string, email: string) {
    return this.jwtService.sign({ sub: userId, email });
  }

  private async createSession(userId: string, context: SessionContext = {}) {
    const refreshToken = randomUUID();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId,
        token: this.hashToken(refreshToken),
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        expiresAt: refreshExpiresAt,
      },
    });

    return refreshToken;
  }

  async register(email: string, password: string, displayName?: string, context: SessionContext = {}) {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'platform.registration_enabled' },
    });
    const registrationEnabled = setting ? setting.value !== false : true;
    if (!registrationEnabled) {
      throw new ForbiddenException('New registrations are currently disabled');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: displayName || email.split('@')[0],
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        emailVerified: true,
        createdAt: true,
        creatorProfile: true,
      },
    });

    const accessToken = this.signAccessToken(user.id, user.email);
    const refreshToken = await this.createSession(user.id, context);

    void this.emailService.sendWelcome(user.email, user.displayName || 'there');
    void this.sendVerificationEmail(user.id, user.email, user.displayName || 'there');

    return {
      user: { ...user, creatorProfile: null },
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string, context: SessionContext = {}) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        creatorProfile: { select: this.creatorProfileSelect },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = this.signAccessToken(user.id, user.email);
    const refreshToken = await this.createSession(user.id, context);

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const session = await prisma.session.findUnique({
      where: { token: this.hashToken(refreshToken) },
      include: { user: { select: { id: true, email: true, status: true, deletedAt: true } } },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = session.user;
    if (!user || user.deletedAt || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Rotate: revoke the old session, issue a new one
    await prisma.session.delete({ where: { id: session.id } });
    const newRefreshToken = await this.createSession(user.id, {
      userAgent: session.userAgent ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
    });

    const accessToken = this.signAccessToken(user.id, user.email);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    await prisma.session.deleteMany({ where: { token: this.hashToken(refreshToken) } });
    return { success: true };
  }

  private async sendVerificationEmail(userId: string, email: string, displayName: string) {
    const token = this.jwtService.sign(
      { sub: userId, type: 'email-verify' },
      { expiresIn: '24h' }
    );
    await this.emailService.sendEmailVerification(email, displayName, token);
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== 'email-verify') {
        throw new UnauthorizedException('Invalid token');
      }

      const user = await prisma.user.update({
        where: { id: payload.sub },
        data: { emailVerified: true },
      });

      return { success: true, email: user.email };
    } catch {
      throw new UnauthorizedException('Invalid or expired verification token');
    }
  }

  async resendVerificationEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.emailVerified) {
      return { success: true };
    }

    await this.sendVerificationEmail(user.id, user.email, user.displayName || 'there');

    return { success: true };
  }

  async validateUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatar: true,
        emailVerified: true,
        status: true,
        createdAt: true,
        creatorProfile: { select: this.creatorProfileSelect },
        roles: { select: { role: { select: { name: true } } } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    const { roles, ...rest } = user;
    return {
      ...rest,
      roles: roles.map((r) => r.role.name),
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal whether the email exists.
      return { success: true };
    }

    // Single-use reset token: a high-entropy random secret is emailed to the
    // user, but only its SHA-256 hash is stored — so a database leak cannot be
    // used to reset anyone's password. Any older tokens are invalidated first.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    await this.emailService.sendPasswordReset(user.email, user.displayName || 'there', rawToken);

    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Atomically claim the token: the guarded update only succeeds while it is
    // unused and unexpired, so a token can be redeemed exactly once even under
    // concurrent requests.
    const claimed = await prisma.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });
    if (!record) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    return { success: true };
  }
}
