import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/layout/app-sidebar";

const { signOutMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock("next-auth/react", () => ({
  signOut: signOutMock,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/lib/auth/sign-out", () => ({
  handleSignOutWithCleanup: vi.fn(),
}));

vi.mock("@/components/layout/active-timed-assignment-sidebar-panel", () => ({
  ActiveTimedAssignmentSidebarPanel: () => null,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: ReactNode;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src as string} alt={alt as string} {...rest} />;
  },
}));

vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: ReactNode }) => <aside>{children}</aside>,
  SidebarContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  SidebarGroupLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: ReactNode }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }: { children: ReactNode }) => <li>{children}</li>,
  SidebarMenuButton: ({
    children,
    render,
    onClick,
    disabled,
  }: {
    children: ReactNode;
    render?: ReactElement<{ href?: string }>;
    onClick?: () => void;
    disabled?: boolean;
  }) => {
    const href = render?.props?.href;
    if (href) {
      return <a href={href}>{children}</a>;
    }
    return (
      <button onClick={onClick} disabled={disabled}>
        {children}
      </button>
    );
  },
  SidebarFooter: ({ children }: { children: ReactNode }) => <footer>{children}</footer>,
  SidebarHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
}));

vi.mock("lucide-react", () => {
  const Icon = ({ className }: { className?: string }) => (
    <svg data-testid="icon" className={className} aria-hidden="true" />
  );
  return {
    BookOpen: Icon,
    FileCode: Icon,
    Send: Icon,
    Users: Icon,
    User: Icon,
    LayoutDashboard: Icon,
    GraduationCap: Icon,
    Shield: Icon,
    LogOut: Icon,
    LogIn: Icon,
    History: Icon,
    FolderOpen: Icon,
    Blocks: Icon,
    Trophy: Icon,
    MessageCircle: Icon,
    MessageCircleWarning: Icon,
    Timer: Icon,
    KeyRound: Icon,
    Code: Icon,
    Settings: Icon,
    Server: Icon,
    Play: Icon,
    Upload: Icon,
    Tags: Icon,
    Loader2: Icon,
  };
});

describe("AppSidebar", () => {
  it("returns null for non-admin users whose navigation lives in the PublicHeader", () => {
    const { container } = render(
      <AppSidebar
        user={{ id: "user-1", username: "candidate", name: "Candidate", role: "student" }}
        siteTitle="JudgeKit"
        platformMode="recruiting"
        capabilities={[]}
      />
    );

    // Non-admin users have no sidebar — all their nav is in the PublicHeader dropdown
    expect(container.innerHTML).toBe("");
  });

  it("shows admin navigation items for users with admin capabilities", () => {
    render(
      <AppSidebar
        user={{ id: "user-2", username: "admin", name: "Admin", role: "admin" }}
        siteTitle="JudgeKit"
        platformMode="homework"
        capabilities={["submissions.view_all"]}
      />
    );

    expect(screen.getByRole("link", { name: "allSubmissions" })).toHaveAttribute(
      "href",
      "/dashboard/admin/submissions"
    );
  });

  it("shows only capability-filtered admin items", () => {
    render(
      <AppSidebar
        user={{ id: "user-3", username: "editor", name: "Editor", role: "assistant" }}
        siteTitle="JudgeKit"
        platformMode="homework"
        capabilities={["system.settings"]}
      />
    );

    // Only system-settings items should appear; submissions (submissions.view_all) should not
    expect(screen.getByRole("link", { name: "systemSettings" })).toHaveAttribute(
      "href",
      "/dashboard/admin/settings"
    );
    expect(screen.queryByRole("link", { name: "allSubmissions" })).not.toBeInTheDocument();
  });

  it("shows the localized assistant role label instead of the raw role slug", () => {
    render(
      <AppSidebar
        user={{ id: "user-4", username: "ta", name: "TA", role: "assistant" }}
        siteTitle="JudgeKit"
        platformMode="homework"
        capabilities={["system.settings"]}
      />
    );

    expect(screen.getByText("roles.assistant")).toBeInTheDocument();
    expect(screen.queryByText("assistant")).not.toBeInTheDocument();
  });
});
