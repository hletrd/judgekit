import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProblemDescription } from "@/components/problem-description";

type PublicProblemDetailProps = {
  title: string;
  description: string | null;
  authorLabel: string;
  tags: Array<{ name: string; color: string | null }>;
  timeLimitMs: number | null;
  memoryLimitMb: number | null;
  timeLimitLabel: string;
  memoryLimitLabel: string;
  playgroundHref: string;
  playgroundLabel: string;
  signInHref: string;
  signInLabel: string;
};

export function PublicProblemDetail({
  title,
  description,
  authorLabel,
  tags,
  timeLimitMs,
  memoryLimitMb,
  timeLimitLabel,
  memoryLimitLabel,
  playgroundHref,
  playgroundLabel,
  signInHref,
  signInLabel,
}: PublicProblemDetailProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{authorLabel}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={playgroundHref}>
              <Button variant="outline">{playgroundLabel}</Button>
            </Link>
            <Link href={signInHref}>
              <Button>{signInLabel}</Button>
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{timeLimitLabel}</Badge>
          <Badge variant="outline">{memoryLimitLabel}</Badge>
          {tags.map((tag) => (
            <Badge key={tag.name} variant="secondary">{tag.name}</Badge>
          ))}
        </div>
      </div>
      <ProblemDescription description={description ?? ""} />
      <div className="rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        {timeLimitMs != null ? `${timeLimitMs}ms` : "-"} · {memoryLimitMb != null ? `${memoryLimitMb}MB` : "-"}
      </div>
    </div>
  );
}
