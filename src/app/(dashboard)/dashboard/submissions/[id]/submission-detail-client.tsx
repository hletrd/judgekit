"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CodeViewer } from "@/components/code/code-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SubmissionStatusBadge } from "@/components/submission-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api/client";
import { formatDateTimeInTimeZone } from "@/lib/datetime";
import { ACTIVE_SUBMISSION_STATUSES } from "@/lib/submissions/status";

type SubmissionResultView = {
  id: string;
  status: string;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  testCase: {
    sortOrder: number | null;
  } | null;
};

type SubmissionDetailView = {
  id: string;
  assignmentId: string | null;
  language: string;
  status: string;
  sourceCode: string;
  compileOutput: string | null;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  score: number | null;
  submittedAt: number | null;
  user: {
    name: string | null;
  } | null;
  problem: {
    id: string;
    title: string;
  } | null;
  results: SubmissionResultView[];
};

type CommentView = {
  id: string;
  content: string;
  createdAt: string | number | null;
  author: {
    name: string | null;
    role: string;
  } | null;
};

type SubmissionDetailClientProps = {
  showDetailedResults: boolean;
  initialSubmission: SubmissionDetailView;
  headingLabel: string;
  backHref: string;
  backLabel: string;
  statusLabels: Record<string, string>;
  submittedLabel: string;
  scoreLabel: string;
  timeLabel: string;
  memoryLabel: string;
  userLabel: string;
  sourceCodeLabel: string;
  compileOutputLabel: string;
  testCaseResultsLabel: string;
  testCaseResultsDescription: string;
  noResultsLabel: string;
  liveUpdatesLabel: string;
  liveUpdatesDelayedLabel: string;
  locale: string;
  timeZone: string;
  timeValueLabel: string;
  memoryValueLabel: string;
  tableProblemLabel: string;
  tableLanguageLabel: string;
  testCaseTableLabels: {
    testCase: string;
    status: string;
    time: string;
    memory: string;
  };
  detailedResultsHiddenLabel: string;
  userRole: string;
  commentsLabels: {
    title: string;
    placeholder: string;
    submit: string;
    noComments: string;
    by: string;
  };
  roleLabels: Record<string, string>;
};

function normalizeSubmission(data: Record<string, unknown>): SubmissionDetailView {
  const results = Array.isArray(data.results)
    ? data.results.map((result) => {
        const record = result as Record<string, unknown>;
        const testCase = record.testCase as Record<string, unknown> | null;

        return {
          id: String(record.id),
          status: String(record.status),
          executionTimeMs:
            typeof record.executionTimeMs === "number" ? record.executionTimeMs : null,
          memoryUsedKb: typeof record.memoryUsedKb === "number" ? record.memoryUsedKb : null,
          testCase: testCase
            ? {
                sortOrder:
                  typeof testCase.sortOrder === "number" ? testCase.sortOrder : null,
              }
            : null,
        };
      })
    : [];

  const user = data.user as Record<string, unknown> | null;
  const problem = data.problem as Record<string, unknown> | null;
  const submittedAtValue = data.submittedAt;
  const submittedAt =
    typeof submittedAtValue === "number"
      ? submittedAtValue
      : typeof submittedAtValue === "string"
        ? Date.parse(submittedAtValue)
        : null;

  return {
    id: String(data.id),
    assignmentId: typeof data.assignmentId === "string" ? data.assignmentId : null,
    language: String(data.language),
    status: String(data.status),
    sourceCode: String(data.sourceCode),
    compileOutput: typeof data.compileOutput === "string" ? data.compileOutput : null,
    executionTimeMs: typeof data.executionTimeMs === "number" ? data.executionTimeMs : null,
    memoryUsedKb: typeof data.memoryUsedKb === "number" ? data.memoryUsedKb : null,
    score: typeof data.score === "number" ? data.score : null,
    submittedAt,
    user: user
      ? {
          name: typeof user.name === "string" ? user.name : null,
        }
      : null,
    problem:
      problem && typeof problem.id === "string" && typeof problem.title === "string"
        ? {
            id: problem.id,
            title: problem.title,
          }
        : null,
    results,
  };
}

function formatRelativeTime(timestamp: string | number | null): string {
  if (timestamp == null) return "";
  const ms = typeof timestamp === "string" ? Date.parse(timestamp) : timestamp;
  if (Number.isNaN(ms)) return "";
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "<1m";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function SubmissionDetailClient(props: SubmissionDetailClientProps) {
  const [submission, setSubmission] = useState(props.initialSubmission);
  const [pollingError, setPollingError] = useState(false);
  const [comments, setComments] = useState<CommentView[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const canComment = props.userRole === "instructor" || props.userRole === "admin" || props.userRole === "super_admin";
  const isLive = ACTIVE_SUBMISSION_STATUSES.has(submission.status);
  const problemHref =
    submission.problem === null
      ? null
      : submission.assignmentId
        ? `/dashboard/problems/${submission.problem.id}?assignmentId=${submission.assignmentId}`
        : `/dashboard/problems/${submission.problem.id}`;
  const sortedResults = useMemo(
    () =>
      [...submission.results].sort(
        (left, right) => (left.testCase?.sortOrder ?? 0) - (right.testCase?.sortOrder ?? 0)
      ),
    [submission.results]
  );

  useEffect(() => {
    if (!isLive) {
      setPollingError(false);
      return undefined;
    }

    let isCancelled = false;
    let timeoutId: number | null = null;
    let delayMs = 3000;

    function clearScheduledRefresh() {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    function scheduleRefresh() {
      clearScheduledRefresh();

      if (isCancelled || document.visibilityState === "hidden") {
        return;
      }

      timeoutId = window.setTimeout(() => {
        void refreshSubmission();
      }, delayMs);
    }

    async function refreshSubmission() {
      if (document.visibilityState === "hidden") {
        clearScheduledRefresh();
        return;
      }

      try {
        const response = await apiFetch(`/api/v1/submissions/${submission.id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("submissionRefreshFailed");
        }

        const payload = (await response.json()) as { data?: Record<string, unknown> };

        if (!payload.data) {
          throw new Error("submissionPayloadMissing");
        }

        if (isCancelled) {
          return;
        }

        const nextSubmission = normalizeSubmission(payload.data);
        setSubmission(nextSubmission);
        setPollingError(false);
        delayMs = 3000;

        if (ACTIVE_SUBMISSION_STATUSES.has(nextSubmission.status)) {
          scheduleRefresh();
        }
      } catch {
        if (isCancelled) {
          return;
        }

        setPollingError(true);
        delayMs = Math.min(delayMs * 2, 30000);
        scheduleRefresh();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        clearScheduledRefresh();
        return;
      }

      if (!isCancelled) {
        void refreshSubmission();
      }
    }

    void refreshSubmission();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isCancelled = true;
      clearScheduledRefresh();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLive, submission.id]);

  const fetchComments = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/v1/submissions/${submission.id}/comments`);
      if (response.ok) {
        const payload = (await response.json()) as { data?: CommentView[] };
        if (payload.data) {
          setComments(payload.data);
        }
      }
    } catch {
      // silently ignore comment fetch errors
    }
  }, [submission.id]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  async function handleCommentSubmit() {
    if (!commentContent.trim() || commentSubmitting) return;

    setCommentSubmitting(true);
    try {
      const response = await apiFetch(`/api/v1/submissions/${submission.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentContent.trim() }),
      });

      if (response.ok) {
        setCommentContent("");
        void fetchComments();
      }
    } catch {
      // silently ignore comment submit errors
    } finally {
      setCommentSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-3">
          <div>
            <Link href={props.backHref} className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />
              {props.backLabel}
            </Link>
            <h2 className="mb-2 text-2xl font-bold">{props.headingLabel}</h2>
            <div className="flex flex-wrap gap-2" role="status" aria-live="polite">
              <Badge variant="outline">
                {props.userLabel}: {submission.user?.name ?? "-"}
              </Badge>
              {problemHref ? (
                <Link href={problemHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md">
                  <Badge variant="outline" className="cursor-pointer transition-opacity hover:opacity-80">
                    {props.tableProblemLabel}: {submission.problem?.title ?? "-"}
                  </Badge>
                </Link>
              ) : (
                <Badge variant="outline">
                  {props.tableProblemLabel}: {submission.problem?.title ?? "-"}
                </Badge>
              )}
              <Badge variant="outline">
                {props.tableLanguageLabel}: {submission.language}
              </Badge>
              <SubmissionStatusBadge
                label={props.statusLabels[submission.status] ?? submission.status}
                showLivePulse
                status={submission.status}
              />
            </div>
          </div>

          {isLive && (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{props.liveUpdatesLabel}</p>
              {pollingError && (
                <p aria-live="polite" className="text-amber-600 dark:text-amber-400">
                  {props.liveUpdatesDelayedLabel}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="text-right text-sm text-muted-foreground">
          <p>
            {props.submittedLabel}: {submission.submittedAt ? formatDateTimeInTimeZone(submission.submittedAt, props.locale, props.timeZone) : "-"}
          </p>
          <p>
            {props.scoreLabel}: {submission.score !== null ? submission.score : "-"}
          </p>
          <p>
            {props.timeLabel}: {submission.executionTimeMs !== null ? props.timeValueLabel.replace("{value}", String(submission.executionTimeMs)) : "-"}
          </p>
          <p>
            {props.memoryLabel}: {submission.memoryUsedKb !== null ? props.memoryValueLabel.replace("{value}", String(submission.memoryUsedKb)) : "-"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{props.sourceCodeLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeViewer
            ariaLabel={props.sourceCodeLabel}
            language={submission.language}
            minHeight={260}
            value={submission.sourceCode}
          />
        </CardContent>
      </Card>

      {props.showDetailedResults ? (
        <>
          {submission.compileOutput && (
            <Card>
              <CardHeader>
                <CardTitle>{props.compileOutputLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <CodeViewer
                  ariaLabel={props.compileOutputLabel}
                  language="plaintext"
                  minHeight={140}
                  tone="danger"
                  value={submission.compileOutput}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{props.testCaseResultsLabel}</CardTitle>
              <CardDescription>{props.testCaseResultsDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{props.testCaseTableLabels.testCase}</TableHead>
                    <TableHead>{props.testCaseTableLabels.status}</TableHead>
                    <TableHead>{props.testCaseTableLabels.time}</TableHead>
                    <TableHead>{props.testCaseTableLabels.memory}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedResults.map((result, index) => (
                    <TableRow key={result.id}>
                      <TableCell>#{index + 1}</TableCell>
                      <TableCell>
                        <SubmissionStatusBadge
                          label={props.statusLabels[result.status] ?? result.status}
                          status={result.status}
                        />
                      </TableCell>
                      <TableCell>{result.executionTimeMs !== null ? result.executionTimeMs : "-"}</TableCell>
                      <TableCell>{result.memoryUsedKb !== null ? result.memoryUsedKb : "-"}</TableCell>
                    </TableRow>
                  ))}

                  {sortedResults.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        {props.noResultsLabel}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground">{props.detailedResultsHiddenLabel}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{props.commentsLabels.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground">{props.commentsLabels.noComments}</p>
          )}

          {comments.map((comment) => (
            <div key={comment.id} className="rounded-md border p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">
                  {props.commentsLabels.by.replace("{author}", comment.author?.name ?? "-")}
                </span>
                {comment.author?.role && (
                  <Badge variant="secondary" className="text-xs">
                    {props.roleLabels[comment.author.role] ?? comment.author.role}
                  </Badge>
                )}
                <span className="text-muted-foreground text-xs">
                  {formatRelativeTime(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))}

          {canComment && (
            <div className="space-y-2 pt-2">
              <Textarea
                placeholder={props.commentsLabels.placeholder}
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                maxLength={2000}
                rows={3}
              />
              <Button
                onClick={() => void handleCommentSubmit()}
                disabled={commentSubmitting || !commentContent.trim()}
                size="sm"
              >
                {props.commentsLabels.submit}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
