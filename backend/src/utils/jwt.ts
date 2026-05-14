import jwt from 'jsonwebtoken';
import crypto from 'crypto';

function readJwtSecret(name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET') {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Add ${name}="your-long-random-secret" to backend/.env and restart the backend server.`
    );
  }

  return value;
}

const JWT_SECRET = readJwtSecret('JWT_SECRET');
const JWT_REFRESH_SECRET = readJwtSecret('JWT_REFRESH_SECRET');

export function generateAccessToken(userId: string, role: string, orgId: string) {
  return jwt.sign({ userId, role, orgId }, JWT_SECRET, { expiresIn: '15m' });
}
export function generateRefreshToken(userId: string) {
  return jwt.sign({ userId, tokenVersion: crypto.randomUUID() }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}
export function verifyAccessToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; orgId: string };
}
export function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string };
}
