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
  href: string;
  sequenceNumber: number | null;
  title: string;
  difficultyLabel: string | null;
  tags: Array<{ name: string; color: string | null }>;
  solverCount: number;
  submissionCount: number;
  successRate: number | null;
  createdAt: string | null;
};

type PublicProblemListProps = {
  title: string;
  description: string;
  noProblemsLabel: string;
  numberLabel: string;
  problemTitleLabel: string;
  difficultyLabel: string;
  tagLabel: string;
  solverCountLabel: string;
  successRateLabel: string;
  createdAtLabel: string;
  problems: PublicProblemListItem[];
};

export function PublicProblemList({
  title,
  description,
  noProblemsLabel,
  numberLabel,
  problemTitleLabel,
  difficultyLabel,
  tagLabel,
  solverCountLabel,
  successRateLabel,
  createdAtLabel,
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">{numberLabel}</TableHead>
                    <TableHead>{problemTitleLabel}</TableHead>
                    <TableHead className="w-20 text-center">{solverCountLabel}</TableHead>
                    <TableHead className="w-24 text-center">{successRateLabel}</TableHead>
                    <TableHead className="w-28 text-center">{difficultyLabel}</TableHead>
                    <TableHead className="w-36">{tagLabel}</TableHead>
                    <TableHead className="w-24 text-center">{createdAtLabel}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {problems.map((problem, index) => (
                    <TableRow key={problem.id}>
                      <TableCell className="text-center font-mono text-sm text-muted-foreground">
                        {problem.sequenceNumber ?? index + 1}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={problem.href}
                          className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {problem.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {problem.solverCount > 0 ? problem.solverCount : "-"}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {problem.successRate != null ? (
                          <span className={
                            problem.successRate >= 60
                              ? "text-emerald-600"
                              : problem.successRate >= 30
                                ? "text-amber-600"
                                : "text-red-500"
                          }>
                            {problem.successRate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {problem.difficultyLabel ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {problem.tags.map((tag) => (
                            <Badge key={tag.name} variant="secondary" className="text-xs">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {problem.createdAt ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
