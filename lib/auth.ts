
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

import { promisify } from "node:util";
import { cookies } from "next/headers";
import { connection } from "next/server";
import argon2 from "argon2";

import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";

const scrypt = promisify(scryptCallback);

const COOKIE = "attendance_session";
const MAX_AGE = 60 * 60 * 12;

type Role = "ADMIN" | "STUDENT";

function tokenHash(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(
  password: string,
  stored: string,
) {
  if (stored.startsWith("$argon2id$")) {
    return argon2
      .verify(stored, password)
      .catch(() => false);
  }

  const [algorithm, saltText, hashText] = stored.split("$");

  if (algorithm !== "scrypt" || !saltText || !hashText) {
    return false;
  }

  const expected = Buffer.from(hashText, "base64url");

  const actual = (await scrypt(
    password,
    Buffer.from(saltText, "base64url"),
    expected.length,
  )) as Buffer;

  return (
    expected.length === actual.length &&
    timingSafeEqual(expected, actual)
  );
}

function loginKey(identifier: string) {
  return createHash("sha256")
    .update(identifier.trim().toLowerCase())
    .digest("hex");
}

export async function assertLoginAllowed(
  identifier: string,
) {
  const attempt = await prisma.loginAttempt.findUnique({
    where: {
      key: loginKey(identifier),
    },
  });

  if (
    attempt &&
    attempt.count >= 10 &&
    Date.now() - attempt.windowStartedAt.getTime() <
      15 * 60 * 1000
  ) {
    throw new ApiError(
      429,
      "Too many login attempts. Try again later.",
      "RATE_LIMITED",
    );
  }
}

export async function recordLoginFailure(
  identifier: string,
) {
  const key = loginKey(identifier);
  const now = new Date();

  const existing = await prisma.loginAttempt.findUnique({
    where: { key },
  });

  if (
    existing &&
    now.getTime() - existing.windowStartedAt.getTime() >=
      15 * 60 * 1000
  ) {
    await prisma.loginAttempt.update({
      where: { key },
      data: {
        count: 1,
        windowStartedAt: now,
      },
    });
  } else {
    await prisma.loginAttempt.upsert({
      where: { key },
      create: {
        key,
        count: 1,
        windowStartedAt: now,
      },
      update: {
        count: { increment: 1 },
      },
    });
  }
}

export async function clearLoginFailures(
  identifier: string,
) {
  await prisma.loginAttempt.deleteMany({
    where: {
      key: loginKey(identifier),
    },
  });
}

export async function setSession(userId: string) {
  const token = randomBytes(32).toString("base64url");

  const expiresAt = new Date(
    Date.now() + MAX_AGE * 1000,
  );

  await prisma.session.create({
    data: {
      tokenHash: tokenHash(token),
      userId,
      expiresAt,
    },
  });

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: tokenHash(token),
      },
    });
  }

  jar.delete(COOKIE);
}

export async function currentUser() {
  await connection();

  const token = (await cookies()).get(COOKIE)?.value;

  if (!token) {
    return null;
  }

  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: tokenHash(token),
    },
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

  if (
    !session ||
    session.expiresAt <= new Date() ||
    !session.user.isActive
  ) {
    return null;
  }

  return {
    id: session.user.id,
    role: session.user.role as Role,
  };
}

export async function requireUser(role?: Role) {
  const user = await currentUser();

  if (!user) {
    throw new ApiError(
      401,
      "Authentication required",
      "UNAUTHENTICATED",
    );
  }

  if (role && user.role !== role) {
    throw new ApiError(
      403,
      "Insufficient permissions",
      "FORBIDDEN",
    );
  }

  return user;
}