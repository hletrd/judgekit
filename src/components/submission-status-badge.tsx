import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getSubmissionStatusVariant,
  isActiveSubmissionStatus,
} from "@/lib/submissions/status";

type SubmissionStatusBadgeProps = {
  status: string | null | undefined;
  label: string;
  className?: string;
  showLivePulse?: boolean;
  variant?: "default" | "secondary" | "destructive" | "outline";
};

function SubmissionStatusIcon({ status }: { status: string | null | undefined }) {
  if (status === "accepted") {
    return <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" />;
  }

  if (isActiveSubmissionStatus(status)) {
    return <Clock3 aria-hidden="true" className="size-3.5 shrink-0" />;
  }

  return <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />;
}

export function SubmissionStatusBadge({
  status,
  label,
  className,
  showLivePulse = false,
  variant,
}: SubmissionStatusBadgeProps) {
  return (
    <Badge
      variant={variant ?? getSubmissionStatusVariant(status)}
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      <SubmissionStatusIcon status={status} />
      {showLivePulse && isActiveSubmissionStatus(status) && (
        <span aria-hidden="true" className="inline-flex size-2 rounded-full bg-current animate-pulse" />
      )}
      <span>{label}</span>
    </Badge>
  );
}
