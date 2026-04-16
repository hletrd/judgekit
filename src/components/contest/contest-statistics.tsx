"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type HistogramBucket = {
  label: string;
  count: number;
};

type ProblemSolveRate = {
  problemId: string;
  title: string;
  total: number;
  solvedPercent: number;
  partialPercent: number;
  zeroPercent: number;
};

type ContestStatisticsProps = {
  title: string;
  scoreDistributionTitle: string;
  solveRatesTitle: string;
  noDataLabel: string;
  studentsLabel: string;
  countLabel: string;
  percentageLabel: string;
  solvedLabel: string;
  partialLabel: string;
  zeroLabel: string;
  scoreDistribution: HistogramBucket[];
  problemSolveRates: ProblemSolveRate[];
};

export function ContestStatistics({
  title,
  scoreDistributionTitle,
  solveRatesTitle,
  noDataLabel,
  studentsLabel,
  countLabel,
  percentageLabel,
  solvedLabel,
  partialLabel,
  zeroLabel,
  scoreDistribution,
  problemSolveRates,
}: ContestStatisticsProps) {
  const hasAnyStats = scoreDistribution.length > 0 || problemSolveRates.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasAnyStats ? (
          <p className="text-sm text-muted-foreground">{noDataLabel}</p>
        ) : (
          <>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{scoreDistributionTitle}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {scoreDistribution.map((bucket) => (
                  <div key={bucket.label} className="rounded-lg border p-3">
                    <div className="text-sm font-medium">{bucket.label}</div>
                    <div className="mt-1 text-2xl font-semibold">{bucket.count}</div>
                    <div className="text-xs text-muted-foreground">{studentsLabel}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">{solveRatesTitle}</h3>
              {problemSolveRates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{noDataLabel}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{solveRatesTitle}</TableHead>
                      <TableHead className="text-center">{countLabel}</TableHead>
                      <TableHead className="text-center">{solvedLabel}</TableHead>
                      <TableHead className="text-center">{partialLabel}</TableHead>
                      <TableHead className="text-center">{zeroLabel}</TableHead>
                      <TableHead className="text-center">{percentageLabel}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problemSolveRates.map((problem) => (
                      <TableRow key={problem.problemId}>
                        <TableCell className="font-medium">{problem.title}</TableCell>
                        <TableCell className="text-center">{problem.total}</TableCell>
                        <TableCell className="text-center">{problem.solvedPercent}%</TableCell>
                        <TableCell className="text-center">{problem.partialPercent}%</TableCell>
                        <TableCell className="text-center">{problem.zeroPercent}%</TableCell>
                        <TableCell className="text-center">
                          {solvedLabel}: {problem.solvedPercent}% / {partialLabel}: {problem.partialPercent}% / {zeroLabel}: {problem.zeroPercent}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
