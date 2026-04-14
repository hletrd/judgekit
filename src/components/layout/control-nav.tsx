"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type ControlNavItem = {
  href: string;
  label: string;
  description?: string;
};

type ControlNavProps = {
  siteTitle: string;
  sectionLabel: string;
  userLabel: string;
  items: ControlNavItem[];
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ControlNav({ siteTitle, sectionLabel, userLabel, items }: ControlNavProps) {
  const pathname = usePathname();

  return (
    <aside className="border-r bg-slate-950 text-slate-100">
      <div className="sticky top-0 flex h-full w-full min-w-72 flex-col p-4">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{sectionLabel}</p>
          <p className="mt-2 text-lg font-semibold tracking-tight">{siteTitle}</p>
          <p className="mt-1 text-sm text-slate-400">{userLabel}</p>
        </div>
        <nav className="space-y-1">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-3 transition-colors hover:bg-slate-900",
                  active ? "bg-slate-900 ring-1 ring-slate-800" : ""
                )}
              >
                <div className="text-sm font-medium text-slate-50">{item.label}</div>
                {item.description ? (
                  <div className="mt-1 text-xs text-slate-400">{item.description}</div>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
