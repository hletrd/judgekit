import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PublicProblemListItem = {
  id: string;
  title: string;
  summary: string;
  authorName: string;
  tags: Array<{ name: string; color: string | null }>;
};

type PublicProblemListProps = {
  title: string;
  description: string;
  noProblemsLabel: string;
  openProblemLabel: string;
  problems: PublicProblemListItem[];
};

export function PublicProblemList({
  title,
  description,
  noProblemsLabel,
  openProblemLabel,
  problems,
}: PublicProblemListProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>

      {problems.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">{noProblemsLabel}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {problems.map((problem) => (
            <Card key={problem.id} className="h-full">
              <CardHeader>
                <CardTitle className="line-clamp-2 text-xl">{problem.title}</CardTitle>
                <CardDescription>{problem.authorName}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-4 text-sm text-muted-foreground">{problem.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {problem.tags.map((tag) => (
                    <Badge key={tag.name} variant="secondary" className="text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                <Link
                  href={`/practice/problems/${problem.id}`}
                  className="inline-flex rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {openProblemLabel}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
