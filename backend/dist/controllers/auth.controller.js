"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.profile = profile;
const zod_1 = require("zod");
const auth_service_1 = require("../services/auth.service");
const RegisterSchema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(6), orgName: zod_1.z.string().min(2) });
const LoginSchema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string() });
function setRefreshCookie(res, refreshToken) {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
    });
}
function clearRefreshCookie(res) {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/api/auth',
    });
}
function getRefreshToken(req) {
    const cookieHeader = req.headers.cookie;
    const cookieToken = cookieHeader
        ?.split(';')
        .map((cookie) => cookie.trim().split('='))
        .find(([name]) => name === 'refreshToken')?.[1];
    return cookieToken ? decodeURIComponent(cookieToken) : req.body?.refreshToken;
}
async function register(req, res) {
    const data = RegisterSchema.parse(req.body);
    const tokens = await (0, auth_service_1.registerService)(data.email, data.password, data.orgName);
    setRefreshCookie(res, tokens.refreshToken);
    res.status(201).json({ accessToken: tokens.accessToken });
}
async function login(req, res) {
    const data = LoginSchema.parse(req.body);
    const tokens = await (0, auth_service_1.loginService)(data.email, data.password);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ accessToken: tokens.accessToken });
}
async function refresh(req, res) {
    const refreshToken = getRefreshToken(req);
    if (!refreshToken)
        return res.status(400).json({ error: 'Refresh token required' });
    const tokens = await (0, auth_service_1.refreshService)(refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ accessToken: tokens.accessToken });
}
async function logout(req, res) {
    await (0, auth_service_1.logoutService)(req.user.userId);
    clearRefreshCookie(res);
    res.json({ message: 'Logged out' });
}
async function profile(req, res) {
    const user = await (0, auth_service_1.profileService)(req.user.userId);
    res.json(user);
}
