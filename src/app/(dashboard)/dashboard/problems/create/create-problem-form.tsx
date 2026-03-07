"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CreateProblemForm() {
  const t = useTranslations("problems");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);
  const [visibility, setVisibility] = useState("private");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          timeLimitMs,
          memoryLimitMb,
          visibility,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create problem");
      }

      toast.success(t("createSuccess") || "Problem created successfully");
      router.push("/dashboard/problems");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || tCommon("error"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">{t("titleLabel", { fallback: "Title" })}</Label>
        <Input 
          id="title" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          required 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("descLabel", { fallback: "Description (Markdown/HTML)" })}</Label>
        <Textarea 
          id="description" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          className="min-h-[200px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="timeLimit">{t("timeLimitLabel", { fallback: "Time Limit (ms)" })}</Label>
          <Input 
            id="timeLimit" 
            type="number" 
            min={100} 
            max={10000} 
            value={timeLimitMs} 
            onChange={(e) => setTimeLimitMs(parseInt(e.target.value))} 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="memoryLimit">{t("memoryLimitLabel", { fallback: "Memory Limit (MB)" })}</Label>
          <Input 
            id="memoryLimit" 
            type="number" 
            min={16} 
            max={1024} 
            value={memoryLimitMb} 
            onChange={(e) => setMemoryLimitMb(parseInt(e.target.value))} 
            required 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="visibility">{t("visibilityLabel", { fallback: "Visibility" })}</Label>
        <Select value={visibility} onValueChange={(v) => { if (v) setVisibility(v); }}>
          <SelectTrigger id="visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
          disabled={isLoading}
        >
          {tCommon("cancel")}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? tCommon("loading") : tCommon("create")}
        </Button>
      </div>
    </form>
  );
}
