"use client";

import { useState, useTransition } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/actions/change-password";

export function ChangePasswordForm({ username }: { username: string }) {
  const router = useRouter();
  const t = useTranslations("changePassword");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    startTransition(async () => {
      const result = await changePassword(currentPassword, newPassword);

      if (!result.success) {
        if (result.error === "sessionExpired" || result.error === "userNotFound") {
          await signOut({ redirect: false });
          router.replace("/login");
          router.refresh();
          return;
        }

        setError(t(result.error ?? "error"));
      } else {
        await signOut({ redirect: false });

        const refreshedSession = await signIn("credentials", {
          username,
          password: newPassword,
          redirect: false,
          redirectTo: "/dashboard",
        });

        if (refreshedSession?.error || !refreshedSession?.ok) {
          await signOut({ redirect: false });
          router.replace("/login");
          router.refresh();
          return;
        }

        if (refreshedSession.url) {
          const nextUrl = new URL(refreshedSession.url, window.location.origin);
          router.replace(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
        } else {
          router.replace("/dashboard");
        }
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t("currentPassword")}</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t("newPassword")}</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          minLength={8}
          required
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? t("changing") : t("changeButton")}
      </Button>
    </form>
  );
}
