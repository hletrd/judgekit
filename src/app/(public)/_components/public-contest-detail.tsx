import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PublicContestDetailProps = {
  title: string;
  description: string | null;
  groupLabel: string;
  statusLabel: string;
  modeLabel: string;
  scoringLabel: string;
  startsAtLabel: string;
  deadlineLabel: string;
  problemCountLabel: string;
  publicProblemCountLabel: string;
  publicProblemsTitle: string;
  noPublicProblemsLabel: string;
  publicProblems: Array<{ id: string; title: string }>;
  signInHref: string;
  signInLabel: string;
  workspaceHref: string;
  workspaceLabel: string;
};

export function PublicContestDetail({
  title,
  description,
  groupLabel,
  statusLabel,
  modeLabel,
  scoringLabel,
  startsAtLabel,
  deadlineLabel,
  problemCountLabel,
  publicProblemCountLabel,
  publicProblemsTitle,
  noPublicProblemsLabel,
  publicProblems,
  signInHref,
  signInLabel,
  workspaceHref,
  workspaceLabel,
}: PublicContestDetailProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{groupLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={workspaceHref}>
              <Button variant="outline">{workspaceLabel}</Button>
            </Link>
            <Link href={signInHref}>
              <Button>{signInLabel}</Button>
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{statusLabel}</Badge>
          <Badge variant="secondary">{modeLabel}</Badge>
          <Badge variant="secondary">{scoringLabel}</Badge>
          <Badge variant="outline">{startsAtLabel}</Badge>
          <Badge variant="outline">{deadlineLabel}</Badge>
          <Badge variant="outline">{problemCountLabel}</Badge>
          <Badge variant="outline">{publicProblemCountLabel}</Badge>
        </div>
        {description ? <p className="text-sm leading-7 text-muted-foreground">{description}</p> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{publicProblemsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {publicProblems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{noPublicProblemsLabel}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {publicProblems.map((problem) => (
                <Link
                  key={problem.id}
                  href={`/practice/problems/${problem.id}`}
                  className="rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {problem.title}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
