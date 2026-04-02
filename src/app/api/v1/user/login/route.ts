import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { checkPassword } from "@/server/password";
import { signToken } from "@/server/auth";
import { verifyCaptcha } from "@/server/captcha";
import { ensureUserMetaColumns } from "@/server/user_meta";

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  email: string;
  avatar: string;
  role: number;
  badge: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export async function POST(req: Request) {
  try {
    await ensureUserMetaColumns();

    const body = await req.json();
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");
    const captchaId = String(body?.captcha_id || "");
    const captchaAnswer = String(body?.captcha_answer || "");

    if (!username || !password) {
      return fail("invalid parameters", 400);
    }
    if (!verifyCaptcha(captchaId, captchaAnswer)) {
      return fail("invalid captcha", 400);
    }

    const [rows] = await db.query(
      "SELECT id, username, password_hash, email, avatar, role, badge, rating, created_at, updated_at FROM users WHERE username = ? LIMIT 1",
      [username],
    );

    const user = Array.isArray(rows) && rows.length > 0 ? (rows[0] as UserRow) : null;
    if (!user) {
      return fail("invalid username or password", 401);
    }

    const ok = await checkPassword(password, user.password_hash);
    if (!ok) {
      return fail("invalid username or password", 401);
    }

    const token = signToken({ user_id: user.id, username: user.username, role: user.role });

    return success({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        badge: user.badge,
        rating: user.rating,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch {
    return fail("internal server error", 500);
  }
}
