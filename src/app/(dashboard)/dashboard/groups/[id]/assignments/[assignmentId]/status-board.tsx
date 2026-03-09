import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type AssignmentStudentStatusRow } from "@/lib/assignments/submissions";
import { formatDateTimeInTimeZone } from "@/lib/datetime";
import { formatSubmissionIdPrefix } from "@/lib/submissions/id";
import { getSubmissionStatusVariant } from "@/lib/submissions/status";
import type { SubmissionStatus } from "@/types";

const STATUS_FILTER_VALUES = [
  "all",
  "not_submitted",
  "pending",
  "queued",
  "judging",
  "accepted",
  "wrong_answer",
  "time_limit",
  "memory_limit",
  "runtime_error",
  "compile_error",
] as const;

type StatusFilterValue = (typeof STATUS_FILTER_VALUES)[number];

interface ProblemHeader {
  problemId: string;
  title: string;
  points: number;
}

export interface StatusBoardLabels {
  boardTitle: string;
  student: string;
  class: string;
  totalScore: string;
  attempts: string;
  status: string;
  lastSubmission: string;
  bestScore: string;
  latestSubmission: string;
  noSubmission: string;
  noFilteredStudents: string;
  notSet: string;
}

export interface StatusBoardProps {
  filteredRows: AssignmentStudentStatusRow[];
  problems: ProblemHeader[];
  totalPoints: number;
  statusLabels: Record<Exclude<StatusFilterValue, "all">, string>;
  locale: string;
  timeZone: string;
  labels: StatusBoardLabels;
}

function formatBoardScore(score: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(score);
}

function getRowStatusFilterValue(row: AssignmentStudentStatusRow): Exclude<StatusFilterValue, "all"> {
  return row.latestStatus ?? "not_submitted";
}

export function StatusBoard({
  filteredRows,
  problems,
  totalPoints,
  statusLabels,
  locale,
  timeZone,
  labels,
}: StatusBoardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.boardTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table data-testid="assignment-status-table">
          <TableHeader>
            <TableRow>
              <TableHead>{labels.student}</TableHead>
              <TableHead>{labels.class}</TableHead>
              <TableHead>{labels.totalScore}</TableHead>
              <TableHead>{labels.attempts}</TableHead>
              <TableHead>{labels.status}</TableHead>
              <TableHead>{labels.lastSubmission}</TableHead>
              {problems.map((problem) => (
                <TableHead key={problem.problemId}>
                  <div className="space-y-1">
                    <div>{problem.title}</div>
                    <div className="text-xs text-muted-foreground">{problem.points} pt</div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.map((row) => {
              const rowStatus = getRowStatusFilterValue(row);

              return (
                <TableRow key={row.userId}>
                  <TableCell className="align-top whitespace-normal">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">@{row.username}</div>
                  </TableCell>
                  <TableCell className="align-top">{row.className ?? labels.notSet}</TableCell>
                  <TableCell
                    className="align-top"
                    data-testid={`assignment-total-score-${row.userId}`}
                  >
                    {formatBoardScore(row.bestTotalScore, locale)}/{formatBoardScore(totalPoints, locale)}
                  </TableCell>
                  <TableCell
                    className="align-top"
                    data-testid={`assignment-attempt-count-${row.userId}`}
                  >
                    {row.attemptCount}
                  </TableCell>
                  <TableCell
                    className="align-top"
                    data-testid={`assignment-row-status-${row.userId}`}
                  >
                    <Badge
                      variant={
                        row.latestStatus ? getSubmissionStatusVariant(row.latestStatus) : "outline"
                      }
                    >
                      {statusLabels[rowStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    {row.latestSubmissionId ? (
                      <div className="space-y-1">
                        <div>
                          <Link
                            href={`/dashboard/submissions/${row.latestSubmissionId}`}
                            className="text-primary hover:underline"
                          >
                            {formatSubmissionIdPrefix(row.latestSubmissionId)}
                          </Link>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.latestSubmittedAt
                            ? formatDateTimeInTimeZone(row.latestSubmittedAt, locale, timeZone)
                            : "-"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{labels.noSubmission}</span>
                    )}
                  </TableCell>
                  {row.problems.map((problem) => (
                    <TableCell
                      key={problem.problemId}
                      className="align-top whitespace-normal"
                      data-testid={`assignment-problem-score-${row.userId}-${problem.problemId}`}
                    >
                      <div className="space-y-1">
                        <div>
                          {labels.bestScore}: {formatBoardScore(problem.bestScore ?? 0, locale)}/
                          {formatBoardScore(problem.points, locale)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {labels.attempts}: {problem.attemptCount}
                        </div>
                        {problem.latestSubmissionId ? (
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge
                              variant={
                                problem.latestStatus
                                  ? getSubmissionStatusVariant(problem.latestStatus)
                                  : "outline"
                              }
                            >
                              {problem.latestStatus
                                ? statusLabels[problem.latestStatus as SubmissionStatus]
                                : statusLabels.not_submitted}
                            </Badge>
                            <Link
                              href={`/dashboard/submissions/${problem.latestSubmissionId}`}
                              className="text-primary hover:underline"
                            >
                              {formatSubmissionIdPrefix(problem.latestSubmissionId)}
                            </Link>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            {labels.latestSubmission}: {labels.noSubmission}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {filteredRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6 + problems.length}
                  className="text-center text-muted-foreground"
                >
                  {labels.noFilteredStudents}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
