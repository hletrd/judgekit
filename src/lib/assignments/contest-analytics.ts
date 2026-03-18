import { sqlite } from "@/lib/db";
import { computeContestRanking } from "./contest-scoring";

type HistogramBucket = {
  label: string;
  min: number;
  max: number;
  count: number;
};

type ProblemSolveRate = {
  problemId: string;
  title: string;
  points: number;
  solved: number;
  partial: number;
  zero: number;
  total: number;
  solvedPercent: number;
  partialPercent: number;
  zeroPercent: number;
};

type TimelinePoint = {
  timestamp: number;
  cumulativeSolveCount: number;
};

type ProblemTimeline = {
  problemId: string;
  title: string;
  points: TimelinePoint[];
};

type StudentProgression = {
  userId: string;
  name: string;
  points: Array<{ timestamp: number; totalScore: number }>;
};

type ProblemSolveTime = {
  problemId: string;
  title: string;
  medianMinutes: number;
  meanMinutes: number;
  solveCount: number;
};

type CheatSummary = {
  totalEvents: number;
  byType: Record<string, number>;
  flaggedStudents: Array<{
    userId: string;
    name: string;
    username: string;
    eventCount: number;
  }>;
};

export type ContestAnalytics = {
  scoreDistribution: HistogramBucket[];
  problemSolveRates: ProblemSolveRate[];
  solveTimelines?: ProblemTimeline[];
  studentProgressions?: StudentProgression[];
  problemSolveTimes: ProblemSolveTime[];
  cheatSummary: CheatSummary;
};

type ProblemRow = {
  problemId: string;
  title: string;
  points: number;
};

type SubmissionTimeRow = {
  userId: string;
  name: string;
  problemId: string;
  score: number | null;
  submittedAt: number;
  points: number;
};

type CheatCountRow = {
  userId: string;
  name: string;
  username: string;
  eventType: string;
  count: number;
};

export function computeContestAnalytics(assignmentId: string, includeTimeline = false): ContestAnalytics {
  const { entries } = computeContestRanking(assignmentId);

  const problems = sqlite
    .prepare<[string], ProblemRow>(
      `SELECT ap.problem_id AS problemId, p.title, COALESCE(ap.points, 100) AS points
       FROM assignment_problems ap
       INNER JOIN problems p ON p.id = ap.problem_id
       WHERE ap.assignment_id = ?
       ORDER BY ap.sort_order, p.title`
    )
    .all(assignmentId);

  // 1. Score distribution
  const totalPointsPossible = problems.reduce((s, p) => s + p.points, 0);
  const scoreDistribution: HistogramBucket[] = [];
  for (let i = 0; i < 10; i++) {
    const min = i * 10;
    const max = i === 9 ? 100 : (i + 1) * 10;
    scoreDistribution.push({ label: `${min}-${max}%`, min, max, count: 0 });
  }

  for (const entry of entries) {
    const pct = totalPointsPossible > 0 ? (entry.totalScore / totalPointsPossible) * 100 : 0;
    const bucketIdx = Math.min(Math.floor(pct / 10), 9);
    scoreDistribution[bucketIdx].count++;
  }

  // 2. Per-problem solve rates
  const problemSolveRates: ProblemSolveRate[] = problems.map((p) => {
    let solved = 0;
    let partial = 0;
    let zero = 0;

    for (const entry of entries) {
      const pr = entry.problems.find((ep) => ep.problemId === p.problemId);
      if (!pr || pr.attempts === 0) {
        zero++;
      } else if (pr.score >= p.points) {
        solved++;
      } else if (pr.score > 0) {
        partial++;
      } else {
        zero++;
      }
    }

    const total = entries.length || 1;
    return {
      problemId: p.problemId,
      title: p.title,
      points: p.points,
      solved,
      partial,
      zero,
      total: entries.length,
      solvedPercent: Math.round((solved / total) * 100),
      partialPercent: Math.round((partial / total) * 100),
      zeroPercent: Math.round((zero / total) * 100),
    };
  });

  // 3. First-AC map — needed for both timeline and solve times
  const firstAcMap = new Map<string, number>(); // "userId:problemId" -> timestamp
  const allAcSubs = sqlite
    .prepare<[string], { userId: string; problemId: string; submittedAt: number }>(
      `SELECT s.user_id AS userId, s.problem_id AS problemId, s.submitted_at AS submittedAt
       FROM submissions s
       WHERE s.assignment_id = ? AND s.score = 100
       ORDER BY s.submitted_at ASC`
    )
    .all(assignmentId);

  for (const sub of allAcSubs) {
    const key = `${sub.userId}:${sub.problemId}`;
    if (!firstAcMap.has(key)) {
      firstAcMap.set(key, sub.submittedAt);
    }
  }

  // 3a. Solve timeline: per-problem cumulative AC count over time (only when requested)
  let solveTimelines: ProblemTimeline[] | undefined;
  if (includeTimeline) {
    solveTimelines = problems.map((p) => {
      const firstAcTimes: number[] = [];
      for (const [key, ts] of firstAcMap) {
        if (key.endsWith(`:${p.problemId}`)) {
          firstAcTimes.push(ts);
        }
      }
      firstAcTimes.sort((a, b) => a - b);

      const points: TimelinePoint[] = firstAcTimes.map((ts, idx) => ({
        timestamp: ts * 1000,
        cumulativeSolveCount: idx + 1,
      }));

      return { problemId: p.problemId, title: p.title, points };
    });
  }

  // 4. Student score progression (only when requested)
  let studentProgressions: StudentProgression[] | undefined;
  if (includeTimeline) {
    const submissionRows = sqlite
      .prepare<[string], SubmissionTimeRow>(
        `SELECT s.user_id AS userId, u.name, s.problem_id AS problemId, s.score, s.submitted_at AS submittedAt,
                COALESCE(ap.points, 100) AS points
         FROM submissions s
         INNER JOIN users u ON u.id = s.user_id
         INNER JOIN assignment_problems ap ON ap.assignment_id = s.assignment_id AND ap.problem_id = s.problem_id
         WHERE s.assignment_id = ?
         ORDER BY s.submitted_at ASC`
      )
      .all(assignmentId);

    const userProgressMap = new Map<string, { name: string; bestScores: Map<string, number>; progressionPoints: Array<{ timestamp: number; totalScore: number }> }>();

    for (const sub of submissionRows) {
      if (!userProgressMap.has(sub.userId)) {
        userProgressMap.set(sub.userId, { name: sub.name, bestScores: new Map(), progressionPoints: [] });
      }
      const userData = userProgressMap.get(sub.userId)!;
      const adjustedScore = sub.score != null ? Math.round(Math.min(Math.max(sub.score, 0), 100) / 100 * sub.points * 100) / 100 : 0;
      const currentBest = userData.bestScores.get(sub.problemId) ?? 0;

      if (adjustedScore > currentBest) {
        userData.bestScores.set(sub.problemId, adjustedScore);
        const totalScore = Array.from(userData.bestScores.values()).reduce((s, v) => s + v, 0);
        userData.progressionPoints.push({ timestamp: sub.submittedAt * 1000, totalScore });
      }
    }

    studentProgressions = Array.from(userProgressMap.entries()).map(([userId, data]) => ({
      userId,
      name: data.name,
      points: data.progressionPoints,
    }));
  }

  // 5. Per-problem solve time (median/mean time from contest start to first AC)
  const contestMeta = sqlite
    .prepare<[string], { startsAt: number | null }>(`SELECT starts_at AS startsAt FROM assignments WHERE id = ?`)
    .get(assignmentId);
  const contestStartSec = contestMeta?.startsAt ?? 0;

  const problemSolveTimes: ProblemSolveTime[] = problems.map((p) => {
    const solveTimes: number[] = [];
    for (const [key, ts] of firstAcMap) {
      if (key.endsWith(`:${p.problemId}`)) {
        const minutes = Math.max(0, (ts - contestStartSec) / 60);
        solveTimes.push(minutes);
      }
    }
    solveTimes.sort((a, b) => a - b);

    const solveCount = solveTimes.length;
    const meanMinutes = solveCount > 0 ? Math.round(solveTimes.reduce((s, v) => s + v, 0) / solveCount) : 0;
    const medianMinutes = solveCount > 0
      ? Math.round(solveCount % 2 === 1 ? solveTimes[Math.floor(solveCount / 2)] : (solveTimes[solveCount / 2 - 1] + solveTimes[solveCount / 2]) / 2)
      : 0;

    return { problemId: p.problemId, title: p.title, medianMinutes, meanMinutes, solveCount };
  });

  // 6. Cheat summary
  const cheatRows = sqlite
    .prepare<[string], CheatCountRow>(
      `SELECT ace.user_id AS userId, u.name, u.username, ace.event_type AS eventType, COUNT(*) AS count
       FROM anti_cheat_events ace
       INNER JOIN users u ON u.id = ace.user_id
       WHERE ace.assignment_id = ?
       GROUP BY ace.user_id, ace.event_type
       ORDER BY count DESC`
    )
    .all(assignmentId);

  const byType: Record<string, number> = {};
  const studentEventCounts = new Map<string, { name: string; username: string; count: number }>();
  let totalEvents = 0;

  for (const row of cheatRows) {
    byType[row.eventType] = (byType[row.eventType] ?? 0) + row.count;
    totalEvents += row.count;
    const existing = studentEventCounts.get(row.userId);
    if (existing) {
      existing.count += row.count;
    } else {
      studentEventCounts.set(row.userId, { name: row.name, username: row.username, count: row.count });
    }
  }

  const flaggedStudents = Array.from(studentEventCounts.entries())
    .map(([userId, data]) => ({ userId, name: data.name, username: data.username, eventCount: data.count }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 20);

  const cheatSummary: CheatSummary = { totalEvents, byType, flaggedStudents };

  return {
    scoreDistribution,
    problemSolveRates,
    solveTimelines,
    studentProgressions,
    problemSolveTimes,
    cheatSummary,
  };
}
