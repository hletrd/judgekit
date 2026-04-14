import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { DiscussionThreadList } from "@/components/discussions/discussion-thread-list";
import { DiscussionThreadForm } from "@/components/discussions/discussion-thread-form";
import { listGeneralDiscussionThreads } from "@/lib/discussions/data";

export default async function CommunityPage() {
  const [t, session, threads] = await Promise.all([
    getTranslations("publicShell"),
    auth(),
    listGeneralDiscussionThreads(),
  ]);

  return (
    <div className="space-y-6">
      <DiscussionThreadForm
        scopeType="general"
        titleLabel={t("community.form.titleLabel")}
        contentLabel={t("community.form.contentLabel")}
        submitLabel={t("community.form.submitLabel")}
        successLabel={t("community.form.success")}
        signInLabel={t("community.form.signIn")}
        canPost={Boolean(session?.user)}
        signInHref="/login?callbackUrl=%2Fcommunity"
      />
      <DiscussionThreadList
        title={t("community.liveTitle")}
        description={t("community.liveDescription")}
        emptyLabel={t("community.empty")}
        openLabel={t("community.openThread")}
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
