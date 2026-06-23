import { db } from "@/server/db";
import { fail, success } from "@/server/response";
import { parseAuthorizationHeader, verifyToken } from "@/server/auth";
import {
  kmeans,
  detectAnomaly,
  normalizeFeatures,
  normalizeTestPoint,
  clusterSummary,
  elbowMethod,
  DataPoint,
} from "@/server/kmeans";

// POST /api/v1/admin/kmeans — train model or detect anomaly
// Actions:
//   { action: "train", problem_id: number, k?: number }
//   { action: "detect", problem_id: number, time_used: number, memory_used: number, submission_id?: number }
//   { action: "elbow", problem_id: number }
//   { action: "info", problem_id: number }

export async function POST(req: Request) {
  try {
    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;
    if (!claims || claims.role !== 1) {
      return fail("forbidden — admin only", 403);
    }

    const body = await req.json();
    const action = String(body?.action || "").trim();

    if (action === "train") {
      return handleTrain(body);
    } else if (action === "detect") {
      return handleDetect(body);
    } else if (action === "elbow") {
      return handleElbow(body);
    } else if (action === "info") {
      return handleInfo(body);
    }

    return fail("invalid action. Use: train, detect, elbow, info", 400);
  } catch {
    return fail("kmeans operation failed", 500);
  }
}

// GET /api/v1/admin/kmeans?problem_id=X — get training data summary
export async function GET(req: Request) {
  try {
    const token = parseAuthorizationHeader(req.headers.get("authorization"));
    const claims = token ? verifyToken(token) : null;
    if (!claims || claims.role !== 1) {
      return fail("forbidden — admin only", 403);
    }

    const { searchParams } = new URL(req.url, "http://localhost");
    const problemId = Number(searchParams.get("problem_id") || 0);

    if (!Number.isFinite(problemId) || problemId <= 0) {
      return fail("invalid problem_id", 400);
    }

    // Get submission stats for this problem
    const [acRows] = await db.query(
      "SELECT COUNT(*) AS cnt FROM records WHERE problem_id = ? AND status = 2",
      [problemId],
    );
    const [totalRows] = await db.query(
      "SELECT COUNT(*) AS cnt FROM records WHERE problem_id = ?",
      [problemId],
    );

    const acCount = Number((acRows as Array<{ cnt: number }>)[0]?.cnt ?? 0);
    const totalCount = Number((totalRows as Array<{ cnt: number }>)[0]?.cnt ?? 0);

    // Get AC submissions with time/memory data
    const [acSamples] = await db.query(
      `
      SELECT id, time_used, memory_used, status, language, created_at
      FROM records
      WHERE problem_id = ? AND status = 2 AND time_used > 0
      ORDER BY id DESC
      LIMIT 500
      `,
      [problemId],
    );

    // Get some non-AC samples for contrast
    const [nonAcSamples] = await db.query(
      `
      SELECT id, time_used, memory_used, status, language, created_at
      FROM records
      WHERE problem_id = ? AND status != 2 AND time_used > 0
      ORDER BY id DESC
      LIMIT 100
      `,
      [problemId],
    );

    return success({
      problem_id: problemId,
      ac_count: acCount,
      total_submissions: totalCount,
      ac_samples: Array.isArray(acSamples) ? acSamples : [],
      non_ac_samples: Array.isArray(nonAcSamples) ? nonAcSamples : [],
      sufficient_data: acCount >= 10,
    });
  } catch {
    return fail("failed to get kmeans info", 500);
  }
}

async function handleTrain(body: Record<string, unknown>) {
  const problemId = Number(body?.problem_id || 0);
  const k = Math.min(10, Math.max(2, Number(body?.k || 3)));

  if (!Number.isFinite(problemId) || problemId <= 0) {
    return fail("invalid problem_id", 400);
  }

  // Fetch AC submissions for training
  const [rows] = await db.query(
    `
    SELECT id, time_used, memory_used
    FROM records
    WHERE problem_id = ? AND status = 2 AND time_used > 0
    ORDER BY id DESC
    LIMIT 500
    `,
    [problemId],
  );

  const submissions = Array.isArray(rows) ? rows as Array<{ id: number; time_used: number; memory_used: number }> : [];

  if (submissions.length < 10) {
    return fail(
      `insufficient training data: need at least 10 AC submissions, got ${submissions.length}`,
      400,
    );
  }

  // Filter outliers for cleaner training (remove top/bottom 5%)
  const sorted = [...submissions].sort((a, b) => a.time_used - b.time_used);
  const trimStart = Math.floor(sorted.length * 0.05);
  const trimEnd = Math.floor(sorted.length * 0.95);
  const trimmed = sorted.slice(trimStart, trimEnd);

  // Normalize features
  const rawFeatures = trimmed.map((s) => ({
    time_used: s.time_used,
    memory_used: s.memory_used,
  }));
  const { normalized, timeRange, memRange } = normalizeFeatures(rawFeatures);

  const dataPoints: DataPoint[] = trimmed.map((s, i) => ({
    id: s.id,
    features: normalized[i],
  }));

  // Run K-means
  const result = kmeans(dataPoints, k);

  // Also compute elbow curve
  const elbow = elbowMethod(dataPoints, Math.min(8, dataPoints.length));

  return success({
    problem_id: problemId,
    k,
    training_samples: dataPoints.length,
    total_ac_samples: submissions.length,
    time_range: { min: timeRange[0], max: timeRange[1] },
    memory_range: { min: memRange[0], max: memRange[1] },
    clusters: clusterSummary(result),
    silhouette_score: Math.round(result.silhouetteScore * 1000) / 1000,
    iterations: result.iterations,
    converged: result.converged,
    elbow_curve: elbow,
    // Store raw cluster info for visualization
    raw_clusters: result.clusters.map((c) => ({
      centroid: c.centroid,
      points: c.points.map((p) => ({
        id: p.id,
        features: p.features,
      })),
      variance: c.variance,
    })),
    // Store normalization params for later detect calls
    _normalization: { timeRange, memRange },
    _k: k,
  });
}

async function handleDetect(body: Record<string, unknown>) {
  const problemId = Number(body?.problem_id || 0);
  const timeUsed = Number(body?.time_used || 0);
  const memoryUsed = Number(body?.memory_used || 0);
  const sensitivity = Number(body?.sensitivity || 2.5);

  if (!Number.isFinite(problemId) || problemId <= 0) {
    return fail("invalid problem_id", 400);
  }

  // Train on the fly with AC data
  const [rows] = await db.query(
    `
    SELECT id, time_used, memory_used
    FROM records
    WHERE problem_id = ? AND status = 2 AND time_used > 0
    ORDER BY id DESC
    LIMIT 500
    `,
    [problemId],
  );

  const submissions = Array.isArray(rows) ? rows as Array<{ id: number; time_used: number; memory_used: number }> : [];

  if (submissions.length < 10) {
    return fail(
      `insufficient training data: need at least 10 AC submissions, got ${submissions.length}`,
      400,
    );
  }

  // Trim and normalize
  const sorted = [...submissions].sort((a, b) => a.time_used - b.time_used);
  const trimStart = Math.floor(sorted.length * 0.05);
  const trimEnd = Math.floor(sorted.length * 0.95);
  const trimmed = sorted.slice(trimStart, trimEnd);

  const rawFeatures = trimmed.map((s) => ({
    time_used: s.time_used,
    memory_used: s.memory_used,
  }));
  const { normalized, timeRange, memRange } = normalizeFeatures(rawFeatures);

  const dataPoints: DataPoint[] = trimmed.map((s, i) => ({
    id: s.id,
    features: normalized[i],
  }));

  // Use K=3 by default
  const result = kmeans(dataPoints, 3);

  // Normalize test point
  const testFeatures = normalizeTestPoint(timeUsed, memoryUsed, timeRange, memRange);

  const testDp: DataPoint = {
    id: Number(body?.submission_id || 0),
    features: testFeatures,
  };

  // Detect anomaly
  const report = detectAnomaly(testDp, result.clusters, sensitivity);

  // Compute stats for context
  const acTimes = trimmed.map((s) => s.time_used);
  const acMems = trimmed.map((s) => s.memory_used);
  const avgTime = acTimes.reduce((a, b) => a + b, 0) / acTimes.length;
  const avgMem = acMems.reduce((a, b) => a + b, 0) / acMems.length;

  return success({
    problem_id: problemId,
    submission: {
      time_used: timeUsed,
      memory_used: memoryUsed,
    },
    normal_baseline: {
      avg_time: Math.round(avgTime),
      avg_memory: Math.round(avgMem),
      samples: trimmed.length,
      time_range: { min: timeRange[0], max: timeRange[1] },
      memory_range: { min: memRange[0], max: memRange[1] },
    },
    anomaly_report: report,
    cluster_summary: clusterSummary(result),
    silhouette_score: Math.round(result.silhouetteScore * 1000) / 1000,
    // Include cluster data for visualization
    _clusters: result.clusters.map((c) => ({
      centroid: c.centroid,
      points: c.points.map((p) => ({ id: p.id, features: p.features })),
    })),
    _normalization: { timeRange, memRange },
    _testPoint: testFeatures,
    _sensitivity: sensitivity,
  });
}

async function handleElbow(body: Record<string, unknown>) {
  const problemId = Number(body?.problem_id || 0);

  if (!Number.isFinite(problemId) || problemId <= 0) {
    return fail("invalid problem_id", 400);
  }

  const [rows] = await db.query(
    `
    SELECT id, time_used, memory_used
    FROM records
    WHERE problem_id = ? AND status = 2 AND time_used > 0
    ORDER BY id DESC
    LIMIT 500
    `,
    [problemId],
  );

  const submissions = Array.isArray(rows) ? rows as Array<{ id: number; time_used: number; memory_used: number }> : [];

  if (submissions.length < 20) {
    return fail(`need at least 20 AC submissions for elbow analysis, got ${submissions.length}`, 400);
  }

  const sorted = [...submissions].sort((a, b) => a.time_used - b.time_used);
  const trimStart = Math.floor(sorted.length * 0.05);
  const trimEnd = Math.floor(sorted.length * 0.95);
  const trimmed = sorted.slice(trimStart, trimEnd);

  const rawFeatures = trimmed.map((s) => ({ time_used: s.time_used, memory_used: s.memory_used }));
  const { normalized } = normalizeFeatures(rawFeatures);

  const dataPoints: DataPoint[] = trimmed.map((s, i) => ({
    id: s.id,
    features: normalized[i],
  }));

  const elbow = elbowMethod(dataPoints, 8);

  return success({
    problem_id: problemId,
    samples: dataPoints.length,
    elbow_curve: elbow,
  });
}

async function handleInfo(body: Record<string, unknown>) {
  const problemId = Number(body?.problem_id || 0);

  if (!Number.isFinite(problemId) || problemId <= 0) {
    return fail("invalid problem_id", 400);
  }

  const [acRows] = await db.query(
    "SELECT COUNT(*) AS cnt FROM records WHERE problem_id = ? AND status = 2",
    [problemId],
  );
  const [totalRows] = await db.query(
    "SELECT COUNT(*) AS cnt FROM records WHERE problem_id = ?",
    [problemId],
  );

  const acCount = Number((acRows as Array<{ cnt: number }>)[0]?.cnt ?? 0);
  const totalCount = Number((totalRows as Array<{ cnt: number }>)[0]?.cnt ?? 0);

  // Quick check: can we train?
  if (acCount < 10) {
    return success({
      problem_id: problemId,
      can_train: false,
      reason: `需要至少 10 条 AC 提交记录，当前仅 ${acCount} 条`,
      ac_count: acCount,
      total_submissions: totalCount,
    });
  }

  // Do a quick train and return summary
  const [rows] = await db.query(
    `
    SELECT id, time_used, memory_used
    FROM records
    WHERE problem_id = ? AND status = 2 AND time_used > 0
    ORDER BY id DESC
    LIMIT 500
    `,
    [problemId],
  );

  const submissions = Array.isArray(rows) ? rows as Array<{ id: number; time_used: number; memory_used: number }> : [];
  const sorted = [...submissions].sort((a, b) => a.time_used - b.time_used);
  const trimStart = Math.floor(sorted.length * 0.05);
  const trimEnd = Math.floor(sorted.length * 0.95);
  const trimmed = sorted.slice(trimStart, trimEnd);

  const rawFeatures = trimmed.map((s) => ({ time_used: s.time_used, memory_used: s.memory_used }));
  const { normalized, timeRange, memRange } = normalizeFeatures(rawFeatures);

  const dataPoints: DataPoint[] = trimmed.map((s, i) => ({
    id: s.id,
    features: normalized[i],
  }));

  const result = kmeans(dataPoints, 3);

  return success({
    problem_id: problemId,
    can_train: true,
    ac_count: acCount,
    total_submissions: totalCount,
    training_samples: dataPoints.length,
    time_range: { min: timeRange[0], max: timeRange[1] },
    memory_range: { min: memRange[0], max: memRange[1] },
    clusters: clusterSummary(result),
    silhouette_score: Math.round(result.silhouetteScore * 1000) / 1000,
    converged: result.converged,
    iterations: result.iterations,
  });
}
