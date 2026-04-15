import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PublicProblemListItem = {
  id: string;
  sequenceNumber: number | null;
  title: string;
  summary: string;
  authorName: string;
  timeLimitLabel: string;
  difficultyLabel: string | null;
  tags: Array<{ name: string; color: string | null }>;
};

type PublicProblemListProps = {
  title: string;
  description: string;
  noProblemsLabel: string;
  openProblemLabel: string;
  numberLabel: string;
  problemTitleLabel: string;
  authorLabel: string;
  timeLimitLabel: string;
  difficultyLabel: string;
  tagLabel: string;
  problems: PublicProblemListItem[];
};

export function PublicProblemList({
  title,
  description,
  noProblemsLabel,
  openProblemLabel,
  numberLabel,
  problemTitleLabel,
  authorLabel,
  timeLimitLabel,
  difficultyLabel,
  tagLabel,
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{numberLabel}</TableHead>
                  <TableHead className="min-w-[320px]">{problemTitleLabel}</TableHead>
                  <TableHead className="w-40">{authorLabel}</TableHead>
                  <TableHead className="w-40">{timeLimitLabel}</TableHead>
                  <TableHead className="w-40">{difficultyLabel}</TableHead>
                  <TableHead className="min-w-[180px]">{tagLabel}</TableHead>
                  <TableHead className="w-32 text-right">{openProblemLabel}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {problems.map((problem, index) => (
                  <TableRow key={problem.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {problem.sequenceNumber ?? index + 1}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="space-y-2 py-1">
                        <Link
                          href={`/practice/problems/${problem.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {problem.title}
                        </Link>
                        {problem.summary ? (
                          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                            {problem.summary}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{problem.authorName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{problem.timeLimitLabel}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{problem.difficultyLabel ?? "-"}</TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-wrap gap-2">
                        {problem.tags.map((tag) => (
                          <Badge key={tag.name} variant="secondary" className="text-xs">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/practice/problems/${problem.id}`}
                        className="inline-flex rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        {openProblemLabel}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
