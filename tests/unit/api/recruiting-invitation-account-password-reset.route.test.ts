import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getInvitationMock,
  resetAccountPasswordMock,
  recordAuditEventMock,
} = vi.hoisted(() => ({
  getInvitationMock: vi.fn(),
  resetAccountPasswordMock: vi.fn(),
  recordAuditEventMock: vi.fn(),
}));

vi.mock("@/lib/api/handler", () => ({
  createApiHandler:
    ({ handler }: { handler: (req: NextRequest, ctx: { user: any; body: any; params: Record<string, string> }) => Promise<Response> }) =>
    async (req: NextRequest, ctx?: { params?: Promise<Record<string, string>> }) =>
      handler(req, {
        user: { id: "admin-1", role: "admin", username: "admin" },
        body: req.method === "PATCH" ? await req.json() : undefined,
        params: (await ctx?.params) ?? { assignmentId: "assignment-1", invitationId: "invite-1" },
      }),
}));

vi.mock("@/lib/assignments/recruiting-invitations", () => ({
  getRecruitingInvitation: getInvitationMock,
  updateRecruitingInvitation: vi.fn(),
  deleteRecruitingInvitation: vi.fn(),
  resetRecruitingInvitationResumeCode: vi.fn(),
  resetRecruitingInvitationAccountPassword: resetAccountPasswordMock,
}));

vi.mock("@/lib/audit/events", () => ({
  recordAuditEvent: recordAuditEventMock,
}));

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/v1/contests/assignment-1/recruiting-invitations/invite-1", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/v1/contests/[assignmentId]/recruiting-invitations/[invitationId] account password reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getInvitationMock.mockResolvedValue({
      id: "invite-1",
      candidateName: "Candidate One",
      status: "redeemed",
      userId: "user-1",
      metadata: { resumeCodeHash: "hash" },
    });
  });

  it("resets the recruiting account password for redeemed invitations", async () => {
    resetAccountPasswordMock.mockResolvedValue("TempPass123!");

    const { PATCH } = await import("@/app/api/v1/contests/[assignmentId]/recruiting-invitations/[invitationId]/route");
    const res = await PATCH(makePatchRequest({ resetAccountPassword: true }), {
      params: Promise.resolve({ assignmentId: "assignment-1", invitationId: "invite-1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ id: "invite-1", temporaryPassword: "TempPass123!" });
    expect(resetAccountPasswordMock).toHaveBeenCalledWith("invite-1");
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "recruiting_invitation.account_password_reset" })
    );
  });
});
