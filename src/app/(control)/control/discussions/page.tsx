import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DiscussionModerationList } from "@/components/discussions/discussion-moderation-list";
import { listModerationDiscussionThreads, type DiscussionModerationScope, type DiscussionModerationState } from "@/lib/discussions/data";
import { canModerateDiscussions } from "@/lib/discussions/permissions";
import { Badge } from "@/components/ui/badge";

const SCOPE_VALUES: DiscussionModerationScope[] = ["all", "general", "problem"];
const STATE_VALUES: DiscussionModerationState[] = ["all", "open", "locked", "pinned"];

function normalizeScope(value?: string): DiscussionModerationScope {
  return SCOPE_VALUES.includes(value as DiscussionModerationScope) ? (value as DiscussionModerationScope) : "all";
}

function normalizeState(value?: string): DiscussionModerationState {
  return STATE_VALUES.includes(value as DiscussionModerationState) ? (value as DiscussionModerationState) : "all";
}

function buildFilterHref(scope: DiscussionModerationScope, state: DiscussionModerationState) {
  const params = new URLSearchParams();
  if (scope !== "all") params.set("scope", scope);
  if (state !== "all") params.set("state", state);
  const query = params.toString();
  return query ? `/control/discussions?${query}` : "/control/discussions";
}

export default async function ControlDiscussionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ scope?: string; state?: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (!(await canModerateDiscussions(session.user.role))) {
    redirect("/control");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const scope = normalizeScope(resolvedSearchParams?.scope);
  const state = normalizeState(resolvedSearchParams?.state);

  const t = await getTranslations("controlShell");
  const threads = await listModerationDiscussionThreads({ scope, state });

  const scopeLabels: Record<DiscussionModerationScope, string> = {
    all: t("moderation.scope.all"),
    general: t("moderation.scope.general"),
    problem: t("moderation.scope.problem"),
  };
  const stateLabels: Record<DiscussionModerationState, string> = {
    all: t("moderation.state.all"),
    open: t("moderation.state.open"),
    locked: t("moderation.state.locked"),
    pinned: t("moderation.state.pinned"),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SCOPE_VALUES.map((value) => (
          <Link key={`scope-${value}`} href={buildFilterHref(value, state)}>
            <Badge variant={scope === value ? "default" : "outline"}>{scopeLabels[value]}</Badge>
          </Link>
        ))}
        {STATE_VALUES.map((value) => (
          <Link key={`state-${value}`} href={buildFilterHref(scope, value)}>
            <Badge variant={state === value ? "default" : "outline"}>{stateLabels[value]}</Badge>
          </Link>
        ))}
      </div>

      <DiscussionModerationList
        title={t("moderation.title")}
        description={t("moderation.description")}
        emptyLabel={t("moderation.empty")}
        items={threads.map((thread) => ({
          id: thread.id,
          title: thread.title,
          authorName: thread.author?.name ?? t("moderation.unknownAuthor"),
          scopeLabel: thread.scopeType === "general" ? t("moderation.scope.general") : t("moderation.scope.problem"),
          statusLabels: [
            ...(thread.pinnedAt ? [t("moderation.state.pinned")] : []),
            ...(thread.lockedAt ? [t("moderation.state.locked")] : []),
          ],
          metadataLabel:
            thread.scopeType === "problem" && thread.problem
              ? t("moderation.problemMeta", { title: thread.problem.title, replies: thread.posts.length })
              : t("moderation.generalMeta", { replies: thread.posts.length }),
          openHref: `/community/threads/${thread.id}`,
          openLabel: t("moderation.openThread"),
          moderation: {
            isLocked: Boolean(thread.lockedAt),
            isPinned: Boolean(thread.pinnedAt),
            lockLabel: t("community.moderation.lock"),
            unlockLabel: t("community.moderation.unlock"),
            pinLabel: t("community.moderation.pin"),
            unpinLabel: t("community.moderation.unpin"),
            deleteLabel: t("community.moderation.deleteThread"),
            successLabel: t("community.moderation.success"),
            deleteSuccessLabel: t("community.moderation.deleteSuccess"),
          },
        }))}
      />
    </div>
  );
}
