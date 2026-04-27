import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PublicContestList } from "../_components/public-contest-list";
import { getPublicContests } from "@/lib/assignments/public-contests";
import { JsonLd } from "@/components/seo/json-ld";
import { buildAbsoluteUrl, buildLocalePath, buildPublicMetadata } from "@/lib/seo";
import { getResolvedSystemSettings } from "@/lib/system-settings";
import { auth } from "@/lib/auth";
import { resolveCapabilities } from "@/lib/capabilities/cache";
import { Button } from "@/components/ui/button";
import { KeyRound, Plus } from "lucide-react";
import Link from "next/link";

function formatDateLabel(value: Date | null, fallback: string, locale: string) {
  return value
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(value)
    : fallback;
}

export async function generateMetadata(): Promise<Metadata> {
  const [tCommon, tShell, locale] = await Promise.all([
    getTranslations("common"),
    getTranslations("publicShell"),
    getLocale(),
  ]);
  const settings = await getResolvedSystemSettings({
    siteTitle: tCommon("appName"),
    siteDescription: tCommon("appDescription"),
  });

  return buildPublicMetadata({
    title: tShell("contests.catalogTitle"),
    description: tShell("contests.catalogDescription"),
    path: "/contests",
    siteTitle: settings.siteTitle,
    locale,
    keywords: [
      "programming contests",
      "competitive coding events",
      "online programming competitions",
    ],
    section: tShell("nav.contests"),
  });
}

export default async function PublicContestsPage() {
  const [t, tContests, locale, session] = await Promise.all([
    getTranslations("publicShell"),
    getTranslations("contests"),
    getLocale(),
    auth(),
  ]);
  const caps = session?.user ? await resolveCapabilities(session.user.role) : null;
  const canCreateContest = caps?.has("contests.create") ?? false;
  const isAuthenticated = Boolean(session?.user);
  const statusLabels = {
    upcoming: t("contests.status.upcoming"),
    open: t("contests.status.open"),
    in_progress: t("contests.status.inProgress"),
    expired: t("contests.status.expired"),
    closed: t("contests.status.closed"),
  } as const;

  const contests = await getPublicContests();
  const contestsJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("contests.catalogTitle"),
    description: t("contests.catalogDescription"),
    url: buildAbsoluteUrl(buildLocalePath("/contests", locale)),
    inLanguage: locale,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: contests.map((contest, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: buildAbsoluteUrl(buildLocalePath(`/contests/${contest.id}`, locale)),
        name: contest.title,
      })),
    },
  };

  return (
    <>
      <JsonLd data={contestsJsonLd} />
      {(isAuthenticated || canCreateContest) && (
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          {canCreateContest && (
            <Link href={buildLocalePath("/dashboard/contests/create", locale)}>
              <Button>
                <Plus className="mr-1 size-4" />
                {tContests("createContest")}
              </Button>
            </Link>
          )}
          {isAuthenticated && (
            <Link href={buildLocalePath("/contests/join", locale)}>
              <Button variant="outline">
                <KeyRound className="mr-1 size-4" />
                {tContests("joinWithCode")}
              </Button>
            </Link>
          )}
        </div>
      )}
      <PublicContestList
        title={t("contests.catalogTitle")}
        description={t("contests.catalogDescription")}
        noContestsLabel={t("contests.noContests")}
        archiveTitle={t("contests.archiveTitle")}
        locale={locale}
        contests={contests.map((contest) => ({
          id: contest.id,
          href: buildLocalePath(`/contests/${contest.id}`, locale),
          title: contest.title,
          description: contest.description,
          groupName: contest.groupName,
          statusLabel: statusLabels[contest.status],
          statusKey: contest.status,
          problemCountLabel: t("contests.problemCount", { count: contest.problemCount }),
          publicProblemCountLabel: t("contests.publicProblemCount", { count: contest.publicProblemCount }),
          modeLabel: contest.examMode === "scheduled" ? tContests("modeScheduled") : tContests("modeWindowed"),
          modeKey: contest.examMode === "scheduled" ? "scheduled" : "windowed",
          scoringLabel: contest.scoringModel === "icpc" ? tContests("scoringModelIcpc") : tContests("scoringModelIoi"),
          scoringKey: contest.scoringModel === "icpc" ? "icpc" : "ioi",
          archiveGroupLabel: contest.startsAt
            ? String(contest.startsAt.getFullYear())
            : t("contests.archiveUndated"),
          startsAtLabel: t("contests.startsAt", {
            value: formatDateLabel(contest.startsAt, t("contests.notScheduled"), locale),
          }),
          deadlineLabel: t("contests.deadline", {
            value: formatDateLabel(contest.deadline, t("contests.noDeadline"), locale),
          }),
        }))}
      />
    </>
  );
}
