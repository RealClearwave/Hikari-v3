/**
 * Pure TypeScript K-means clustering + anomaly detection
 * No external dependencies. Self-contained implementation.
 *
 * Used for OJ submission anomaly detection:
 * - Train on historical AC submissions (time_used, memory_used)
 * - Detect anomalies by measuring distance from normal clusters
 */

// ============================================================
// Types
// ============================================================

export interface DataPoint {
  id: number;           // submission id
  features: number[];   // normalized feature vector, e.g. [time_used, memory_used]
  label?: string;       // optional label (e.g. "AC", "WA")
}

export interface Cluster {
  centroid: number[];
  points: DataPoint[];
  variance: number;      // average squared distance from centroid
}

export interface KMeansResult {
  clusters: Cluster[];
  iterations: number;
  converged: boolean;
  silhouetteScore: number;
}

export interface AnomalyReport {
  isAnomaly: boolean;
  anomalyScore: number;        // 0–1, higher = more anomalous
  nearestCluster: number;
  distanceToNearestCluster: number;
  threshold: number;           // the cutoff used
  details: string;
}

// ============================================================
// Vector math helpers
// ============================================================

function euclideanDist(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function mean(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const result = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      result[i] += v[i];
    }
  }
  for (let i = 0; i < dim; i++) {
    result[i] /= vectors.length;
  }
  return result;
}

function variance(vectors: number[][], centroid: number[]): number {
  if (vectors.length === 0) return 0;
  let sum = 0;
  for (const v of vectors) {
    sum += euclideanDist(v, centroid) ** 2;
  }
  return sum / vectors.length;
}

// ============================================================
// K-means++ initialization
// ============================================================

function kmeansPlusPlus(points: DataPoint[], k: number): number[][] {
  if (points.length === 0 || k === 0) return [];

  const centroids: number[][] = [];

  // First centroid: random point
  const firstIdx = Math.floor(Math.random() * points.length);
  centroids.push([...points[firstIdx].features]);

  // Subsequent centroids: probability proportional to distance^2
  for (let c = 1; c < k; c++) {
    const distances: number[] = points.map((p) => {
      // Distance to nearest existing centroid
      let minDist = Infinity;
      for (const centroid of centroids) {
        const d = euclideanDist(p.features, centroid);
        if (d < minDist) minDist = d;
      }
      return minDist * minDist;
    });

    const totalDist = distances.reduce((a, b) => a + b, 0);
    if (totalDist === 0) {
      // All remaining points coincide with existing centroids
      const remaining = points.filter(
        (p) => !centroids.some((c) => euclideanDist(p.features, c) === 0)
      );
      if (remaining.length > 0) {
        centroids.push([...remaining[0].features]);
      }
      continue;
    }

    let r = Math.random() * totalDist;
    for (let i = 0; i < points.length; i++) {
      r -= distances[i];
      if (r <= 0) {
        centroids.push([...points[i].features]);
        break;
      }
    }

    // Fallback if no centroid was selected (floating point)
    if (centroids.length <= c) {
      centroids.push([...points[points.length - 1].features]);
    }
  }

  return centroids;
}

// ============================================================
// Elbow method — find optimal K
// ============================================================

export function elbowMethod(
  points: DataPoint[],
  maxK: number = 8,
  maxIterations: number = 50,
): { k: number; wcss: number }[] {
  const results: { k: number; wcss: number }[] = [];
  const validK = Math.min(maxK, points.length);

  for (let k = 2; k <= validK; k++) {
    const result = kmeans(points, k, maxIterations);
    const wcss = result.clusters.reduce(
      (sum, c) => sum + c.variance * c.points.length,
      0,
    );
    results.push({ k, wcss });
  }

  return results;
}

// ============================================================
// Core K-means clustering
// ============================================================

export function kmeans(
  points: DataPoint[],
  k: number = 3,
  maxIterations: number = 100,
  tolerance: number = 1e-6,
): KMeansResult {
  if (points.length === 0) {
    return { clusters: [], iterations: 0, converged: false, silhouetteScore: 0 };
  }

  const actualK = Math.min(k, points.length);

  // Initialize with k-means++
  let centroids = kmeansPlusPlus(points, actualK);

  let iterations = 0;
  let converged = false;
  let clusters: Cluster[] = [];

  for (iterations = 0; iterations < maxIterations; iterations++) {
    // Assign points to nearest centroid
    const assignments: DataPoint[][] = Array.from({ length: actualK }, () => []);
    for (const point of points) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < actualK; c++) {
        const dist = euclideanDist(point.features, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      assignments[bestCluster].push(point);
    }

    // Recalculate centroids
    const newCentroids: number[][] = [];
    let maxShift = 0;

    for (let c = 0; c < actualK; c++) {
      if (assignments[c].length === 0) {
        // Empty cluster: keep old centroid
        newCentroids.push([...centroids[c]]);
        continue;
      }
      const featVectors = assignments[c].map((p) => p.features);
      const newCentroid = mean(featVectors);
      newCentroids.push(newCentroid);
      const shift = euclideanDist(centroids[c], newCentroid);
      if (shift > maxShift) maxShift = shift;
    }

    centroids = newCentroids;

    // Build clusters
    clusters = assignments.map((pts, i) => ({
      centroid: centroids[i],
      points: pts,
      variance: variance(
        pts.map((p) => p.features),
        centroids[i],
      ),
    }));

    if (maxShift < tolerance) {
      converged = true;
      break;
    }
  }

  // Build final clusters if not already built
  if (clusters.length === 0) {
    const assignments: DataPoint[][] = Array.from({ length: actualK }, () => []);
    for (const point of points) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < actualK; c++) {
        const dist = euclideanDist(point.features, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      assignments[bestCluster].push(point);
    }
    clusters = assignments.map((pts, i) => ({
      centroid: centroids[i],
      points: pts,
      variance: variance(
        pts.map((p) => p.features),
        centroids[i],
      ),
    }));
  }

  // Compute silhouette score
  const silhouetteScore = computeSilhouette(clusters, points.length);

  return { clusters, iterations, converged, silhouetteScore };
}

// ============================================================
// Silhouette score (cluster quality metric, -1 to 1)
// ============================================================

function computeSilhouette(clusters: Cluster[], totalPoints: number): number {
  if (clusters.length <= 1 || totalPoints === 0) return 0;

  let totalScore = 0;

  for (const cluster of clusters) {
    for (const point of cluster.points) {
      // a(i): average distance to points in same cluster
      let a = 0;
      if (cluster.points.length > 1) {
        let sum = 0;
        for (const other of cluster.points) {
          sum += euclideanDist(point.features, other.features);
        }
        a = sum / (cluster.points.length - 1);
      }

      // b(i): minimum average distance to points in another cluster
      let b = Infinity;
      for (const otherCluster of clusters) {
        if (otherCluster === cluster) continue;
        let sum = 0;
        for (const other of otherCluster.points) {
          sum += euclideanDist(point.features, other.features);
        }
        const avg = sum / otherCluster.points.length;
        if (avg < b) b = avg;
      }
      if (b === Infinity) b = 0;

      const maxAB = Math.max(a, b);
      if (maxAB > 0) {
        totalScore += (b - a) / maxAB;
      }
    }
  }

  return totalScore / totalPoints;
}

// ============================================================
// Anomaly detection
// ============================================================

export function detectAnomaly(
  testPoint: DataPoint,
  clusters: Cluster[],
  sensitivity: number = 2.5, // multiplier for stddev threshold
): AnomalyReport {
  if (clusters.length === 0) {
    return {
      isAnomaly: false,
      anomalyScore: 0,
      nearestCluster: -1,
      distanceToNearestCluster: 0,
      threshold: 0,
      details: 'No clusters available for comparison.',
    };
  }

  // Find nearest cluster
  let minDist = Infinity;
  let nearestIdx = 0;
  for (let i = 0; i < clusters.length; i++) {
    const dist = euclideanDist(testPoint.features, clusters[i].centroid);
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }

  const nearestCluster = clusters[nearestIdx];
  const clusterStdDev = Math.sqrt(nearestCluster.variance);
  const threshold = clusterStdDev * sensitivity;

  // Anomaly if distance > sensitivity * stddev from nearest cluster
  const isAnomaly = minDist > threshold && clusterStdDev > 0;

  // Compute anomaly score (0-1, sigmoid-like)
  // At distance = threshold: score ≈ 0.5
  // At distance = 2*threshold: score ≈ 0.88
  // At distance = 3*threshold: score ≈ 0.95
  const rawScore = threshold > 0 ? minDist / threshold : minDist > 0 ? 1 : 0;
  const anomalyScore = Math.min(1, rawScore / (1 + rawScore) * 2); // scale to 0-1

  const featureNames = ['执行耗时(ms)', '内存占用(KB)'];
  const centroidDesc = nearestCluster.centroid
    .map((v, i) => `${featureNames[i] || `特征${i}`}=${v.toFixed(1)}`)
    .join(', ');

  const details = isAnomaly
    ? `异常提交！距离最近聚类中心 ${minDist.toFixed(2)}（阈值 ${threshold.toFixed(2)}），` +
      `最近聚类: [${centroidDesc}]，包含 ${nearestCluster.points.length} 个正常样本，` +
      `聚类内标准差 ${clusterStdDev.toFixed(2)}`
    : `正常提交。距离最近聚类中心 ${minDist.toFixed(2)}（阈值 ${threshold.toFixed(2)}），` +
      `最近聚类: [${centroidDesc}]`;

  return {
    isAnomaly,
    anomalyScore: Math.round(anomalyScore * 1000) / 1000,
    nearestCluster: nearestIdx,
    distanceToNearestCluster: Math.round(minDist * 100) / 100,
    threshold: Math.round(threshold * 100) / 100,
    details,
  };
}

// ============================================================
// Feature normalization (min-max scaling)
// ============================================================

export function normalizeFeatures(
  points: { time_used: number; memory_used: number }[],
): { normalized: number[][]; timeRange: [number, number]; memRange: [number, number] } {
  if (points.length === 0) {
    return { normalized: [], timeRange: [0, 1], memRange: [0, 1] };
  }

  const times = points.map((p) => p.time_used);
  const mems = points.map((p) => p.memory_used);

  const timeMin = Math.min(...times);
  const timeMax = Math.max(...times);
  const memMin = Math.min(...mems);
  const memMax = Math.max(...mems);

  const timeRange: [number, number] = [timeMin, timeMax];
  const memRange: [number, number] = [memMin, memMax];

  const normalized = points.map((p) => {
    const t = timeMax > timeMin ? (p.time_used - timeMin) / (timeMax - timeMin) : 0.5;
    const m = memMax > memMin ? (p.memory_used - memMin) / (memMax - memMin) : 0.5;
    return [t, m];
  });

  return { normalized, timeRange, memRange };
}

export function normalizeTestPoint(
  timeUsed: number,
  memoryUsed: number,
  timeRange: [number, number],
  memRange: [number, number],
): number[] {
  const t = timeRange[1] > timeRange[0]
    ? (timeUsed - timeRange[0]) / (timeRange[1] - timeRange[0])
    : 0.5;
  const m = memRange[1] > memRange[0]
    ? (memoryUsed - memRange[0]) / (memRange[1] - memRange[0])
    : 0.5;
  return [t, m];
}

// ============================================================
// Summary stats for display
// ============================================================

export function clusterSummary(result: KMeansResult): Array<{
  clusterIndex: number;
  size: number;
  percentage: string;
  centroid: { time_used: number; memory_used: number };
  stdDev: number;
  description: string;
}> {
  const total = result.clusters.reduce((s, c) => s + c.points.length, 0);

  return result.clusters.map((c, i) => {
    const pct = total > 0 ? ((c.points.length / total) * 100).toFixed(1) : '0';
    // Determine cluster character based on centroid position
    const [t, m] = c.centroid;
    let desc = '';
    if (t < 0.33 && m < 0.33) desc = '快速低耗（最优解）';
    else if (t < 0.33 && m >= 0.33) desc = '快速高耗';
    else if (t >= 0.33 && m < 0.33) desc = '慢速低耗';
    else if (t >= 0.67 || m >= 0.67) desc = '慢速高耗（疑似暴力/低效解）';
    else desc = '中等性能';

    return {
      clusterIndex: i,
      size: c.points.length,
      percentage: `${pct}%`,
      centroid: {
        time_used: Math.round(t * 100) / 100,
        memory_used: Math.round(m * 100) / 100,
      },
      stdDev: Math.round(Math.sqrt(c.variance) * 1000) / 1000,
      description: desc,
    };
  });
}
