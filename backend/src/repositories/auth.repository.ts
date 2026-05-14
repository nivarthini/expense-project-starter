import prisma from '../utils/prisma';
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}
export async function createUserAndOrg(email: string, hashedPassword: string, orgName: string) {
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: orgName } });
    const user = await tx.user.create({ data: { email, password: hashedPassword, orgId: org.id, role: 'ADMIN' } });
    return { user, org };
  });
}
export async function updateRefreshToken(userId: string, token: string | null) {
  return prisma.user.update({ where: { id: userId }, data: { refreshToken: token } });
}
export async function findUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}
export async function findUserProfileById(userId: string) {
  return prisma.user.findUnique({
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
