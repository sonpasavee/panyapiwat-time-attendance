import { prisma } from "@/lib/db";

export function findLoginAttempt(key: string) {
  return prisma.loginAttempt.findUnique({ where: { key } });
}

export function updateLoginAttempt(
  key: string,
  data: { count: number; windowStartedAt: Date },
) {
  return prisma.loginAttempt.update({ where: { key }, data });
}

export function upsertLoginAttempt(
  key: string,
  windowStartedAt: Date,
) {
  return prisma.loginAttempt.upsert({
    where: { key },
    create: { key, count: 1, windowStartedAt },
    update: { count: { increment: 1 } },
  });
}

export function deleteLoginAttempt(key: string) {
  return prisma.loginAttempt.deleteMany({ where: { key } });
}

export function createSession(
  tokenHash: string,
  userId: string,
  expiresAt: Date,
) {
  return prisma.session.create({
    data: { tokenHash, userId, expiresAt },
  });
}

export function deleteSession(tokenHash: string) {
  return prisma.session.deleteMany({ where: { tokenHash } });
}

export function findSession(tokenHash: string) {
  return prisma.session.findUnique({
    where: { tokenHash },
    select: {
      userId: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          role: true,
          isActive: true,
        },
      },
    },
  });
}
