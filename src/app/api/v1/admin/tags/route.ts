import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";

async function isAdmin(req: Request): Promise<boolean> {
  const token = parseAuthorizationHeader(req.headers.get("authorization"));
  if (!token) return false;
  const claims = verifyToken(token);
  return claims?.role === 1;
}

export async function GET(req: Request) {
  if (!(await isAdmin(req))) return fail("unauthorized", 401);
  try {
    const [rows] = await db.query(
      `SELECT t.*, COUNT(pt.problem_id) AS problem_count
       FROM tags t
       LEFT JOIN problem_tags pt ON pt.tag_id = t.id
       GROUP BY t.id
       ORDER BY t.name ASC`,
      []
    );
    return success({ list: Array.isArray(rows) ? rows : [] });
  } catch {
    return fail("failed to get tags", 500);
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin(req))) return fail("unauthorized", 401);
  try {
    const body = await req.json();
    const { name, color } = body;
    if (!name || !name.trim()) return fail("tag name required", 400);

    const [, info] = await db.query(
      "INSERT INTO tags (name, color) VALUES (?, ?)",
      [name.trim(), color || "blue"]
    );
    return success({ id: info?.insertId });
  } catch {
    return fail("failed to create tag", 500);
  }
}

export async function PUT(req: Request) {
  if (!(await isAdmin(req))) return fail("unauthorized", 401);
  try {
    const body = await req.json();
    const { id, name, color } = body;
    if (!id) return fail("tag id required", 400);

    const updates: string[] = [];
    const params: (string | number)[] = [];
    if (name) { updates.push("name = ?"); params.push(name.trim()); }
    if (color) { updates.push("color = ?"); params.push(color); }
    if (updates.length === 0) return fail("nothing to update", 400);

    params.push(id);
    await db.query(
      `UPDATE tags SET ${updates.join(", ")} WHERE id = ?`,
      params
    );
    return success(null);
  } catch {
    return fail("failed to update tag", 500);
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin(req))) return fail("unauthorized", 401);
  try {
    const { searchParams } = new URL(req.url, "http://localhost");
    const id = Number(searchParams.get("id"));
    if (!id) return fail("tag id required", 400);

    await db.query("DELETE FROM problem_tags WHERE tag_id = ?", [id]);
    await db.query("DELETE FROM tags WHERE id = ?", [id]);
    return success(null);
  } catch {
    return fail("failed to delete tag", 500);
  }
}
