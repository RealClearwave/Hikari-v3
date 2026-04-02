import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";
import { ensureUserMetaColumns } from "@/server/user_meta";

interface UserDetailRow {
  id: number;
  username: string;
  email: string;
  avatar: string;
  role: number;
  badge: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureUserMetaColumns();

    const { id } = await context.params;
    const userId = Number(id);

    if (!Number.isFinite(userId) || userId <= 0) {
      return fail("invalid user id", 400);
    }

    const [rows] = await db.query(
      `
      SELECT id, username, email, avatar, role, badge, rating, created_at, updated_at
      FROM users
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1
      `,
      [userId],
    );

    const user = Array.isArray(rows) && rows.length > 0 ? (rows[0] as UserDetailRow) : null;
    if (!user) {
      return fail("user not found", 404);
    }

    return success(user);
  } catch {
    return fail("failed to get user detail", 500);
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await ensureUserMetaColumns();

    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;
    if (!claims?.user_id) {
      return fail("unauthorized", 401);
    }
    if (claims.role !== 1) {
      return fail("forbidden", 403);
    }

    const { id } = await context.params;
    const userId = Number(id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return fail("invalid user id", 400);
    }

    const body = await req.json();
    const username = String(body?.username || "").trim();
    const email = String(body?.email || "").trim();
    const avatar = String(body?.avatar || "").trim();
    const role = Number(body?.role);
    const badge = String(body?.badge || "").trim();

    if (!username || !email) {
      return fail("username and email are required", 400);
    }
    if (username.length < 3 || username.length > 32) {
      return fail("invalid username", 400);
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return fail("invalid email", 400);
    }
    if (![0, 1].includes(role)) {
      return fail("invalid role", 400);
    }
    if (badge.length > 64) {
      return fail("badge is too long", 400);
    }

    const normalizedBadge = role === 1 ? badge : "";

    const [targetRows] = await db.query(
      "SELECT id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [userId],
    );
    if (!Array.isArray(targetRows) || targetRows.length === 0) {
      return fail("user not found", 404);
    }

    const [nameRows] = await db.query(
      "SELECT id FROM users WHERE username = ? AND id <> ? AND deleted_at IS NULL LIMIT 1",
      [username, userId],
    );
    if (Array.isArray(nameRows) && nameRows.length > 0) {
      return fail("username already exists", 400);
    }

    const [emailRows] = await db.query(
      "SELECT id FROM users WHERE email = ? AND id <> ? AND deleted_at IS NULL LIMIT 1",
      [email, userId],
    );
    if (Array.isArray(emailRows) && emailRows.length > 0) {
      return fail("email already exists", 400);
    }

    await db.query(
      "UPDATE users SET username = ?, email = ?, avatar = ?, role = ?, badge = ?, updated_at = NOW() WHERE id = ?",
      [username, email, avatar, role, normalizedBadge, userId],
    );

    const [rows] = await db.query(
      `
      SELECT id, username, email, avatar, role, badge, rating, created_at, updated_at
      FROM users
      WHERE id = ? AND deleted_at IS NULL
      LIMIT 1
      `,
      [userId],
    );
    const user = Array.isArray(rows) && rows.length > 0 ? (rows[0] as UserDetailRow) : null;
    if (!user) {
      return fail("user not found", 404);
    }

    return success(user);
  } catch {
    return fail("failed to update user detail", 500);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;
    if (!claims?.user_id) {
      return fail("unauthorized", 401);
    }
    if (claims.role !== 1) {
      return fail("forbidden", 403);
    }

    const { id } = await context.params;
    const userId = Number(id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return fail("invalid user id", 400);
    }
    if (userId === claims.user_id) {
      return fail("cannot delete yourself", 400);
    }

    const [rows] = await db.query("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1", [userId]);
    if (!Array.isArray(rows) || rows.length === 0) {
      return fail("user not found", 404);
    }

    await db.query("UPDATE users SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?", [userId]);

    return success({ ok: true });
  } catch {
    return fail("failed to delete user", 500);
  }
}
