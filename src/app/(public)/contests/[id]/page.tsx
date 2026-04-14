import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PublicContestDetail } from "@/app/(public)/_components/public-contest-detail";
import { getPublicContestById } from "@/lib/assignments/public-contests";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contest = await getPublicContestById(id);
  if (!contest) {
    return { title: "Contest" };
  }

  return {
    title: contest.title,
    description: (contest.description ?? "").slice(0, 160) || undefined,
  };
}

function formatDateLabel(value: Date | null, fallback: string, locale: string) {
  return value ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(value) : fallback;
}

export default async function PublicContestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [t, locale] = await Promise.all([
    getTranslations("publicShell"),
    getLocale(),
  ]);
  const statusLabels = {
    upcoming: t("contests.status.upcoming"),
    open: t("contests.status.open"),
    in_progress: t("contests.status.inProgress"),
    expired: t("contests.status.expired"),
    closed: t("contests.status.closed"),
  } as const;

  const contest = await getPublicContestById(id);
  if (!contest) {
    notFound();
  }

  return (
    <PublicContestDetail
      title={contest.title}
      description={contest.description}
      groupLabel={t("contests.hostedBy", { name: contest.groupName })}
      statusLabel={statusLabels[contest.status]}
      modeLabel={contest.examMode === "scheduled" ? t("contests.modeScheduled") : t("contests.modeWindowed")}
      scoringLabel={contest.scoringModel === "icpc" ? t("contests.scoringModelIcpc") : t("contests.scoringModelIoi")}
      startsAtLabel={t("contests.startsAt", { value: formatDateLabel(contest.startsAt, t("contests.notScheduled"), locale) })}
      deadlineLabel={t("contests.deadline", { value: formatDateLabel(contest.deadline, t("contests.noDeadline"), locale) })}
      problemCountLabel={t("contests.problemCount", { count: contest.problemCount })}
      publicProblemCountLabel={t("contests.publicProblemCount", { count: contest.publicProblemCount })}
      publicProblemsTitle={t("contests.publicProblemsTitle")}
      noPublicProblemsLabel={t("contests.noPublicProblems")}
      publicProblems={contest.publicProblems}
      signInHref={`/login?callbackUrl=${encodeURIComponent(`/dashboard/contests/${contest.id}`)}`}
      signInLabel={t("contests.signInToJoin")}
      workspaceHref="/workspace"
      workspaceLabel={t("contests.openWorkspace")}
    />
  );
}
