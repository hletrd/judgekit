import { getTranslations } from "next-intl/server";
import { PublicHeader } from "@/components/layout/public-header";
import { getResolvedSystemSettings } from "@/lib/system-settings";
import { PublicHomePage } from "@/app/(public)/_components/public-home-page";

export default async function HomePage() {
  const [tCommon, tAuth, tShell] = await Promise.all([
    getTranslations("common"),
    getTranslations("auth"),
    getTranslations("publicShell"),
  ]);
  const settings = await getResolvedSystemSettings({
    siteTitle: tCommon("appName"),
    siteDescription: tCommon("appDescription"),
  });

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
          { href: "/workspace", label: tShell("nav.workspace") },
          { href: "/login", label: tAuth("signIn") },
        ]}
      />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <PublicHomePage
          eyebrow={tShell("home.eyebrow")}
          title={tShell("home.title")}
          description={tShell("home.description")}
          sections={[
            {
              href: "/practice",
              title: tShell("home.cards.practice.title"),
              description: tShell("home.cards.practice.description"),
            },
            {
              href: "/playground",
              title: tShell("home.cards.playground.title"),
              description: tShell("home.cards.playground.description"),
            },
            {
              href: "/contests",
              title: tShell("home.cards.contests.title"),
              description: tShell("home.cards.contests.description"),
            },
            {
              href: "/community",
              title: tShell("home.cards.community.title"),
              description: tShell("home.cards.community.description"),
            },
          ]}
          primaryCta={{ href: "/workspace", label: tShell("home.primaryCta") }}
          secondaryCta={{ href: "/login", label: tShell("home.secondaryCta") }}
        />
      </main>
    </div>
  );
}
