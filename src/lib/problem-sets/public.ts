import { and, count, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { problemSetProblems, problemSets, problemTags, problems, submissions, tags } from "@/lib/db/schema";
import { escapePracticeLike, normalizePracticeSearch } from "@/lib/practice/search";

export type PublicProblemSetTag = { name: string; color: string | null };

export type PublicProblemSetListItem = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  creator: { id: string; name: string | null; username: string | null } | null;
  publicProblemCount: number;
  tags: PublicProblemSetTag[];
};

export type PublicProblemSetDetail = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  creator: { id: string; name: string | null; username: string | null } | null;
  problems: Array<{
    id: string;
    title: string;
    difficulty: number | null;
    solvedByViewer: boolean;
  }>;
};

function collectPublicProblemSetTags(
  rows: Array<{
    problems: Array<{
      problem: {
        visibility?: string | null;
        problemTags?: Array<{ tag: { name: string; color: string | null } }>;
      } | null;
    }>;
  }>
): PublicProblemSetTag[] {
  const seen = new Map<string, PublicProblemSetTag>();

  for (const row of rows) {
    for (const item of row.problems) {
      if (item.problem?.visibility !== "public") continue;
      for (const entry of item.problem.problemTags ?? []) {
        if (!seen.has(entry.tag.name)) {
          seen.set(entry.tag.name, {
            name: entry.tag.name,
            color: entry.tag.color,
          });
        }
      }
    }
  }

  return [...seen.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function buildPublicProblemSetSearchFilter(search?: string, tag?: string) {
  const normalizedSearch = normalizePracticeSearch(search);
  const normalizedTag = tag?.trim() ?? "";
  const filters = [eq(problemSets.isPublic, true)];

  if (normalizedSearch) {
    const escapedSearch = `%${escapePracticeLike(normalizedSearch)}%`;
    filters.push(or(
      like(problemSets.name, escapedSearch),
      like(problemSets.description, escapedSearch),
    )!);
  }

  if (normalizedTag) {
    filters.push(sql`exists (
      select 1
      from ${problemSetProblems}
      inner join ${problems} on ${problemSetProblems.problemId} = ${problems.id}
      inner join ${problemTags} on ${problemTags.problemId} = ${problems.id}
      inner join ${tags} on ${problemTags.tagId} = ${tags.id}
      where ${problemSetProblems.problemSetId} = ${problemSets.id}
        and ${problems.visibility} = 'public'
        and ${tags.name} = ${normalizedTag}
    )`);
  }

  return filters.length === 1 ? filters[0] : and(...filters);
}

export async function countPublicProblemSets(search?: string, tag?: string) {
  const [row] = await db
    .select({ total: count() })
    .from(problemSets)
    .where(buildPublicProblemSetSearchFilter(search, tag));

  return Number(row?.total ?? 0);
}

export async function listPublicProblemSets(options: { limit?: number; offset?: number; search?: string; tag?: string } = {}): Promise<PublicProblemSetListItem[]> {
  const rows = await db.query.problemSets.findMany({
    where: buildPublicProblemSetSearchFilter(options.search, options.tag),
    with: {
      problems: {
        with: {
          problem: {
            columns: {
              id: true,
              visibility: true,
            },
            with: {
              problemTags: {
                with: {
                  tag: { columns: { name: true, color: true } },
                },
              },
            },
          },
        },
      },
      creator: {
        columns: { id: true, name: true, username: true },
      },
    },
    orderBy: [desc(problemSets.createdAt)],
    limit: options.limit,
    offset: options.offset,
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    createdAt: row.createdAt,
    creator: row.creator,
    publicProblemCount: row.problems.filter((item) => item.problem?.visibility === "public").length,
    tags: collectPublicProblemSetTags([row]),
  }));
}

export async function listPublicProblemSetTags() {
  const rows = await db.query.problemSets.findMany({
    where: eq(problemSets.isPublic, true),
    with: {
      problems: {
        with: {
          problem: {
            columns: { visibility: true },
            with: {
              problemTags: {
                with: {
                  tag: { columns: { name: true, color: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  return collectPublicProblemSetTags(rows);
}

export async function getPublicProblemSetById(id: string, viewerUserId?: string | null): Promise<PublicProblemSetDetail | null> {
  const row = await db.query.problemSets.findFirst({
    where: and(eq(problemSets.id, id), eq(problemSets.isPublic, true)),
    with: {
      problems: {
        with: {
          problem: {
            columns: {
              id: true,
              title: true,
              visibility: true,
              difficulty: true,
            },
          },
        },
      },
      creator: {
        columns: { id: true, name: true, username: true },
      },
    },
  });

  if (!row) return null;

  const publicProblems = row.problems
    .filter((item) => item.problem?.visibility === "public")
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
    .map((item) => ({
      id: item.problem?.id ?? item.problemId,
      title: item.problem?.title ?? "",
      difficulty: item.problem?.difficulty ?? null,
    }));

  let solvedIds = new Set<string>();
  if (viewerUserId && publicProblems.length > 0) {
    const solvedRows = await db
      .select({ problemId: submissions.problemId })
      .from(submissions)
      .where(
        and(
          eq(submissions.userId, viewerUserId),
          eq(submissions.status, "accepted"),
          inArray(submissions.problemId, publicProblems.map((problem) => problem.id)),
        ),
      );
    solvedIds = new Set(solvedRows.map((row) => row.problemId));
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    createdAt: row.createdAt,
    creator: row.creator,
    problems: publicProblems.map((problem) => ({
      ...problem,
      solvedByViewer: solvedIds.has(problem.id),
    })),
  };
}
