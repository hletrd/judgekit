import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PublicContestListProps = {
  title: string;
  description: string;
  noContestsLabel: string;
  openContestLabel: string;
  contests: Array<{
    id: string;
    title: string;
    description: string | null;
    groupName: string;
    statusLabel: string;
    problemCountLabel: string;
    publicProblemCountLabel: string;
    modeLabel: string;
    scoringLabel: string;
  }>;
};

export function PublicContestList({
  title,
  description,
  noContestsLabel,
  openContestLabel,
  contests,
}: PublicContestListProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {contests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">{noContestsLabel}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contests.map((contest) => (
            <Card key={contest.id}>
              <CardHeader>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{contest.statusLabel}</Badge>
                  <Badge variant="secondary">{contest.modeLabel}</Badge>
                  <Badge variant="secondary">{contest.scoringLabel}</Badge>
                </div>
                <CardTitle className="line-clamp-2 text-xl">{contest.title}</CardTitle>
                <CardDescription>{contest.groupName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-4 text-sm text-muted-foreground">{contest.description ?? ""}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{contest.problemCountLabel}</span>
                  <span>{contest.publicProblemCountLabel}</span>
                </div>
                <Link
                  href={`/contests/${contest.id}`}
                  className="inline-flex rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {openContestLabel}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
