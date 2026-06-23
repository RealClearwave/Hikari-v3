import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";

interface DashboardStats {
  total_users: number;
  total_problems: number;
  total_submissions: number;
  total_contests: number;
  total_accepted: number;
  accept_rate: number;
  active_users_today: number;
  submissions_today: number;
  recent_contests: Array<{
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    participant_count: number;
  }>;
  top_users: Array<{
    user_id: number;
    username: string;
    role: number;
    badge: string;
    accepted: number;
    rating: number;
  }>;
  daily_submissions: Array<{
    day: string;
    count: number;
  }>;
}

export async function GET(req: Request) {
  try {
    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;
    if (!claims || claims.role !== 1) {
      return fail("forbidden", 403);
    }

    // Basic counts
    const [userCount] = await db.query("SELECT COUNT(*) AS cnt FROM users WHERE deleted_at IS NULL");
    const [problemCount] = await db.query("SELECT COUNT(*) AS cnt FROM problems WHERE deleted_at IS NULL");
    const [submissionCount] = await db.query("SELECT COUNT(*) AS cnt FROM records");
    const [contestCount] = await db.query("SELECT COUNT(*) AS cnt FROM contests");
    const [acCount] = await db.query("SELECT COUNT(*) AS cnt FROM records WHERE status = 2");

    const totalUsers = Number((userCount as Array<{ cnt: number }>)[0]?.cnt ?? 0);
    const totalProblems = Number((problemCount as Array<{ cnt: number }>)[0]?.cnt ?? 0);
    const totalSubmissions = Number((submissionCount as Array<{ cnt: number }>)[0]?.cnt ?? 0);
    const totalContests = Number((contestCount as Array<{ cnt: number }>)[0]?.cnt ?? 0);
    const totalAccepted = Number((acCount as Array<{ cnt: number }>)[0]?.cnt ?? 0);
    const acceptRate = totalSubmissions > 0 ? Math.round((totalAccepted / totalSubmissions) * 1000) / 10 : 0;

    // Today's activity
    const today = new Date().toISOString().slice(0, 10);
    const [todayUsers] = await db.query(
      "SELECT COUNT(DISTINCT user_id) AS cnt FROM records WHERE DATE(created_at) = ?",
      [today],
    );
    const [todaySubmissions] = await db.query(
      "SELECT COUNT(*) AS cnt FROM records WHERE DATE(created_at) = ?",
      [today],
    );
    const activeUsersToday = Number((todayUsers as Array<{ cnt: number }>)[0]?.cnt ?? 0);
    const submissionsToday = Number((todaySubmissions as Array<{ cnt: number }>)[0]?.cnt ?? 0);

    // Recent contests
    const [recentContests] = await db.query(
      `
      SELECT c.id, c.title, c.start_time, c.end_time,
             COALESCE(cp.cnt, 0) AS participant_count
      FROM contests c
      LEFT JOIN (
        SELECT contest_id, COUNT(*) AS cnt FROM contest_participants GROUP BY contest_id
      ) cp ON cp.contest_id = c.id
      ORDER BY c.id DESC
      LIMIT 5
      `,
    );

    // Top users by accepted count
    const [topUsers] = await db.query(
      `
      SELECT u.id AS user_id, u.username, u.role, u.badge, u.rating,
             COALESCE(us.accepted, 0) AS accepted
      FROM users u
      LEFT JOIN (
        SELECT user_id, SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) AS accepted
        FROM records
        GROUP BY user_id
      ) us ON us.user_id = u.id
      WHERE u.deleted_at IS NULL
      ORDER BY accepted DESC, u.rating DESC
      LIMIT 10
      `,
    );

    // Daily submissions for past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sinceStr = thirtyDaysAgo.toISOString().slice(0, 19).replace('T', ' ');

    const [dailyRows] = await db.query(
      `
      SELECT DATE(created_at) AS day, COUNT(*) AS count
      FROM records
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY day ASC
      `,
      [sinceStr],
    );

    const stats: DashboardStats = {
      total_users: totalUsers,
      total_problems: totalProblems,
      total_submissions: totalSubmissions,
      total_contests: totalContests,
      total_accepted: totalAccepted,
      accept_rate: acceptRate,
      active_users_today: activeUsersToday,
      submissions_today: submissionsToday,
      recent_contests: (Array.isArray(recentContests) ? recentContests : []) as DashboardStats['recent_contests'],
      top_users: (Array.isArray(topUsers) ? topUsers : []) as DashboardStats['top_users'],
      daily_submissions: (Array.isArray(dailyRows) ? dailyRows : []) as DashboardStats['daily_submissions'],
    };

    return success(stats);
  } catch {
    return fail("failed to get dashboard stats", 500);
  }
}
