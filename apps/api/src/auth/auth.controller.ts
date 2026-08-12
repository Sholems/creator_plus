import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
  RefreshTokenDto,
} from '../common';

const REFRESH_COOKIE = 'refresh_token';
// Scoped to the auth routes so the long-lived refresh token is only ever sent
// where it's needed (refresh + logout), never on ordinary API calls.
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Store the rotating refresh token in an httpOnly cookie so it is never
   * readable by JavaScript (XSS-safe) — unlike the access token which the SPA
   * keeps in memory/storage. `secure` is on in production; `sameSite: lax`
   * covers same-site deployments (api + web on one registrable domain). For a
   * genuinely cross-site split, switch to `sameSite: 'none'` (requires secure).
   */
  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_MAX_AGE_MS,
    });
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() dto: RegisterDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...result } = await this.authService.register(
      dto.email,
      dto.password,
      dto.displayName,
      { userAgent: req.headers['user-agent'], ipAddress: req.ip },
    );
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Request() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...result } = await this.authService.login(
      dto.email,
      dto.password,
      { userAgent: req.headers['user-agent'], ipAddress: req.ip },
    );
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Exchange the refresh cookie for a new access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: RefreshTokenDto,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] || dto?.refreshToken;
    if (!token) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const { refreshToken, accessToken } = await this.authService.refresh(token);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke the refresh token and clear the cookie' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  async logout(
    @Request() req,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: RefreshTokenDto,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] || dto?.refreshToken;
    if (token) {
      await this.authService.logout(token);
    }
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    return { success: true };
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto.email);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    return this.authService.validateUser(req.user.sub);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid current password' })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
