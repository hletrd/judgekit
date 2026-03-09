"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateProfile } from "@/lib/actions/update-profile";
import { useRouter } from "next/navigation";

export default function ProfileForm({ 
  initialName, 
  initialClassName,
}: { 
  initialName: string; 
  initialClassName: string;
}) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [className, setClassName] = useState(initialClassName);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await updateProfile({ name, className });
      if (result.success) {
        toast.success(t("updateSuccess"));
        router.refresh();
      } else {
        toast.error(t(result.error ?? "updateError"));
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input 
          id="name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder={t("namePlaceholder")}
          required 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="className">{t("className")}</Label>
        <Input
          id="className"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          placeholder={t("classNamePlaceholder")}
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? tCommon("loading") : tCommon("save")}
      </Button>
    </form>
  );
}
