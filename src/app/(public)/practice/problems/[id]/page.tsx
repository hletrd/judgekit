import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { problems } from "@/lib/db/schema";
import { PublicProblemDetail } from "@/app/(public)/_components/public-problem-detail";
import { listProblemDiscussionThreads } from "@/lib/discussions/data";
import { DiscussionThreadForm } from "@/components/discussions/discussion-thread-form";
import { DiscussionThreadList } from "@/components/discussions/discussion-thread-list";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const problem = await db.query.problems.findFirst({
    where: eq(problems.id, id),
    columns: { title: true, description: true, visibility: true },
  });

  if (!problem || problem.visibility !== "public") {
    return { title: "Problem" };
  }

  return {
    title: problem.title,
    description: (problem.description ?? "").slice(0, 160) || undefined,
  };
}

export default async function PublicProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, session] = await Promise.all([
    getTranslations("publicShell"),
    auth(),
  ]);

  const problem = await db.query.problems.findFirst({
    where: eq(problems.id, id),
    with: {
      author: { columns: { name: true } },
      problemTags: {
        with: { tag: { columns: { name: true, color: true } } },
      },
    },
  });

  if (!problem || problem.visibility !== "public") {
    notFound();
  }

  const threads = await listProblemDiscussionThreads(problem.id);
  const callbackPath = `/practice/problems/${problem.id}`;

  return (
    <div className="space-y-6">
      <PublicProblemDetail
        title={problem.title}
        description={problem.description}
        authorLabel={t("practice.authoredBy", { name: problem.author?.name ?? t("practice.unknownAuthor") })}
        tags={problem.problemTags.map((entry) => ({ name: entry.tag.name, color: entry.tag.color }))}
        timeLimitMs={problem.timeLimitMs}
        memoryLimitMb={problem.memoryLimitMb}
        timeLimitLabel={t("practice.timeLimit", { value: problem.timeLimitMs ?? 2000 })}
        memoryLimitLabel={t("practice.memoryLimit", { value: problem.memoryLimitMb ?? 256 })}
        playgroundHref="/playground"
        playgroundLabel={t("practice.tryInPlayground")}
        signInHref={`/login?callbackUrl=${encodeURIComponent(`/dashboard/problems/${problem.id}`)}`}
        signInLabel={t("practice.signInToSubmit")}
      />

      <DiscussionThreadForm
        scopeType="problem"
        problemId={problem.id}
        titleLabel={t("practice.discussion.form.titleLabel")}
        contentLabel={t("practice.discussion.form.contentLabel")}
        submitLabel={t("practice.discussion.form.submitLabel")}
        successLabel={t("practice.discussion.form.success")}
        signInLabel={t("practice.discussion.form.signIn")}
        canPost={Boolean(session?.user)}
        signInHref={`/login?callbackUrl=${encodeURIComponent(callbackPath)}`}
      />

      <DiscussionThreadList
        title={t("practice.discussion.title")}
        description={t("practice.discussion.description")}
        emptyLabel={t("practice.discussion.empty")}
        openLabel={t("practice.discussion.openThread")}
        pinnedLabel={t("community.pinned")}
        lockedLabel={t("community.locked")}
        threads={threads.map((thread) => ({
          id: thread.id,
          title: thread.title,
          content: thread.content,
          authorName: thread.author?.name ?? t("community.unknownAuthor"),
          replyCountLabel: t("community.replyCount", { count: thread.posts.length }),
          locked: Boolean(thread.lockedAt),
          pinned: Boolean(thread.pinnedAt),
          href: `/community/threads/${thread.id}`,
        }))}
      />
    </div>
  );
}
