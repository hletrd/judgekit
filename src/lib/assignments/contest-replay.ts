import { computeContestRanking } from "@/lib/assignments/contest-scoring";
import { rawQueryAll } from "@/lib/db/queries";
import type { ScoringModel } from "@/types";
import pLimit from "p-limit";

export type ContestReplaySnapshot = {
  cutoffSec: number;
  cutoffMs: number;
  entries: Array<{
    userId: string;
    name: string;
    rank: number;
    totalScore: number;
    totalPenalty: number;
  }>;
};

export type ContestReplayData = {
  scoringModel: ScoringModel;
  snapshots: ContestReplaySnapshot[];
};

export function sampleReplayCutoffs(cutoffSecs: number[], maxSnapshots = 40) {
  const uniqueSorted = [...new Set(cutoffSecs)].sort((left, right) => left - right);
  if (uniqueSorted.length <= maxSnapshots) {
    return uniqueSorted;
  }

  const sampled = new Set<number>();
  for (let index = 0; index < maxSnapshots; index += 1) {
    const sourceIndex = Math.round((index * (uniqueSorted.length - 1)) / Math.max(maxSnapshots - 1, 1));
    sampled.add(uniqueSorted[sourceIndex]);
  }

  return uniqueSorted.filter((cutoff) => sampled.has(cutoff));
}

export async function computeContestReplay(
  assignmentId: string,
  maxSnapshots = 40,
): Promise<ContestReplayData | null> {
  const cutoffRows = await rawQueryAll<{ cutoffSec: number }>(
    `SELECT DISTINCT EXTRACT(EPOCH FROM submitted_at)::bigint AS "cutoffSec"
     FROM submissions
     WHERE assignment_id = @assignmentId
     ORDER BY "cutoffSec"`,
    { assignmentId },
  );

  const sampledCutoffs = sampleReplayCutoffs(
    cutoffRows.map((row) => Number(row.cutoffSec)).filter((value) => Number.isFinite(value)),
    maxSnapshots,
  );

  if (sampledCutoffs.length === 0) {
    return null;
  }

  // Compute snapshots with bounded concurrency (4 parallel) instead of
  // sequential queries — reduces wall-clock time for large contests.
  const snapshotLimiter = pLimit(4);
  const snapshotResults = await Promise.all(
    sampledCutoffs.map((cutoffSec) =>
      snapshotLimiter(async () => {
        const ranking = await computeContestRanking(assignmentId, cutoffSec);
        return {
          cutoffSec,
          cutoffMs: cutoffSec * 1000,
          scoringModel: ranking.scoringModel,
          entries: ranking.entries.slice(0, 10).map((entry) => ({
            userId: entry.userId,
            name: entry.name || entry.username,
            rank: entry.rank,
            totalScore: entry.totalScore,
            totalPenalty: entry.totalPenalty,
          })),
        };
      })
    )
  );

  // All snapshots share the same scoring model for a given assignment
  const scoringModel: ScoringModel = snapshotResults[0]?.scoringModel ?? "ioi";
  const snapshots: ContestReplaySnapshot[] = snapshotResults.map(
    ({ cutoffSec, cutoffMs, entries }) => ({ cutoffSec, cutoffMs, entries })
  );

  return {
    scoringModel,
    snapshots,
  };
}
