import { NextRequest } from "next/server";
import { db, execTransaction } from "@/lib/db";
import { problems, tags, problemTags } from "@/lib/db/schema";
import { createApiHandler, isAdmin } from "@/lib/api/handler";
import { forbidden } from "@/lib/api/auth";
import { apiSuccess } from "@/lib/api/responses";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * One-off migration: [Px] → difficulty, delete/tag specific problems, normalize week tags.
 * DELETE this route after running it once.
 */
export const POST = createApiHandler({
  handler: async (_req: NextRequest, { user }) => {
    if (!isAdmin(user.role)) return forbidden();

    execTransaction(() => {
      const log: string[] = [];

      // ── Step 1: Delete specific problems ──
      const titlesToDelete = [
        "[P0] [출력] Hello 출력하기",
        "[P0] [출력] hello informatics 출력하기1",
        "[P0] [입출력] 입력 받은 수 출력하기",
        "[P0] 메이플 월드 NPC에게 말 걸기",
      ];
      for (const title of titlesToDelete) {
        const row = db.select({ id: problems.id }).from(problems).where(eq(problems.title, title)).get();
        if (row) {
          db.delete(problems).where(eq(problems.id, row.id)).run();
          log.push(`Deleted: "${title}"`);
        }
      }

      // ── Step 2: Tag problems before title cleanup ──
      function ensureTag(name: string): string {
        const existing = db.select({ id: tags.id }).from(tags).where(eq(tags.name, name)).get();
        if (existing) return existing.id;
        const id = nanoid();
        db.insert(tags).values({ id, name, createdBy: user.id, createdAt: new Date() }).run();
        return id;
      }

      function addTagToProblems(tagName: string, titles: string[]) {
        const tagId = ensureTag(tagName);
        for (const title of titles) {
          const row = db.select({ id: problems.id }).from(problems).where(eq(problems.title, title)).get();
          if (!row) continue;
          const exists = db
            .select({ id: problemTags.id })
            .from(problemTags)
            .where(sql`${problemTags.problemId} = ${row.id} AND ${problemTags.tagId} = ${tagId}`)
            .get();
          if (!exists) {
            db.insert(problemTags).values({ id: nanoid(), problemId: row.id, tagId }).run();
            log.push(`Tagged "${title}" → ${tagName}`);
          }
        }
      }

      addTagToProblems("Week 1", [
        "[P1] 두 수의 합 구하기",
        "[P1] 두 수의 차 구하기",
        "[P1] 두 수의 곱 구하기",
      ]);

      addTagToProblems("Week 2", [
        "[P3] 배열 뒤집기",
        "[P4] 팩토리얼 계산하기",
        "[P5] 중복 제거하기",
        "[P5] 완전수 찾기",
        "[P5] 정렬하기 (오름차순)",
        "[P4] 이진수 변환하기",
        "[P4] 배열에서 최댓값과 위치",
        "[P4] 소수 판별하기",
        "[P4] 피보나치 수열",
        "[P3] 배열의 합과 평균",
      ]);

      // ── Step 3: Extract [Px] → difficulty and clean titles ──
      const matching = db
        .select({ id: problems.id, title: problems.title })
        .from(problems)
        .where(sql`title LIKE '[P_] %'`)
        .all();

      for (const row of matching) {
        const difficulty = parseFloat(row.title.charAt(2));
        const cleanTitle = row.title.slice(5).trim();
        db.update(problems)
          .set({ difficulty, title: cleanTitle, updatedAt: new Date() })
          .where(eq(problems.id, row.id))
          .run();
        log.push(`[P${difficulty}] → difficulty=${difficulty}, title="${cleanTitle}"`);
      }

      // ── Step 4: Normalize week tag casing → "Week X" ──
      const weekTags = db
        .select({ id: tags.id, name: tags.name })
        .from(tags)
        .where(sql`LOWER(name) GLOB 'week *'`)
        .all();

      for (const tag of weekTags) {
        const normalized = tag.name.replace(/^week\s*/i, (m) => {
          return "Week " ;
        }).replace(/\s+/g, " ").trim();
        if (normalized !== tag.name) {
          // Check if normalized name already exists
          const existing = db.select({ id: tags.id }).from(tags).where(eq(tags.name, normalized)).get();
          if (existing && existing.id !== tag.id) {
            // Merge: move all problem_tags from old tag to existing, then delete old
            db.update(problemTags)
              .set({ tagId: existing.id })
              .where(eq(problemTags.tagId, tag.id))
              .run();
            db.delete(tags).where(eq(tags.id, tag.id)).run();
            log.push(`Merged tag "${tag.name}" → "${normalized}"`);
          } else {
            db.update(tags).set({ name: normalized }).where(eq(tags.id, tag.id)).run();
            log.push(`Renamed tag "${tag.name}" → "${normalized}"`);
          }
        }
      }

      return { operations: log.length, log };
    });

    return apiSuccess(result);
  },
});
