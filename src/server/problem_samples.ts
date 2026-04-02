import { promises as fs } from "fs";
import path from "path";

export interface ProblemSampleCase {
  input: string;
  output: string;
}

const PROBLEM_DATA_ROOT = path.join(process.cwd(), "problem_data");

function normalizeText(value: unknown) {
  return String(value ?? "").replace(/\r\n/g, "\n");
}

function normalizeSampleCases(sampleCases: unknown): ProblemSampleCase[] {
  let raw: unknown = sampleCases;

  if (typeof sampleCases === "string") {
    try {
      raw = JSON.parse(sampleCases);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => ({
      input: normalizeText((item as { input?: unknown })?.input),
      output: normalizeText((item as { output?: unknown })?.output),
    }))
    .filter((item) => item.input.length > 0 || item.output.length > 0);
}

function problemDir(problemId: number) {
  return path.join(PROBLEM_DATA_ROOT, String(problemId));
}

async function ensureProblemDir(problemId: number) {
  await fs.mkdir(problemDir(problemId), { recursive: true });
}

export async function saveProblemSampleCases(problemId: number, sampleCases: unknown) {
  const normalized = normalizeSampleCases(sampleCases);
  await ensureProblemDir(problemId);

  const dir = problemDir(problemId);
  const existing = await fs.readdir(dir, { withFileTypes: true });
  await Promise.all(
    existing
      .filter((entry) => entry.isFile() && (entry.name.endsWith(".in") || entry.name.endsWith(".out")))
      .map((entry) => fs.unlink(path.join(dir, entry.name))),
  );

  await Promise.all(
    normalized.flatMap((sample, index) => {
      const id = index + 1;
      const inFile = path.join(dir, `${id}.in`);
      const outFile = path.join(dir, `${id}.out`);
      return [
        fs.writeFile(inFile, sample.input, "utf8"),
        fs.writeFile(outFile, sample.output, "utf8"),
      ];
    }),
  );

  return normalized;
}

export async function loadProblemSampleCases(problemId: number) {
  const dir = problemDir(problemId);

  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    const inFiles = files
      .filter((entry) => entry.isFile() && entry.name.endsWith(".in"))
      .map((entry) => entry.name)
      .sort((a, b) => Number(a.replace(/\.in$/, "")) - Number(b.replace(/\.in$/, "")));

    const sampleCases: ProblemSampleCase[] = [];
    for (const inName of inFiles) {
      const base = inName.replace(/\.in$/, "");
      const outName = `${base}.out`;
      const inPath = path.join(dir, inName);
      const outPath = path.join(dir, outName);

      const input = await fs.readFile(inPath, "utf8");
      let output = "";
      try {
        output = await fs.readFile(outPath, "utf8");
      } catch {
        output = "";
      }

      sampleCases.push({ input, output });
    }

    return sampleCases;
  } catch {
    return [];
  }
}

export async function migrateDbSampleCasesIfNeeded(problemId: number, dbSampleCases: unknown) {
  const fileSampleCases = await loadProblemSampleCases(problemId);
  if (fileSampleCases.length > 0) {
    return fileSampleCases;
  }

  const normalized = normalizeSampleCases(dbSampleCases);
  if (normalized.length === 0) {
    return [];
  }

  await saveProblemSampleCases(problemId, normalized);
  return normalized;
}
