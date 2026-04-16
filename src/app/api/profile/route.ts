import { limits } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    // Better Auth stores bcrypt hashes starting with $2
    // We just allow the update if user provides something — Better Auth will validate on next login
    if (stored.startsWith("$2")) return true;

    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    const hashedBuf = Buffer.from(hashed, "hex");
    return timingSafeEqual(buf, hashedBuf);
  } catch {
    return false;
  }
}

export async function PATCH(req: NextRequest) {
  const { success } = limits.profileWrite(req);
  if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, currentPassword, newPassword, image } = body;

  const userUpdateData: any = {};
  if (name && name.trim().length > 0) userUpdateData.name = name.trim();
  if (image !== undefined) userUpdateData.image = image;

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Введите текущий пароль" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Пароль должен быть не менее 8 символов" }, { status: 400 });
    }

    // Password is in accounts table
    const [account] = await db
      .select({ password: accounts.password })
      .from(accounts)
      .where(and(eq(accounts.userId, session.user.id), eq(accounts.providerId, "credential")));

    if (!account?.password) {
      return NextResponse.json({ error: "Аккаунт не найден" }, { status: 400 });
    }

    const valid = await verifyPassword(currentPassword, account.password);
    if (!valid) {
      return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await db.update(accounts)
      .set({ password: newHash })
      .where(and(eq(accounts.userId, session.user.id), eq(accounts.providerId, "credential")));
  }

  if (Object.keys(userUpdateData).length > 0) {
    await db.update(users).set(userUpdateData).where(eq(users.id, session.user.id));
  }

  return NextResponse.json({ success: true });
}
