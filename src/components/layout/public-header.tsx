"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";

type HeaderItem = {
  href: string;
  label: string;
};

type PublicHeaderProps = {
  siteTitle: string;
  items: HeaderItem[];
  actions: HeaderItem[];
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicHeader({ siteTitle, items, actions }: PublicHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="min-w-0 shrink-0 text-base font-semibold tracking-tight">
          {siteTitle}
        </Link>
        <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle className="hidden sm:inline-flex" />
          <LocaleSwitcher />
          {actions.map((action, index) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                index === actions.length - 1
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
