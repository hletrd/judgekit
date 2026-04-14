import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { resolveCapabilities } from "@/lib/capabilities/cache";

export default async function ControlHomePage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const [tNav, tShell, capabilities] = await Promise.all([
    getTranslations("nav"),
    getTranslations("controlShell"),
    resolveCapabilities(session.user.role),
  ]);
  const canModerate = capabilities.has("community.moderate");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{tShell("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{tShell("description")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{tNav("groups")}</CardTitle>
            <CardDescription>{tShell("cards.groups")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/groups" className="text-sm font-medium text-primary hover:underline">
              {tShell("openLink")}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tNav("userManagement")}</CardTitle>
            <CardDescription>{tShell("cards.users")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/users" className="text-sm font-medium text-primary hover:underline">
              {tShell("openLink")}
            </Link>
          </CardContent>
        </Card>
        {canModerate ? (
          <Card>
            <CardHeader>
              <CardTitle>{tShell("nav.discussions")}</CardTitle>
              <CardDescription>{tShell("cards.discussions")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/control/discussions" className="text-sm font-medium text-primary hover:underline">
                {tShell("openLink")}
              </Link>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>{tNav("systemSettings")}</CardTitle>
            <CardDescription>{tShell("cards.settings")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/admin/settings" className="text-sm font-medium text-primary hover:underline">
              {tShell("openLink")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
