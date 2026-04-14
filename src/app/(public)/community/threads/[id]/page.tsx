import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { DiscussionThreadView } from "@/components/discussions/discussion-thread-view";
import { DiscussionPostForm } from "@/components/discussions/discussion-post-form";
import { DiscussionThreadModerationControls } from "@/components/discussions/discussion-thread-moderation-controls";
import { DiscussionPostDeleteButton } from "@/components/discussions/discussion-post-delete-button";
import { canReadProblemDiscussion, getDiscussionThreadById } from "@/lib/discussions/data";
import { canModerateDiscussions } from "@/lib/discussions/permissions";

export default async function CommunityThreadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, session, thread] = await Promise.all([
    getTranslations("publicShell"),
    auth(),
    getDiscussionThreadById(id),
  ]);

  if (!thread) {
    notFound();
  }

  if (thread.scopeType === "problem") {
    const canRead = await canReadProblemDiscussion(
      thread.problemId ?? "",
      session?.user ? { userId: session.user.id, role: session.user.role } : null,
    );
    if (!canRead) {
      notFound();
    }
  }

  const callbackPath = `/community/threads/${thread.id}`;
  const canModerate = session?.user ? await canModerateDiscussions(session.user.role) : false;

  return (
    <div className="space-y-6">
      {thread.scopeType === "problem" && thread.problem ? (
        <div className="text-sm text-muted-foreground">
          <Link href={`/practice/problems/${thread.problem.id}`} className="font-medium text-primary hover:underline">
            {thread.problem.title}
          </Link>
        </div>
      ) : null}
      {canModerate ? (
        <DiscussionThreadModerationControls
          threadId={thread.id}
          isLocked={Boolean(thread.lockedAt)}
          isPinned={Boolean(thread.pinnedAt)}
          pinLabel={t("community.moderation.pin")}
          unpinLabel={t("community.moderation.unpin")}
          lockLabel={t("community.moderation.lock")}
          unlockLabel={t("community.moderation.unlock")}
          deleteLabel={t("community.moderation.deleteThread")}
          successLabel={t("community.moderation.success")}
          deleteSuccessLabel={t("community.moderation.deleteSuccess")}
        />
      ) : null}
      <DiscussionThreadView
        title={thread.title}
        content={thread.content}
        authorName={thread.author?.name ?? t("community.unknownAuthor")}
        scopeLabel={thread.scopeType === "general" ? t("community.scopeGeneral") : t("community.scopeProblem")}
        repliesTitle={t("community.repliesTitle")}
        noRepliesLabel={t("community.noReplies")}
        posts={thread.posts.map((post) => ({
          id: post.id,
          content: post.content,
          authorName: post.author?.name ?? t("community.unknownAuthor"),
          actions: canModerate ? (
            <DiscussionPostDeleteButton
              postId={post.id}
              deleteLabel={t("community.moderation.deletePost")}
              successLabel={t("community.moderation.replyDeleteSuccess")}
            />
          ) : undefined,
        }))}
      />
      <DiscussionPostForm
        threadId={thread.id}
        contentLabel={t("community.reply.contentLabel")}
        submitLabel={t("community.reply.submitLabel")}
        successLabel={t("community.reply.success")}
        signInLabel={t("community.reply.signIn")}
        canPost={Boolean(session?.user)}
        signInHref={`/login?callbackUrl=${encodeURIComponent(callbackPath)}`}
      />
    </div>
  );
}
