import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recruitingInvitations, assignments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { consumeInMemoryRateLimit } from "@/lib/security/in-memory-rate-limit";
import { extractClientIp } from "@/lib/security/ip";

export async function POST(req: Request) {
  // Rate limit: 10 attempts per minute per IP
  const ip = extractClientIp(req.headers);
  const { limited } = consumeInMemoryRateLimit(
    { headers: req.headers },
    `recruiting:validate:${ip}`,
    10,
    60000
  );
  if (limited) {
    return NextResponse.json({ error: "rateLimited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.token || typeof body.token !== "string") {
    return NextResponse.json({ error: "invalidToken" }, { status: 400 });
  }

  const [invitation] = await db
    .select({
      id: recruitingInvitations.id,
      status: recruitingInvitations.status,
      candidateName: recruitingInvitations.candidateName,
      expiresAt: recruitingInvitations.expiresAt,
      assignmentId: recruitingInvitations.assignmentId,
      userId: recruitingInvitations.userId,
    })
    .from(recruitingInvitations)
    .where(eq(recruitingInvitations.token, body.token))
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
