import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "tamaras_admin";
const WEEK = 60 * 60 * 24 * 7;

function secret() {
  return process.env.SESSION_SECRET || "tamaras-downtown-change-me";
}

export function adminUser() {
  return process.env.ADMIN_USER || "admin";
}

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || "Downtown2008";
}

export function signSession(expiresAt: number) {
  const payload = `admin.${expiresAt}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, exp, sig] = parts;
  if (role !== "admin") return false;
  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const expected = createHmac("sha256", secret())
    .update(`${role}.${exp}`)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isAdmin() {
  const jar = await cookies();
  return verifySession(jar.get(COOKIE)?.value);
}

export async function setAdminCookie() {
  const jar = await cookies();
  const expiresAt = Date.now() + WEEK * 1000;
  jar.set(COOKIE, signSession(expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK,
  });
}

export async function clearAdminCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
