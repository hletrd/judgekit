import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { MyDiscussionsList } from "@/components/discussions/my-discussions-list";
import { listUserDiscussionThreads } from "@/lib/discussions/data";

export default async function WorkspaceDiscussionsPage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const [t, tCommon, tCommunity, threads] = await Promise.all([
    getTranslations("workspaceShell"),
    getTranslations("common"),
    getTranslations("publicShell"),
    listUserDiscussionThreads(session.user.id),
  ]);

  return (
    <MyDiscussionsList
      title={t("discussions.title")}
      description={t("discussions.description")}
      emptyLabel={t("discussions.empty")}
      openLabel={t("discussions.openThread")}
      items={threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        authorName: thread.author?.name ?? tCommon("unknown"),
        replyCountLabel: tCommunity("community.replyCount", { count: thread.posts.length }),
        authoredBadge: thread.authoredByViewer ? t("discussions.authored") : null,
        participatedBadge: thread.participated ? t("discussions.participated") : null,
      }))}
    />
  );
}
