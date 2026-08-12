import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 12;

export interface TokenPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: TokenPayload, secret: string, expiresIn: string = '15m'): string {
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}

export function generateRefreshToken(payload: TokenPayload, secret: string, expiresIn: string = '7d'): string {
  return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
}

export function generateTokenPair(payload: TokenPayload, secret: string): TokenPair {
  return {
    accessToken: generateAccessToken(payload, secret),
    refreshToken: generateRefreshToken(payload, secret),
  };
}

export function verifyToken(token: string, secret: string): TokenPayload {
  return jwt.verify(token, secret) as TokenPayload;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  return decoded.exp * 1000 < Date.now();
}
