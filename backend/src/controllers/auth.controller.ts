import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { loginService, logoutService, profileService, refreshService, registerService } from '../services/auth.service';
const RegisterSchema = z.object({ email: z.string().email(), password: z.string().min(6), orgName: z.string().min(2) });
const LoginSchema = z.object({ email: z.string().email(), password: z.string() });

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth',
  });
}

function getRefreshToken(req: Request) {
  const cookieHeader = req.headers.cookie;
  const cookieToken = cookieHeader
    ?.split(';')
    .map((cookie) => cookie.trim().split('='))
    .find(([name]) => name === 'refreshToken')?.[1];

  return cookieToken ? decodeURIComponent(cookieToken) : req.body?.refreshToken;
}

export async function register(req: Request, res: Response) {
  const data = RegisterSchema.parse(req.body);
  const tokens = await registerService(data.email, data.password, data.orgName);
  setRefreshCookie(res, tokens.refreshToken);
  res.status(201).json({ accessToken: tokens.accessToken });
}
export async function login(req: Request, res: Response) {
  const data = LoginSchema.parse(req.body);
  const tokens = await loginService(data.email, data.password);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ accessToken: tokens.accessToken });
}
export async function refresh(req: Request, res: Response) {
  const refreshToken = getRefreshToken(req);
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
  const tokens = await refreshService(refreshToken);
  setRefreshCookie(res, tokens.refreshToken);
  res.json({ accessToken: tokens.accessToken });
}
export async function logout(req: AuthRequest, res: Response) {
  await logoutService(req.user!.userId);
  clearRefreshCookie(res);
  res.json({ message: 'Logged out' });
}
export async function profile(req: AuthRequest, res: Response) {
  const user = await profileService(req.user!.userId);
  res.json(user);
}
