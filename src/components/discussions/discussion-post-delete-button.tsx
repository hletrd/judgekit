"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { DestructiveActionDialog } from "@/components/destructive-action-dialog";

type DiscussionPostDeleteButtonProps = {
  postId: string;
  deleteLabel: string;
  deleteDescription: string;
  successLabel: string;
};

export function DiscussionPostDeleteButton({ postId, deleteLabel, deleteDescription, successLabel }: DiscussionPostDeleteButtonProps) {
  const router = useRouter();
  const tCommon = useTranslations("common");

  const handleDelete = useCallback(async () => {
    try {
      const response = await apiFetch(`/api/v1/community/posts/${postId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error((errorBody as { error?: string }).error || "discussionReplyDeleteFailed");
      }
      toast.success(successLabel);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "discussionReplyDeleteFailed");
      return false;
    }
  }, [postId, successLabel, router]);

  return (
    <DestructiveActionDialog
      triggerLabel={deleteLabel}
      title={deleteLabel}
      description={deleteDescription}
      confirmLabel={tCommon("delete")}
      cancelLabel={tCommon("cancel")}
      onConfirmAction={handleDelete}
      triggerVariant="ghost"
    />
  );
}
