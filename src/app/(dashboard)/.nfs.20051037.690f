import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { getResolvedSystemSettings, isAiAssistantEnabled } from "@/lib/system-settings";
import { ChatWidgetLoader } from "@/components/plugins/chat-widget-loader";
import { resolveCapabilities } from "@/lib/capabilities/cache";
import { isPluginEnabled } from "@/lib/plugins/data";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [t, capabilities] = await Promise.all([
    getTranslations("common"),
    (async () => {
      const [caps, chatPluginOn, aiOn] = await Promise.all([
        resolveCapabilities(session.user.role),
        isPluginEnabled("chat-widget"),
        isAiAssistantEnabled(),
      ]);
      const arr = [...caps];
      return (!chatPluginOn || !aiOn) ? arr.filter(c => c !== "system.chat_logs") : arr;
    })(),
  ]);
  const settings = await getResolvedSystemSettings({
    siteTitle: t("appName"),
    siteDescription: t("appDescription"),
  });

  return (
    <SidebarProvider>
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        {t("skipToContent")}
      </a>
      <AppSidebar user={session.user} siteTitle={settings.siteTitle} capabilities={capabilities} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-sm font-semibold">{settings.siteTitle}</h1>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
        </header>
        <main id="dashboard-main-content" className="min-w-0 flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
      <Toaster />
      <ChatWidgetLoader />
    </SidebarProvider>
  );
}
