import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { assertUserRole } from "@/lib/security/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function CreateContestPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [t, tCommon] = await Promise.all([
    getTranslations("contests"),
    getTranslations("common"),
  ]);

  const role = assertUserRole(session.user.role as string);

  if (role === "student") {
    redirect("/dashboard/contests");
  }

  // Get groups the user can manage
  let userGroups;
  if (role === "super_admin" || role === "admin") {
    userGroups = await db.query.groups.findMany({
      columns: { id: true, name: true, description: true },
      where: eq(groups.isArchived, false),
    });
  } else {
    userGroups = await db.query.groups.findMany({
      columns: { id: true, name: true, description: true },
      where: (g, { and, eq: eqOp }) =>
        and(eqOp(g.instructorId, session.user.id), eqOp(g.isArchived, false)),
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/contests"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {tCommon("back")}
      </Link>

      <div>
        <h2 className="text-3xl font-bold">{t("createContest")}</h2>
        <p className="text-muted-foreground">{t("createContestDescription")}</p>
      </div>

      <Card>
        <CardContent className="py-4 px-5">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>{t("createStep1")}</li>
            <li>{t("createStep2")}</li>
            <li>{t("createStep3")}</li>
            <li>{t("createStep4")}</li>
          </ol>
        </CardContent>
      </Card>

      {userGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("noGroupsForContest")}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {userGroups.map((group) => (
            <Link key={group.id} href={`/dashboard/groups/${group.id}`}>
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="flex items-center gap-3 py-4 px-5">
                  <Users className="size-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{group.name}</p>
                    {group.description && (
                      <p className="text-xs text-muted-foreground truncate">{group.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
