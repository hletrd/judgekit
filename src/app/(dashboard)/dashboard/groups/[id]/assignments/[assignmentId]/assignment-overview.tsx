import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTimeInTimeZone, formatRelativeTimeFromNow } from "@/lib/datetime";

interface AssignmentProblemEntry {
  id: string;
  sortOrder: number | null;
  points: number | null;
  problem: { id: string; title: string } | null;
}

export interface AssignmentOverviewLabels {
  overviewTitle: string;
  problemsTitle: string;
  descriptionFallback: string;
  lateDeadline: string;
  latePenalty: string;
  points: string;
  openProblem: string;
  noProblems: string;
  statusUpcoming: string;
  statusClosed: string;
  statusOpen: string;
  startsAt: string;
  deadline: string;
  back: string;
  groupDetail: string;
  action: string;
  assignments: string;
  problemCount: string;
  titleColumn: string;
  deadlineCountdown: string;
  lateDeadlineCountdown: string;
}

export interface AssignmentOverviewProps {
  assignment: {
    id: string;
    title: string;
    description: string | null;
    startsAt: string | Date | null;
    deadline: string | Date | null;
    lateDeadline: string | Date | null;
    latePenalty: number | null;
    group: { name: string } | null;
  };
  sortedProblems: AssignmentProblemEntry[];
  totalPoints: number;
  isUpcoming: boolean;
  isPast: boolean;
  groupId: string;
  locale: string;
  timeZone: string;
  labels: AssignmentOverviewLabels;
}

export function AssignmentOverview({
  assignment,
  sortedProblems,
  totalPoints,
  isUpcoming,
  isPast,
  groupId,
  locale,
  timeZone,
  labels,
}: AssignmentOverviewProps) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{labels.assignments}</Badge>
            <Badge variant="secondary">{labels.problemCount}</Badge>
          </div>
          <h2 className="text-3xl font-bold">{assignment.title}</h2>
          <p className="text-sm text-muted-foreground">
            {assignment.group?.name ?? labels.groupDetail} · {labels.points}: {totalPoints}
          </p>
        </div>

        <Link href={`/dashboard/groups/${groupId}`}>
          <Button variant="outline">{labels.back}</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{labels.overviewTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {isUpcoming ? (
              <Badge variant="secondary">{labels.statusUpcoming}</Badge>
            ) : isPast ? (
              <Badge variant="outline">{labels.statusClosed}</Badge>
            ) : (
              <Badge className="bg-green-500">{labels.statusOpen}</Badge>
            )}
            <Badge variant="outline">{labels.points}: {totalPoints}</Badge>
          </div>

          <p className="description-copy text-sm text-muted-foreground">
            {assignment.description || labels.descriptionFallback}
          </p>

          <dl className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-sm font-medium">{labels.startsAt}</dt>
              <dd className="text-sm text-muted-foreground">
                {assignment.startsAt
                  ? formatDateTimeInTimeZone(assignment.startsAt, locale, timeZone)
                  : "-"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium">{labels.deadline}</dt>
              <dd className="text-sm text-muted-foreground">
                {assignment.deadline
                  ? formatDateTimeInTimeZone(assignment.deadline, locale, timeZone)
                  : "-"}
              </dd>
              {assignment.deadline && (
                <div className="text-xs text-muted-foreground">
                  {labels.deadlineCountdown}: {formatRelativeTimeFromNow(assignment.deadline, locale)}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium">{labels.lateDeadline}</dt>
              <dd className="text-sm text-muted-foreground">
                {assignment.lateDeadline
                  ? formatDateTimeInTimeZone(assignment.lateDeadline, locale, timeZone)
                  : "-"}
              </dd>
              {assignment.lateDeadline && (
                <div className="text-xs text-muted-foreground">
                  {labels.lateDeadlineCountdown}: {formatRelativeTimeFromNow(assignment.lateDeadline, locale)}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium">{labels.latePenalty}</dt>
              <dd className="text-sm text-muted-foreground">{assignment.latePenalty ?? 0}%</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.problemsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.titleColumn}</TableHead>
                <TableHead>{labels.points}</TableHead>
                <TableHead>{labels.action}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProblems.map((problem) => (
                <TableRow key={problem.id}>
                  <TableCell className="font-medium">{problem.problem?.title ?? "-"}</TableCell>
                  <TableCell>{problem.points ?? 100}</TableCell>
                  <TableCell>
                    {problem.problem ? (
                      <Link href={`/dashboard/problems/${problem.problem.id}?assignmentId=${assignment.id}`}>
                        <Button variant="outline" size="sm">
                          {labels.openProblem}
                        </Button>
                      </Link>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sortedProblems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {labels.noProblems}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
