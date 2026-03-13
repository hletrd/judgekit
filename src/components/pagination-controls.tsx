"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  currentPage: number;
  hasNextPage: boolean;
  prevHref?: string;
  nextHref?: string;
  rangeText?: string;
}

export function PaginationControls({
  currentPage,
  hasNextPage,
  prevHref,
  nextHref,
  rangeText,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between mt-4">
      {rangeText && (
        <span className="text-sm text-muted-foreground">{rangeText}</span>
      )}
      <div className="flex gap-2 ml-auto">
        {currentPage > 1 && prevHref && (
          <Link
            href={prevHref}
            aria-label="Previous page"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Link>
        )}
        {hasNextPage && nextHref && (
          <Link
            href={nextHref}
            aria-label="Next page"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  );
}
