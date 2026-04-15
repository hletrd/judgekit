import type { MetadataRoute } from "next";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { assignments, discussionThreads, problems } from "@/lib/db/schema";
import { SUPPORTED_LOCALES } from "@/lib/i18n/constants";
import { buildAbsoluteUrl, buildLocalePath } from "@/lib/seo";

// Prevent static generation — sitemap needs live DB data
export const dynamic = "force-dynamic";

const SITEMAP_BATCH_SIZE = 1000;
const INDEXABLE_TOP_LEVEL_PATHS = [
  { path: "/", changeFrequency: "daily" as const, priority: 1 },
  { path: "/practice", changeFrequency: "daily" as const, priority: 0.9 },
  { path: "/contests", changeFrequency: "daily" as const, priority: 0.8 },
  { path: "/community", changeFrequency: "daily" as const, priority: 0.7 },
  { path: "/playground", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/rankings", changeFrequency: "daily" as const, priority: 0.6 },
] as const;

async function fetchAllInBatches<T>(loader: (offset: number, limit: number) => Promise<T[]>) {
  const rows: T[] = [];

  for (let offset = 0; ; offset += SITEMAP_BATCH_SIZE) {
    const batch = await loader(offset, SITEMAP_BATCH_SIZE);
    rows.push(...batch);

    if (batch.length < SITEMAP_BATCH_SIZE) {
      break;
    }
  }

  return rows;
}

function buildLocalizedSitemapEntries(
  path: string,
  options: Pick<MetadataRoute.Sitemap[number], "changeFrequency" | "priority" | "lastModified">,
) {
  return SUPPORTED_LOCALES.map((locale) => ({
    url: buildAbsoluteUrl(buildLocalePath(path, locale)),
    lastModified: options.lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [publicProblems, publicContests, generalThreads] = await Promise.all([
    fetchAllInBatches((offset, limit) => db.query.problems.findMany({
      where: eq(problems.visibility, "public"),
      columns: { id: true, updatedAt: true },
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
      limit,
      offset,
    })),
    fetchAllInBatches((offset, limit) => db.query.assignments.findMany({
      where: and(eq(assignments.visibility, "public"), ne(assignments.examMode, "none")),
      columns: { id: true, updatedAt: true },
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
      limit,
      offset,
    })),
    fetchAllInBatches((offset, limit) => db.query.discussionThreads.findMany({
      where: eq(discussionThreads.scopeType, "general"),
      columns: { id: true, updatedAt: true },
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
      limit,
      offset,
    })),
  ]);

  return [
    ...INDEXABLE_TOP_LEVEL_PATHS.flatMap((entry) => buildLocalizedSitemapEntries(entry.path, {
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      lastModified: undefined,
    })),
    ...publicProblems.flatMap((problem) => buildLocalizedSitemapEntries(`/practice/problems/${problem.id}`, {
      lastModified: problem.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    })),
    ...publicContests.flatMap((contest) => buildLocalizedSitemapEntries(`/contests/${contest.id}`, {
      lastModified: contest.updatedAt,
      changeFrequency: "daily",
      priority: 0.7,
    })),
    ...generalThreads.flatMap((thread) => buildLocalizedSitemapEntries(`/community/threads/${thread.id}`, {
      lastModified: thread.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    })),
  ];
}
