import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/layout/public-header";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { NO_INDEX_METADATA } from "@/lib/seo";
import { getResolvedSystemSettings } from "@/lib/system-settings";

export const metadata: Metadata = {
  title: "Page not found",
  ...NO_INDEX_METADATA,
};

export default async function NotFoundPage() {
  const [tCommon, tAuth, tShell, tState, session] = await Promise.all([
    getTranslations("common"),
    getTranslations("auth"),
    getTranslations("publicShell"),
    getTranslations("dashboardState"),
    auth(),
  ]);

  const settings = await getResolvedSystemSettings({
    siteTitle: tCommon("appName"),
    siteDescription: tCommon("appDescription"),
  });

  const homeHref = session?.user ? "/dashboard" : "/";
  const homeLabel = session?.user ? tState("backToDashboard") : tCommon("back");

  return (
    <div className="min-h-dvh bg-muted/20">
      <PublicHeader
        siteTitle={settings.siteTitle}
        items={[
          { href: "/practice", label: tShell("nav.practice") },
          { href: "/playground", label: tShell("nav.playground") },
          { href: "/contests", label: tShell("nav.contests") },
          { href: "/community", label: tShell("nav.community") },
        ]}
        actions={[
          { href: "/dashboard", label: tShell("nav.workspace") },
          { href: "/login", label: tAuth("signIn") },
          ...(settings.publicSignupEnabled ? [{ href: "/signup", label: tAuth("signUp") }] : []),
        ]}
        loggedInUser={session?.user ? { name: session.user.name, href: "/dashboard", label: tShell("nav.workspace") } : null}
      />
      <main className="mx-auto flex min-h-[calc(100dvh-64px)] w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl rounded-3xl border bg-background p-8 text-center shadow-sm sm:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">404</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {tState("notFoundTitle")}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {tState("notFoundDescription")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={homeHref}>
              <Button>{homeLabel}</Button>
            </Link>
            <Link href="/practice">
              <Button variant="outline">{tShell("nav.practice")}</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
