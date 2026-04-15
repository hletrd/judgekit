"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MenuIcon } from "lucide-react";
import { buildLocalizedHref } from "@/lib/locale-paths";
import { cn } from "@/lib/utils";

type HeaderItem = {
  href: string;
  label: string;
};

type PublicHeaderProps = {
  siteTitle: string;
  items: HeaderItem[];
  actions: HeaderItem[];
  loggedInUser?: {
    name: string;
    href: string;
    label: string;
  } | null;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicHeader({ siteTitle, items, actions, loggedInUser }: PublicHeaderProps) {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
        <Link href={buildLocalizedHref("/", locale)} className="min-w-0 shrink-0 text-base font-semibold tracking-tight">
          {siteTitle}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden min-w-0 flex-1 items-center gap-1 md:flex">
          {items.map((item) => {
            const active = isActivePath(pathname, item.href);
            const localizedHref = buildLocalizedHref(item.href, locale);
            return (
              <Link
                key={item.href}
                href={localizedHref}
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

        {/* Desktop actions */}
        <div className="ml-auto hidden items-center gap-1 md:flex">
          <ThemeToggle className="hidden sm:inline-flex" />
          <LocaleSwitcher />
          {loggedInUser ? (
            <Link
              href={buildLocalizedHref(loggedInUser.href, locale)}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {loggedInUser.label}
            </Link>
          ) : (
            actions.map((action, index) => (
              <Link
                key={action.href}
                href={buildLocalizedHref(action.href, locale)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  index === actions.length - 1
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {action.label}
              </Link>
            ))
          )}
        </div>

        {/* Mobile: hamburger + theme/locale + actions */}
        <div className="ml-auto flex items-center gap-1 md:hidden">
          <ThemeToggle className="hidden sm:inline-flex" />
          <LocaleSwitcher />
          {loggedInUser ? (
            <Link
              href={buildLocalizedHref(loggedInUser.href, locale)}
              className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {loggedInUser.label}
            </Link>
          ) : (
            actions.map((action, index) => (
              <Link
                key={action.href}
                href={buildLocalizedHref(action.href, locale)}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  index === actions.length - 1
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {action.label}
              </Link>
            ))
          )}
          <Sheet>
            <SheetTrigger
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Menu"
            >
              <MenuIcon className="size-4" />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>{siteTitle}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                {items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const localizedHref = buildLocalizedHref(item.href, locale);
                  return (
                    <Link
                      key={item.href}
                      href={localizedHref}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                        active ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
