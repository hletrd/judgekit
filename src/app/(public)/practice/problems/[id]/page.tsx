import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { problems } from "@/lib/db/schema";
import { PublicProblemDetail } from "@/app/(public)/_components/public-problem-detail";
import { JsonLd } from "@/components/seo/json-ld";
import { listProblemDiscussionThreads } from "@/lib/discussions/data";
import { DiscussionThreadForm } from "@/components/discussions/discussion-thread-form";
import { DiscussionThreadList } from "@/components/discussions/discussion-thread-list";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildAbsoluteUrl, buildLocalePath, buildPublicMetadata, NO_INDEX_METADATA, summarizeTextForMetadata } from "@/lib/seo";
import { getResolvedSystemSettings } from "@/lib/system-settings";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const [problem, t, locale] = await Promise.all([
    db.query.problems.findFirst({
      where: eq(problems.id, id),
      columns: { title: true, description: true, visibility: true, sequenceNumber: true, difficulty: true },
    }),
    getTranslations("common"),
    getLocale(),
  ]);

  if (!problem || problem.visibility !== "public") {
    return {
      title: "Problem",
      ...NO_INDEX_METADATA,
    };
  }

  const settings = await getResolvedSystemSettings({
    siteTitle: t("appName"),
    siteDescription: t("appDescription"),
  });

  return buildPublicMetadata({
    title: problem.title,
    description: summarizeTextForMetadata(problem.description),
    path: `/practice/problems/${id}`,
    siteTitle: settings.siteTitle,
    locale,
    keywords: [
      "programming problem",
      "algorithm challenge",
    ],
    section: locale === "ko" ? "문제" : "Problem",
    socialBadge: problem.sequenceNumber != null ? `#${problem.sequenceNumber}` : undefined,
    socialMeta: problem.difficulty != null
      ? `${locale === "ko" ? "난이도" : "Difficulty"} ${problem.difficulty.toFixed(2)}`
      : undefined,
    type: "article",
  });
}

export default async function PublicProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, tCommon, tProblems, session, locale] = await Promise.all([
    getTranslations("publicShell"),
    getTranslations("common"),
    getTranslations("problems"),
    auth(),
    getLocale(),
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
  const problemJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: problem.title,
    description: summarizeTextForMetadata(problem.description),
    url: buildAbsoluteUrl(buildLocalePath(`/practice/problems/${problem.id}`, locale)),
    inLanguage: locale,
    author: problem.author?.name
      ? {
          "@type": "Person",
          name: problem.author.name,
        }
      : undefined,
    keywords: problem.problemTags.map((entry) => entry.tag.name).join(", "),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: tCommon("appName"),
        item: buildAbsoluteUrl(buildLocalePath("/", locale)),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t("nav.practice"),
        item: buildAbsoluteUrl(buildLocalePath("/practice", locale)),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: problem.title,
        item: buildAbsoluteUrl(buildLocalePath(`/practice/problems/${problem.id}`, locale)),
      },
    ],
  };
  const problemPageHref = buildLocalePath(`/practice/problems/${problem.id}`, locale);
  const contestlessPlaygroundHref = buildLocalePath("/playground", locale);
  const signInHref = buildLocalePath(
    `/login?callbackUrl=${encodeURIComponent(buildLocalePath(`/dashboard/problems/${problem.id}`, locale))}`,
    locale,
  );

  return (
    <>
      <JsonLd data={[problemJsonLd, breadcrumbJsonLd]} />
      <div className="space-y-6">
        <Tabs defaultValue="problem">
          <TabsList>
            <TabsTrigger value="problem">{t("practice.problemTab")}</TabsTrigger>
            <TabsTrigger value="discussion">{t("practice.discussion.title")}</TabsTrigger>
          </TabsList>
          <TabsContent value="problem" className="mt-4">
            <PublicProblemDetail
              backHref={buildLocalePath("/practice", locale)}
              backLabel={tCommon("back")}
              title={problem.title}
              description={problem.description}
              authorLabel={tProblems("badges.author", { name: problem.author?.name ?? t("practice.unknownAuthor") })}
              tags={problem.problemTags.map((entry) => ({ name: entry.tag.name, color: entry.tag.color }))}
              timeLimitLabel={tProblems("badges.timeLimit", { value: problem.timeLimitMs ?? 2000 })}
              memoryLimitLabel={tProblems("badges.memoryLimit", { value: problem.memoryLimitMb ?? 256 })}
              difficultyLabel={
                problem.difficulty != null
                  ? tProblems("badges.difficulty", { value: problem.difficulty.toFixed(2).replace(/\.?0+$/, "") })
                  : null
              }
              playgroundHref={contestlessPlaygroundHref}
              playgroundLabel={t("practice.tryInPlayground")}
              signInHref={signInHref}
              signInLabel={t("practice.signInToSubmit")}
            />
          </TabsContent>
          <TabsContent value="discussion" className="mt-4 space-y-6">
            <DiscussionThreadForm
              scopeType="problem"
              problemId={problem.id}
              titleLabel={t("practice.discussion.form.titleLabel")}
              contentLabel={t("practice.discussion.form.contentLabel")}
              submitLabel={t("practice.discussion.form.submitLabel")}
              successLabel={t("practice.discussion.form.success")}
              signInLabel={t("practice.discussion.form.signIn")}
              canPost={Boolean(session?.user)}
              signInHref={buildLocalePath(`/login?callbackUrl=${encodeURIComponent(problemPageHref)}`, locale)}
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
                href: buildLocalePath(`/community/threads/${thread.id}`, locale),
              }))}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
