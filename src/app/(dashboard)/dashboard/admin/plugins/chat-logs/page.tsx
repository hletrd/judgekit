import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveCapabilities } from "@/lib/capabilities/cache";
import { ChatLogsClient } from "./chat-logs-client";

export default async function ChatLogsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const caps = await resolveCapabilities(session.user.role);
  if (!caps.has("system.chat_logs")) redirect("/dashboard");

  const t = await getTranslations("plugins.chatWidget");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t("chatLogs")}</h2>
        <p className="text-sm text-muted-foreground">{t("chatLogsDescription")}</p>
      </div>
      <ChatLogsClient />
    </div>
  );
}
