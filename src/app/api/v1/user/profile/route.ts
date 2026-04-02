import { db } from "@/server/db";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";
import { fail, success } from "@/server/response";

interface UserRow {
  id: number;
  username: string;
  email: string;
  avatar: string;
  role: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

function parseClaims(req: Request) {
  const token = parseAuthorizationHeader(req.headers.get("authorization"));
  const claims = token ? verifyToken(token) : null;
  return claims;
}

export async function GET(req: Request) {
  try {
    const claims = parseClaims(req);
    if (!claims?.user_id) {
      return fail("unauthorized", 401);
    }

    const [rows] = await db.query(
      "SELECT id, username, email, avatar, role, rating, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [claims.user_id],
    );
    const user = Array.isArray(rows) && rows.length > 0 ? (rows[0] as UserRow) : null;
    if (!user) {
      return fail("user not found", 404);
    }

    return success(user);
  } catch {
    return fail("failed to get user profile", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const claims = parseClaims(req);
    if (!claims?.user_id) {
      return fail("unauthorized", 401);
    }

    const body = await req.json();
    const username = String(body?.username || "").trim();
    const email = String(body?.email || "").trim();
    const avatar = String(body?.avatar || "").trim();

    if (!username || !email) {
      return fail("username and email are required", 400);
    }
    if (username.length > 64) {
      return fail("username is too long", 400);
    }
    if (email.length > 128) {
      return fail("email is too long", 400);
    }
    if (avatar.length > 255) {
      return fail("avatar url is too long", 400);
    }

    const [dupRows] = await db.query(
      "SELECT id FROM users WHERE (username = ? OR email = ?) AND id <> ? AND deleted_at IS NULL LIMIT 1",
      [username, email, claims.user_id],
    );
    if (Array.isArray(dupRows) && dupRows.length > 0) {
      return fail("username or email already exists", 409);
    }

    await db.query(
      "UPDATE users SET username = ?, email = ?, avatar = ?, updated_at = NOW() WHERE id = ?",
      [username, email, avatar, claims.user_id],
    );

    const [rows] = await db.query(
      "SELECT id, username, email, avatar, role, rating, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [claims.user_id],
    );
    const user = Array.isArray(rows) && rows.length > 0 ? (rows[0] as UserRow) : null;
    if (!user) {
      return fail("user not found", 404);
    }

    return success(user);
  } catch {
    return fail("failed to update user profile", 500);
  }
}
