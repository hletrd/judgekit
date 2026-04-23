import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessCodeManager } from "@/components/contest/access-code-manager";
import { toast } from "sonner";

const { apiFetchMock, apiFetchJsonMock, copyToClipboardMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  apiFetchJsonMock: vi.fn(),
  copyToClipboardMock: vi.fn(),
}));

const translations: Record<string, string> = {
  title: "Access Code",
  generate: "Generate Access Code",
  revoke: "Revoke Access Code",
  copy: "Copy Code",
  copied: "Copied!",
  shareLink: "Share Link",
  noCode: "No access code set",
  generateSuccess: "Access code generated",
  copyFailed: "Could not copy to your clipboard",
  revokeSuccess: "Access code revoked",
  revokeConfirm: "Are you sure?",
  error: "Error",
};

vi.mock("next-intl", () => ({
  useTranslations: (_namespace: string) => (key: string) => translations[key] ?? key,
  useLocale: () => "en",
}));

vi.mock("@/lib/api/client", () => ({
  apiFetch: apiFetchMock,
  apiFetchJson: apiFetchJsonMock,
}));

vi.mock("@/lib/clipboard", () => ({
  copyToClipboard: copyToClipboardMock,
}));

vi.mock("@/lib/locale-paths", () => ({
  buildLocalizedHref: (href: string) => href,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("lucide-react", () => {
  const Icon = () => <span data-testid="icon" />;
  return { Copy: Icon, Key: Icon, Link2: Icon, Trash2: Icon };
});

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTrigger: ({ render }: { render: React.ReactNode }) => <div>{render}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe("AccessCodeManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetchMock.mockReset();
    apiFetchJsonMock.mockReset();
    copyToClipboardMock.mockResolvedValue(true);
  });

  it("automatically copies the new access code after generation", async () => {
    // Initial fetch returns no code
    apiFetchJsonMock.mockResolvedValueOnce({
      ok: true,
      data: { data: { accessCode: null } },
    });
    // Generate POST returns the new code
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { accessCode: "ABCD1234" } }),
    });

    render(<AccessCodeManager assignmentId="assignment-1" />);

    expect(await screen.findByText("No access code set")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Generate Access Code" }));

    await waitFor(() => {
      expect(screen.getByText("ABCD1234")).toBeInTheDocument();
      expect(copyToClipboardMock).toHaveBeenCalledWith("ABCD1234");
      expect(toast.success).toHaveBeenCalledWith("Access code generated");
    });
  });

  it("shows an error toast when clipboard access fails", async () => {
    copyToClipboardMock.mockResolvedValue(false);
    // Initial fetch returns an existing code
    apiFetchJsonMock.mockResolvedValueOnce({
      ok: true,
      data: { data: { accessCode: "ABCD1234" } },
    });

    render(<AccessCodeManager assignmentId="assignment-1" />);

    expect(await screen.findByText("ABCD1234")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy Code" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Could not copy to your clipboard");
    });
  });
});
