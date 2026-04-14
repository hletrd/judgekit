import { getTranslations } from "next-intl/server";
import { PublicContestList } from "../_components/public-contest-list";
import { getPublicContests } from "@/lib/assignments/public-contests";

export default async function PublicContestsPage() {
  const t = await getTranslations("publicShell");
  const statusLabels = {
    upcoming: t("contests.status.upcoming"),
    open: t("contests.status.open"),
    in_progress: t("contests.status.inProgress"),
    expired: t("contests.status.expired"),
    closed: t("contests.status.closed"),
  } as const;

  const contests = await getPublicContests();

  return (
    <PublicContestList
      title={t("contests.catalogTitle")}
      description={t("contests.catalogDescription")}
      noContestsLabel={t("contests.noContests")}
      openContestLabel={t("contests.openContest")}
      contests={contests.map((contest) => ({
        id: contest.id,
        title: contest.title,
        description: contest.description,
        groupName: contest.groupName,
        statusLabel: statusLabels[contest.status],
        problemCountLabel: t("contests.problemCount", { count: contest.problemCount }),
        publicProblemCountLabel: t("contests.publicProblemCount", { count: contest.publicProblemCount }),
        modeLabel: contest.examMode === "scheduled" ? t("contests.modeScheduled") : t("contests.modeWindowed"),
        scoringLabel: contest.scoringModel === "icpc" ? t("contests.scoringModelIcpc") : t("contests.scoringModelIoi"),
      }))}
    />
  );
}
