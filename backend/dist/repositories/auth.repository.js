"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
exports.createUserAndOrg = createUserAndOrg;
exports.updateRefreshToken = updateRefreshToken;
exports.findUserById = findUserById;
exports.findUserProfileById = findUserProfileById;
const prisma_1 = __importDefault(require("../utils/prisma"));
async function findUserByEmail(email) {
    return prisma_1.default.user.findUnique({ where: { email } });
}
async function createUserAndOrg(email, hashedPassword, orgName) {
    return prisma_1.default.$transaction(async (tx) => {
        const org = await tx.organization.create({ data: { name: orgName } });
        const user = await tx.user.create({ data: { email, password: hashedPassword, orgId: org.id, role: 'ADMIN' } });
        return { user, org };
    });
}
async function updateRefreshToken(userId, token) {
    return prisma_1.default.user.update({ where: { id: userId }, data: { refreshToken: token } });
}
async function findUserById(userId) {
    return prisma_1.default.user.findUnique({ where: { id: userId } });
}
async function findUserProfileById(userId) {
    return prisma_1.default.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            role: true,
            organization: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });
}
