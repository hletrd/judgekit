import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveCapabilities } from "@/lib/capabilities/cache";
import { auth } from "@/lib/auth";

export default async function WorkspaceHomePage() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const [tNav, tShell, capabilities] = await Promise.all([
    getTranslations("nav"),
    getTranslations("workspaceShell"),
    resolveCapabilities(session.user.role),
  ]);

  const canOpenControl =
    capabilities.has("users.view") ||
    capabilities.has("system.settings") ||
    capabilities.has("submissions.view_all") ||
    capabilities.has("groups.view_all") ||
    capabilities.has("assignments.view_status");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{tShell("title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{tShell("description")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{tNav("problems")}</CardTitle>
            <CardDescription>{tShell("cards.problems")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/problems" className="text-sm font-medium text-primary hover:underline">
              {tShell("openLink")}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tNav("contests")}</CardTitle>
            <CardDescription>{tShell("cards.contests")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/contests" className="text-sm font-medium text-primary hover:underline">
              {tShell("openLink")}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tNav("submissions")}</CardTitle>
            <CardDescription>{tShell("cards.submissions")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/submissions" className="text-sm font-medium text-primary hover:underline">
              {tShell("openLink")}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tShell("nav.discussions")}</CardTitle>
            <CardDescription>{tShell("cards.discussions")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/workspace/discussions" className="text-sm font-medium text-primary hover:underline">
              {tShell("openLink")}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tNav("profile")}</CardTitle>
            <CardDescription>{tShell("cards.profile")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/profile" className="text-sm font-medium text-primary hover:underline">
              {tShell("openLink")}
            </Link>
          </CardContent>
        </Card>
      </div>

      {canOpenControl ? (
        <Card>
          <CardHeader>
            <CardTitle>{tShell("controlCard.title")}</CardTitle>
            <CardDescription>{tShell("controlCard.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/control" className="text-sm font-medium text-primary hover:underline">
              {tShell("controlCard.link")}
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
