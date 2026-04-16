"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type WorkspaceNavItem = {
  href: string;
  label: string;
  description?: string;
};

type WorkspaceNavProps = {
  siteTitle: string;
  sectionLabel: string;
  userLabel: string;
  items: WorkspaceNavItem[];
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceNav({ siteTitle, sectionLabel, userLabel, items }: WorkspaceNavProps) {
  const pathname = usePathname();

  return (
    <aside className="border-r bg-muted/30">
      <div className="sticky top-0 flex h-full w-full min-w-56 flex-col p-4 sm:min-w-72">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{sectionLabel}</p>
          <p className="mt-2 text-lg font-semibold tracking-tight">{siteTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{userLabel}</p>
        </div>
        <nav className="space-y-1">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg border px-3 py-3 transition-colors hover:bg-accent hover:text-accent-foreground",
                  active ? "border-primary/30 bg-background shadow-sm" : "border-transparent"
                )}
              >
                <div className="text-sm font-medium">{item.label}</div>
                {item.description ? (
                  <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
