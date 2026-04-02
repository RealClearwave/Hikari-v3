import { db } from "@/server/db";
import { fail, success } from "@/server/response";

interface UserDetailRow {
  id: number;
  username: string;
  email: string;
  avatar: string;
  role: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const userId = Number(id);

    if (!Number.isFinite(userId) || userId <= 0) {
      return fail("invalid user id", 400);
    }

    const [rows] = await db.query(
      `
      SELECT id, username, email, avatar, role, rating, created_at, updated_at
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
