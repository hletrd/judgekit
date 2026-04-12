"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RecruitStartForm({
  token,
  assignmentId,
  isReentry,
  resumeWithCurrentSession,
  requireResumeCode,
  resumeMode,
}: {
  token: string;
  assignmentId: string;
  isReentry: boolean;
  resumeWithCurrentSession: boolean;
  requireResumeCode: boolean;
  resumeMode: "setup" | "resume";
}) {
  const t = useTranslations("recruit");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeCode, setResumeCode] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const resumeLabel = useMemo(
    () => (resumeMode === "resume" ? t("resumeCodeLabel") : t("resumeCodeSetupLabel")),
    [resumeMode, t]
  );

  async function handleStart() {
    setLoading(true);
    setError(null);

    try {
      if (resumeWithCurrentSession) {
        router.push(`/dashboard/contests/${assignmentId}`);
        router.refresh();
        return;
      }

      const normalizedResumeCode = resumeCode.trim();
      const normalizedAccountPassword = accountPassword.trim();
      if (requireResumeCode && !normalizedResumeCode) {
        setError(t("resumeCodeMissing"));
        return;
      }
      if (resumeMode === "setup" && !normalizedAccountPassword) {
        setError(t("accountPasswordMissing"));
        return;
      }

      // Sign out any existing session first
      await signOut({ redirect: false }).catch(() => {});

      const result = await signIn("credentials", {
        recruitToken: token,
        recruitResumeCode: requireResumeCode ? normalizedResumeCode : undefined,
        recruitAccountPassword: resumeMode === "setup" ? normalizedAccountPassword : undefined,
        redirect: false,
      });

      if (result?.ok) {
        router.push(`/dashboard/contests/${assignmentId}`);
        router.refresh();
      } else {
        setError(resumeMode === "resume" ? t("resumeCodeInvalid") : t("startFailed"));
      }
    } catch {
      setError(t("startFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {requireResumeCode && (
        <div className="space-y-2 text-left">
          <label className="block text-sm font-medium" htmlFor="recruit-resume-code">
            {resumeLabel}
          </label>
          <Input
            id="recruit-resume-code"
            type="password"
            value={resumeCode}
            onChange={(event) => setResumeCode(event.target.value)}
            placeholder={t("resumeCodePlaceholder")}
            autoComplete="off"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            {resumeMode === "resume" ? t("resumeCodeResumeHint") : t("resumeCodeSetupHint")}
          </p>
        </div>
      )}
      {resumeMode === "setup" && (
        <div className="space-y-2 text-left">
          <label className="block text-sm font-medium" htmlFor="recruit-account-password">
            {t("accountPasswordLabel")}
          </label>
          <Input
            id="recruit-account-password"
            type="password"
            value={accountPassword}
            onChange={(event) => setAccountPassword(event.target.value)}
            placeholder={t("accountPasswordPlaceholder")}
            autoComplete="new-password"
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">{t("accountPasswordHint")}</p>
        </div>
      )}
      <Button
        className="w-full"
        size="lg"
        onClick={handleStart}
        disabled={loading}
      >
        {loading
          ? t("starting")
          : isReentry
            ? t("continueAssessment")
            : t("startAssessment")}
      </Button>
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
