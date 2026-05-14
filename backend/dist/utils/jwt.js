"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
function readJwtSecret(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable ${name}. Add ${name}="your-long-random-secret" to backend/.env and restart the backend server.`);
    }
    return value;
}
const JWT_SECRET = readJwtSecret('JWT_SECRET');
const JWT_REFRESH_SECRET = readJwtSecret('JWT_REFRESH_SECRET');
function generateAccessToken(userId, role, orgId) {
    return jsonwebtoken_1.default.sign({ userId, role, orgId }, JWT_SECRET, { expiresIn: '15m' });
}
function generateRefreshToken(userId) {
    return jsonwebtoken_1.default.sign({ userId, tokenVersion: crypto_1.default.randomUUID() }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_SECRET);
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
}
