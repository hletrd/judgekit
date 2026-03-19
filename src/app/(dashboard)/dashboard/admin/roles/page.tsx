import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { roles, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveCapabilities } from "@/lib/capabilities/cache";
import { Lock } from "lucide-react";
import { ensureBuiltinRoles } from "@/lib/capabilities/ensure-builtin-roles";
import RoleEditorDialog from "./role-editor-dialog";
import RoleDeleteDialog from "./role-delete-dialog";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.roles");
  return { title: t("title") };
}

export default async function RoleManagementPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const caps = await resolveCapabilities(session.user.role);
  if (!caps.has("users.manage_roles")) redirect("/dashboard");

  const t = await getTranslations("admin.roles");

  await ensureBuiltinRoles();

  const allRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
      displayName: roles.displayName,
      description: roles.description,
      isBuiltin: roles.isBuiltin,
      level: roles.level,
      capabilities: roles.capabilities,
    })
    .from(roles)
    .orderBy(roles.level, roles.name);

  const userCounts = await db
    .select({
      role: users.role,
      count: sql<number>`count(*)`,
    })
    .from(users)
    .groupBy(users.role);

  const countMap = new Map(userCounts.map((r) => [r.role, r.count]));

  const roleData = allRoles.map((role) => ({
    ...role,
    capabilities: role.capabilities as string[],
    userCount: countMap.get(role.name) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <RoleEditorDialog mode="create" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {roleData.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t("noRoles")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.name")}</TableHead>
                  <TableHead>{t("table.displayName")}</TableHead>
                  <TableHead>{t("table.level")}</TableHead>
                  <TableHead>{t("table.users")}</TableHead>
                  <TableHead>{t("table.capabilities")}</TableHead>
                  <TableHead>{t("table.type")}</TableHead>
                  <TableHead>{t("table.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleData.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-mono text-sm">
                      {role.isBuiltin && <Lock className="inline size-3 mr-1 text-muted-foreground" />}
                      {role.name}
                    </TableCell>
                    <TableCell>{role.displayName}</TableCell>
                    <TableCell>{role.level}</TableCell>
                    <TableCell>{role.userCount}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {t("capabilitiesCount", { count: role.capabilities.length })}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.isBuiltin ? "default" : "outline"}>
                        {role.isBuiltin ? t("builtIn") : t("custom")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <RoleEditorDialog
                          mode="edit"
                          role={{
                            id: role.id,
                            name: role.name,
                            displayName: role.displayName,
                            description: role.description,
                            isBuiltin: role.isBuiltin,
                            level: role.level,
                            capabilities: role.capabilities,
                          }}
                        />
                        {!role.isBuiltin && (
                          <RoleDeleteDialog
                            roleId={role.id}
                            roleName={role.name}
                            displayName={role.displayName}
                            userCount={role.userCount}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
