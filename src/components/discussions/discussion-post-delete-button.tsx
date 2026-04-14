"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

type DiscussionPostDeleteButtonProps = {
  postId: string;
  deleteLabel: string;
  successLabel: string;
};

export function DiscussionPostDeleteButton({ postId, deleteLabel, successLabel }: DiscussionPostDeleteButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleDelete() {
    setIsSubmitting(true);
    try {
      const response = await apiFetch(`/api/v1/community/posts/${postId}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "discussionReplyDeleteFailed");
      }
      toast.success(successLabel);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "discussionReplyDeleteFailed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={() => void handleDelete()} disabled={isSubmitting}>
      {deleteLabel}
    </Button>
  );
}
