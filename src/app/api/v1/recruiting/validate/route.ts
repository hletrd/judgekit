import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { recruitingInvitations, assignments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";
import { validateRecruitingTokenSchema } from "@/lib/validators/recruiting-invitations";

export async function POST(req: NextRequest) {
  const rateLimitResponse = await consumeApiRateLimit(req, "recruiting:validate");
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const body = await req.json().catch(() => null);
  const parsed = validateRecruitingTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalidToken" }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const [invitation] = await db
    .select({
      status: recruitingInvitations.status,
      expiresAt: recruitingInvitations.expiresAt,
      assignmentId: recruitingInvitations.assignmentId,
    })
    .from(recruitingInvitations)
    .where(eq(recruitingInvitations.tokenHash, tokenHash))
    .limit(1);

  // Return a uniform invalid response for any failure case to avoid
  // leaking invitation status, expiration metadata, or assignment details
  // to anonymous callers.
  const invalid = () => NextResponse.json({ data: { valid: false } });

  if (!invitation) return invalid();
  if (invitation.status === "revoked") return invalid();
  if (invitation.expiresAt && invitation.expiresAt < new Date()) return invalid();

  const [assignment] = await db
    .select({
      id: assignments.id,
      deadline: assignments.deadline,
    })
    .from(assignments)
    .where(eq(assignments.id, invitation.assignmentId))
    .limit(1);

  if (!assignment) return invalid();
  if (assignment.deadline && assignment.deadline < new Date()) return invalid();

  return NextResponse.json({
    data: { valid: true },
  });
}
