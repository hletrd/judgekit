"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ProblemsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Something went wrong</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          An error occurred while loading this page.
        </p>
      </div>
      <Button type="button" onClick={reset}>
        Try Again
      </Button>
    </div>
  );
}
