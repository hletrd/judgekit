"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DestructiveActionDialog } from "@/components/destructive-action-dialog";

type ProblemDeleteButtonProps = {
  problemId: string;
  problemTitle: string;
  triggerVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
};

type ProblemDeleteResponse = {
  error?: string;
  details?: {
    submissionCount?: number;
    assignmentLinkCount?: number;
  };
};

export function ProblemDeleteButton({
  problemId,
  problemTitle,
  triggerVariant = "destructive",
}: ProblemDeleteButtonProps) {
  const router = useRouter();
  const t = useTranslations("problems");
  const tCommon = useTranslations("common");

  async function handleDelete() {
    try {
      const response = await fetch(`/api/v1/problems/${problemId}`, {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => ({}))) as ProblemDeleteResponse;

      if (!response.ok) {
        if (response.status === 409 && payload.error === "problemDeleteBlocked") {
          toast.error(
            t("deleteBlocked", {
              submissions: payload.details?.submissionCount ?? 0,
              assignments: payload.details?.assignmentLinkCount ?? 0,
            })
          );
          return false;
        }

        toast.error(t(payload.error === "problemDeleteFailed" ? payload.error : "problemDeleteFailed"));
        return false;
      }

      toast.success(t("deleteSuccess"));
      router.push("/dashboard/problems");
      router.refresh();
      return true;
    } catch {
      toast.error(t("problemDeleteFailed"));
      return false;
    }
  }

  return (
    <DestructiveActionDialog
      triggerLabel={t("deleteProblem")}
      title={t("deleteDialogTitle")}
      description={t("deleteDialogDescription", { title: problemTitle })}
      confirmLabel={tCommon("delete")}
      cancelLabel={tCommon("cancel")}
      onConfirmAction={handleDelete}
      triggerVariant={triggerVariant}
      triggerTestId={`problem-delete-${problemId}`}
      confirmTestId={`problem-delete-confirm-${problemId}`}
    />
  );
}
