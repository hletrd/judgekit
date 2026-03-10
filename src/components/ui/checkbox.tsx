"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  onCheckedChange?: (checked: boolean) => void;
};

export function Checkbox({ className, onCheckedChange, onChange, ...props }: CheckboxProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onCheckedChange?.(e.target.checked);
    onChange?.(e);
  }

  return (
    <input
      type="checkbox"
      className={cn(
        "size-4 rounded border border-input bg-background text-primary shadow-xs focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
      onChange={handleChange}
      {...props}
    />
  );
}
