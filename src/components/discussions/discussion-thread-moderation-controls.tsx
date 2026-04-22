"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

type DiscussionThreadModerationControlsProps = {
  threadId: string;
  isLocked: boolean;
  isPinned: boolean;
  lockLabel: string;
  unlockLabel: string;
  pinLabel: string;
  unpinLabel: string;
  deleteLabel: string;
  successLabel: string;
  deleteSuccessLabel: string;
  errorLabel: string;
  deleteErrorLabel: string;
};

export function DiscussionThreadModerationControls({
  threadId,
  isLocked,
  isPinned,
  lockLabel,
  unlockLabel,
  pinLabel,
  unpinLabel,
  deleteLabel,
  successLabel,
  deleteSuccessLabel,
  errorLabel,
  deleteErrorLabel,
}: DiscussionThreadModerationControlsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function updateModeration(payload: { locked?: boolean; pinned?: boolean }) {
    setIsSubmitting(true);
    try {
      const response = await apiFetch(`/api/v1/community/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error("Discussion moderation failed:", (errorBody as { error?: string }).error);
        throw new Error(errorLabel);
      }
      toast.success(successLabel);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : errorLabel);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteThread() {
    setIsSubmitting(true);
    try {
      const response = await apiFetch(`/api/v1/community/threads/${threadId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        console.error("Discussion thread deletion failed:", (errorBody as { error?: string }).error);
        throw new Error(deleteErrorLabel);
      }
      toast.success(deleteSuccessLabel);
      router.push("/community");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : deleteErrorLabel);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border bg-muted/30 p-3">
      <Button type="button" variant="outline" size="sm" onClick={() => void updateModeration({ pinned: !isPinned })} disabled={isSubmitting}>
        {isPinned ? unpinLabel : pinLabel}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => void updateModeration({ locked: !isLocked })} disabled={isSubmitting}>
        {isLocked ? unlockLabel : lockLabel}
      </Button>
      <Button type="button" variant="destructive" size="sm" onClick={() => void deleteThread()} disabled={isSubmitting}>
        {deleteLabel}
      </Button>
    </div>
  );
}
