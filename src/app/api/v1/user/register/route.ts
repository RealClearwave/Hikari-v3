import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { hashPassword } from "@/server/password";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");
    const email = String(body?.email || "").trim();

    if (username.length < 3 || username.length > 32) {
      return fail("invalid username", 400);
    }
    if (password.length < 6) {
      return fail("invalid password", 400);
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return fail("invalid email", 400);
    }

    const [nameRows] = await db.query("SELECT id FROM users WHERE username = ? LIMIT 1", [username]);
    if (Array.isArray(nameRows) && nameRows.length > 0) {
      return fail("username already exists", 400);
    }

    const [emailRows] = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (Array.isArray(emailRows) && emailRows.length > 0) {
      return fail("email already exists", 400);
    }

    const passwordHash = await hashPassword(password);
    await db.query(
      "INSERT INTO users (username, password_hash, email, role, rating, avatar, created_at, updated_at) VALUES (?, ?, ?, 0, 1500, '', NOW(), NOW())",
      [username, passwordHash, email],
    );

    return success({ msg: "registered successfully" });
  } catch {
    return fail("internal server error", 500);
  }
}
