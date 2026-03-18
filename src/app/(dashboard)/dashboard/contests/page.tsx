import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assertUserRole } from "@/lib/security/constants";
import { getContestsForUser, getContestStatus } from "@/lib/assignments/contests";
import type { ContestStatus } from "@/lib/assignments/contests";
import { formatDateTimeInTimeZone, formatRelativeTimeFromNow } from "@/lib/datetime";
import { getResolvedSystemTimeZone } from "@/lib/system-settings";
import { Timer, Clock, Users, KeyRound } from "lucide-react";

type FilterValue = "all" | "upcoming" | "active" | "past";

function normalizeFilter(value: string | undefined): FilterValue {
  if (value === "upcoming" || value === "active" || value === "past") return value;
  return "all";
}

function statusMatchesFilter(status: ContestStatus, filter: FilterValue): boolean {
  if (filter === "all") return true;
  if (filter === "upcoming") return status === "upcoming";
  if (filter === "active") return status === "open" || status === "in_progress";
  if (filter === "past") return status === "closed" || status === "expired";
  return true;
}

function getStatusBadgeVariant(status: ContestStatus) {
  switch (status) {
    case "upcoming":
      return "secondary" as const;
    case "open":
      return "success" as const;
    case "in_progress":
      return "default" as const;
    case "expired":
      return "outline" as const;
    case "closed":
      return "outline" as const;
  }
}

function getStatusBorderClass(status: ContestStatus): string {
  switch (status) {
    case "upcoming":
      return "border-l-4 border-l-blue-500";
    case "open":
    case "in_progress":
      return "border-l-4 border-l-green-500";
    case "expired":
    case "closed":
      return "border-l-4 border-l-gray-400";
  }
}

export default async function ContestsPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [resolvedSearchParams, t, locale, timeZone] = await Promise.all([
    searchParams ?? Promise.resolve(undefined),
    getTranslations("contests"),
    getLocale(),
    getResolvedSystemTimeZone(),
  ]);

  const role = assertUserRole(session.user.role as string);
  const contests = getContestsForUser(session.user.id, role);
  const now = new Date();
  const filter = normalizeFilter(resolvedSearchParams?.filter);

  const statusMap = new Map(
    contests.map((c) => [c.id, getContestStatus(c, now)])
  );

  const filteredContests = contests.filter((c) =>
    statusMatchesFilter(statusMap.get(c.id)!, filter)
  );

  const statusLabelMap: Record<ContestStatus, string> = {
    upcoming: t("statusUpcoming"),
    open: t("statusOpen"),
    in_progress: t("statusInProgress"),
    expired: t("statusExpired"),
    closed: t("statusClosed"),
  };

  const filterTabs: { value: FilterValue; label: string }[] = [
    { value: "all", label: t("filterAll") },
    { value: "upcoming", label: t("filterUpcoming") },
    { value: "active", label: t("filterActive") },
    { value: "past", label: t("filterPast") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{t("title")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => (
            <Link key={tab.value} href={`/dashboard/contests${tab.value === "all" ? "" : `?filter=${tab.value}`}`}>
              <Badge
                variant={filter === tab.value ? "default" : "outline"}
                className="cursor-pointer px-3 py-1 text-sm"
              >
                {tab.label}
              </Badge>
            </Link>
          ))}
        </div>
        <Link href="/dashboard/contests/join">
          <Button variant="outline" size="sm" className="gap-1.5">
            <KeyRound className="size-4" />
            {t("joinWithCode")}
          </Button>
        </Link>
      </div>

      {filteredContests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("noContests")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredContests.map((contest) => {
            const status = statusMap.get(contest.id)!;
            return (
              <Card key={contest.id} className={`flex flex-col ${getStatusBorderClass(status)}`}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant={getStatusBadgeVariant(status)}>
                      {statusLabelMap[status]}
                    </Badge>
                    <Badge className={contest.examMode === "scheduled" ? "bg-blue-500 text-white" : "bg-purple-500 text-white"}>
                      {contest.examMode === "scheduled" ? t("modeScheduled") : t("modeWindowed")}
                    </Badge>
                    <Badge className={contest.scoringModel === "ioi" ? "bg-teal-500 text-white" : "bg-orange-500 text-white"}>
                      {contest.scoringModel === "ioi" ? t("scoringModelIoi") : t("scoringModelIcpc")}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight">
                    {contest.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 shrink-0" />
                      <span>{t("group")}: {contest.groupName}</span>
                    </div>
                    {contest.startsAt && (
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 shrink-0" />
                        <span>
                          {status === "upcoming"
                            ? `${t("startsIn")}: ${formatRelativeTimeFromNow(contest.startsAt, locale)}`
                            : formatDateTimeInTimeZone(contest.startsAt, locale, timeZone)}
                        </span>
                      </div>
                    )}
                    {(status === "open" || status === "in_progress") && (contest.deadline ?? contest.personalDeadline) && (
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 shrink-0" />
                        <span>
                          {t("endsIn")}: {formatRelativeTimeFromNow((contest.personalDeadline ?? contest.deadline)!, locale)}
                        </span>
                      </div>
                    )}
                    {contest.examMode === "windowed" && contest.examDurationMinutes && (
                      <div className="flex items-center gap-2">
                        <Timer className="size-4 shrink-0" />
                        <span>{t("duration")}: {contest.examDurationMinutes} min</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {t("problems")}: {contest.problemCount}
                      </Badge>
                    </div>
                  </div>
                  <Link href={`/dashboard/contests/${contest.id}`}>
                    <Button variant="outline" className="w-full">
                      {role === "student" ? t("enterContest") : t("manageContest")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
