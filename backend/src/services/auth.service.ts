import bcrypt from 'bcryptjs';
import { findUserByEmail, createUserAndOrg, updateRefreshToken, findUserById, findUserProfileById } from '../repositories/auth.repository';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

async function persistRefreshToken(userId: string, refreshToken: string) {
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await updateRefreshToken(userId, hashedRefreshToken);
}

export async function registerService(email: string, password: string, orgName: string) {
  const existing = await findUserByEmail(email);
  if (existing) throw { status: 400, message: 'Email already exists' };
  const hashed = await bcrypt.hash(password, 10);
  const { user, org } = await createUserAndOrg(email, hashed, orgName);
  const accessToken = generateAccessToken(user.id, user.role, org.id);
  const refreshToken = generateRefreshToken(user.id);
  await persistRefreshToken(user.id, refreshToken);
  return { accessToken, refreshToken };
}
export async function loginService(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user) throw { status: 401, message: 'Invalid credentials' };
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw { status: 401, message: 'Invalid credentials' };
  const accessToken = generateAccessToken(user.id, user.role, user.orgId);
  const refreshToken = generateRefreshToken(user.id);
  await persistRefreshToken(user.id, refreshToken);
  return { accessToken, refreshToken };
}
export async function refreshService(token: string) {
  const decoded = verifyRefreshToken(token);
  const user = await findUserById(decoded.userId);
  if (!user || !user.refreshToken) throw { status: 401, message: 'Invalid refresh token' };
  const validRefreshToken = await bcrypt.compare(token, user.refreshToken);
  if (!validRefreshToken) {
    await updateRefreshToken(decoded.userId, null);
    throw { status: 401, message: 'Refresh token reuse detected' };
  }
  const accessToken = generateAccessToken(user.id, user.role, user.orgId);
  const newRefresh = generateRefreshToken(user.id);
  await persistRefreshToken(user.id, newRefresh);
  return { accessToken, refreshToken: newRefresh };
}
export async function logoutService(userId: string) {
  await updateRefreshToken(userId, null);
}
export async function profileService(userId: string) {
  const user = await findUserProfileById(userId);
  if (!user) throw { status: 404, message: 'User profile not found' };

  const displayName = user.email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return {
    id: user.id,
    email: user.email,
    displayName: displayName || user.email,
    role: user.role,
    organization: user.organization,
  };
}
