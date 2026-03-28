"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Next.js 16 RSC streaming bug: Host/X-Forwarded-Host headers from nginx
 * corrupt RSC payloads during client-side navigation on contest routes.
 * This layout intercepts all <a> clicks within contest pages and forces
 * full page navigation (which always works) instead of client-side RSC.
 */
export default function ContestsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("http")) return;

      // Force full page navigation for internal links
      e.preventDefault();
      e.stopPropagation();
      window.location.href = href;
    };

    document.getElementById("dashboard-main-content")?.addEventListener("click", handler, true);
    // Also intercept sidebar links when on contest pages
    document.querySelector("[data-slot='sidebar']")?.addEventListener("click", handler, true);

    return () => {
      document.getElementById("dashboard-main-content")?.removeEventListener("click", handler, true);
      document.querySelector("[data-slot='sidebar']")?.removeEventListener("click", handler, true);
    };
  }, [pathname]);

  return <>{children}</>;
}
