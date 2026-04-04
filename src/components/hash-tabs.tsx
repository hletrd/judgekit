"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";

interface HashTabsProps extends React.ComponentProps<typeof Tabs> {
  defaultValue: string;
}

export function HashTabs({ defaultValue, children, ...props }: HashTabsProps) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return defaultValue;
    return window.location.hash.slice(1) || defaultValue;
  });

  const handleChange = (newValue: string | number | null) => {
    const v = String(newValue ?? defaultValue);
    setValue(v);
    window.history.replaceState(null, "", `#${v}`);
  };

  return (
    <Tabs value={value} onValueChange={handleChange} {...props}>
      {children}
    </Tabs>
  );
}
