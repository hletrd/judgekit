"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PluginAdminProps } from "@/lib/plugins/types";

type Provider = "openai" | "claude" | "gemini";

export default function ChatWidgetAdminConfig({ config, onSave }: PluginAdminProps) {
  const t = useTranslations("plugins.chatWidget");
  const tCommon = useTranslations("common");

  const [provider, setProvider] = useState<Provider>((config.provider as Provider) ?? "openai");
  const [openaiApiKey, setOpenaiApiKey] = useState((config.openaiApiKey as string) ?? "");
  const [openaiModel, setOpenaiModel] = useState((config.openaiModel as string) ?? "gpt-4o-mini");
  const [claudeApiKey, setClaudeApiKey] = useState((config.claudeApiKey as string) ?? "");
  const [claudeModel, setClaudeModel] = useState((config.claudeModel as string) ?? "claude-sonnet-4-20250514");
  const [geminiApiKey, setGeminiApiKey] = useState((config.geminiApiKey as string) ?? "");
  const [geminiModel, setGeminiModel] = useState((config.geminiModel as string) ?? "gemini-2.0-flash");
  const [systemPrompt, setSystemPrompt] = useState((config.systemPrompt as string) ?? "");
  const [knowledgeBase, setKnowledgeBase] = useState((config.knowledgeBase as string) ?? "");
  const [maxTokens, setMaxTokens] = useState((config.maxTokens as number) ?? 2048);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState((config.rateLimitPerMinute as number) ?? 10);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const currentApiKey = provider === "claude" ? claudeApiKey : provider === "gemini" ? geminiApiKey : openaiApiKey;
  const currentModel = provider === "claude" ? claudeModel : provider === "gemini" ? geminiModel : openaiModel;

  function maskApiKey(key: string): string {
    if (!key || key.length <= 8) return key ? "••••••••" : "";
    return `${key.slice(0, 3)}...${key.slice(-4)}`;
  }

  async function handleTestConnection() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/v1/plugins/chat-widget/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: currentApiKey,
          model: currentModel,
        }),
      });
      const data = await response.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "Network error" });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSave({
        provider,
        openaiApiKey,
        openaiModel,
        claudeApiKey,
        claudeModel,
        geminiApiKey,
        geminiModel,
        systemPrompt,
        knowledgeBase,
        maxTokens,
        rateLimitPerMinute,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function setCurrentApiKey(value: string) {
    if (provider === "claude") setClaudeApiKey(value);
    else if (provider === "gemini") setGeminiApiKey(value);
    else setOpenaiApiKey(value);
  }

  function setCurrentModel(value: string) {
    if (provider === "claude") setClaudeModel(value);
    else if (provider === "gemini") setGeminiModel(value);
    else setOpenaiModel(value);
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("provider")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("provider")}</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai" label={t("providerOptions.openai")}>{t("providerOptions.openai")}</SelectItem>
                <SelectItem value="claude" label={t("providerOptions.claude")}>{t("providerOptions.claude")}</SelectItem>
                <SelectItem value="gemini" label={t("providerOptions.gemini")}>{t("providerOptions.gemini")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("apiKey")}</Label>
            <Input
              type="password"
              value={currentApiKey}
              onChange={(e) => setCurrentApiKey(e.target.value)}
              placeholder={t("apiKeyPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("apiKeyHint")}</p>
            {currentApiKey && (
              <p className="text-xs font-mono text-muted-foreground">
                {t("currentKey")}: {maskApiKey(currentApiKey)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("model")}</Label>
            <Input
              value={currentModel}
              onChange={(e) => setCurrentModel(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void handleTestConnection()} disabled={isTesting || !currentApiKey}>
              {isTesting ? tCommon("loading") : t("testConnection")}
            </Button>
            {testResult && (
              <span className={`text-sm ${testResult.success ? "text-green-600" : "text-destructive"}`}>
                {testResult.success ? t("testSuccess") : t("testFailed", { error: testResult.error ?? "" })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("systemPrompt")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">{t("systemPromptHint")}</p>
          </div>

          <div className="space-y-2">
            <Label>{t("knowledgeBase")}</Label>
            <Textarea
              value={knowledgeBase}
              onChange={(e) => setKnowledgeBase(e.target.value)}
              rows={6}
            />
            <p className="text-xs text-muted-foreground">{t("knowledgeBaseHint")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("maxTokens")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("maxTokens")}</Label>
            <Input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              min={100}
              max={8192}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("rateLimitPerMinute")}</Label>
            <Input
              type="number"
              value={rateLimitPerMinute}
              onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
              min={1}
              max={100}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? tCommon("loading") : tCommon("save")}
      </Button>
    </form>
  );
}
