"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerService = registerService;
exports.loginService = loginService;
exports.refreshService = refreshService;
exports.logoutService = logoutService;
exports.profileService = profileService;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_repository_1 = require("../repositories/auth.repository");
const jwt_1 = require("../utils/jwt");
async function persistRefreshToken(userId, refreshToken) {
    const hashedRefreshToken = await bcryptjs_1.default.hash(refreshToken, 10);
    await (0, auth_repository_1.updateRefreshToken)(userId, hashedRefreshToken);
}
async function registerService(email, password, orgName) {
    const existing = await (0, auth_repository_1.findUserByEmail)(email);
    if (existing)
        throw { status: 400, message: 'Email already exists' };
    const hashed = await bcryptjs_1.default.hash(password, 10);
    const { user, org } = await (0, auth_repository_1.createUserAndOrg)(email, hashed, orgName);
    const accessToken = (0, jwt_1.generateAccessToken)(user.id, user.role, org.id);
    const refreshToken = (0, jwt_1.generateRefreshToken)(user.id);
    await persistRefreshToken(user.id, refreshToken);
    return { accessToken, refreshToken };
}
async function loginService(email, password) {
    const user = await (0, auth_repository_1.findUserByEmail)(email);
    if (!user)
        throw { status: 401, message: 'Invalid credentials' };
    const valid = await bcryptjs_1.default.compare(password, user.password);
    if (!valid)
        throw { status: 401, message: 'Invalid credentials' };
    const accessToken = (0, jwt_1.generateAccessToken)(user.id, user.role, user.orgId);
    const refreshToken = (0, jwt_1.generateRefreshToken)(user.id);
    await persistRefreshToken(user.id, refreshToken);
    return { accessToken, refreshToken };
}
async function refreshService(token) {
    const decoded = (0, jwt_1.verifyRefreshToken)(token);
    const user = await (0, auth_repository_1.findUserById)(decoded.userId);
    if (!user || !user.refreshToken)
        throw { status: 401, message: 'Invalid refresh token' };
    const validRefreshToken = await bcryptjs_1.default.compare(token, user.refreshToken);
    if (!validRefreshToken) {
        await (0, auth_repository_1.updateRefreshToken)(decoded.userId, null);
        throw { status: 401, message: 'Refresh token reuse detected' };
    }
    const accessToken = (0, jwt_1.generateAccessToken)(user.id, user.role, user.orgId);
    const newRefresh = (0, jwt_1.generateRefreshToken)(user.id);
    await persistRefreshToken(user.id, newRefresh);
    return { accessToken, refreshToken: newRefresh };
}
async function logoutService(userId) {
    await (0, auth_repository_1.updateRefreshToken)(userId, null);
}
async function profileService(userId) {
    const user = await (0, auth_repository_1.findUserProfileById)(userId);
    if (!user)
        throw { status: 404, message: 'User profile not found' };
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
