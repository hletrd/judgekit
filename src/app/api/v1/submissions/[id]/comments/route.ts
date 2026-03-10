import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { recordAuditEvent } from "@/lib/audit/events";
import { db } from "@/lib/db";
import { submissions, submissionComments } from "@/lib/db/schema";
import { getApiUser, unauthorized, forbidden, notFound, csrfForbidden, isInstructor } from "@/lib/api/auth";
import { canAccessSubmission } from "@/lib/auth/permissions";
import { commentCreateSchema } from "@/lib/validators/comments";
import { checkApiRateLimit, recordApiRateHit } from "@/lib/security/api-rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const id = (await params).id;
    if (!id) return notFound("Submission");
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
      columns: {
        id: true,
        userId: true,
        assignmentId: true,
      },
    });

    if (!submission) return notFound("Submission");

    const hasAccess = await canAccessSubmission(submission, user.id, user.role);
    if (!hasAccess) return forbidden();

    const comments = await db.query.submissionComments.findMany({
      where: eq(submissionComments.submissionId, id),
      with: {
        author: {
          columns: { name: true, role: true },
        },
      },
      orderBy: (sc, { asc }) => [asc(sc.createdAt)],
    });

    return NextResponse.json({ data: comments });
  } catch (error) {
    console.error("GET /api/v1/submissions/[id]/comments error:", error);
    return NextResponse.json({ error: "internalServerError" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const rateLimitResponse = checkApiRateLimit(request, "comments:add");
    if (rateLimitResponse) return rateLimitResponse;
    recordApiRateHit(request, "comments:add");

    const user = await getApiUser(request);
    if (!user) return unauthorized();

    if (!isInstructor(user.role)) return forbidden();

    const id = (await params).id;
    if (!id) return notFound("Submission");
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
      columns: {
        id: true,
        userId: true,
        assignmentId: true,
      },
    });

    if (!submission) return notFound("Submission");

    const body = await request.json();
    const parsed = commentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "invalidComment" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(submissionComments)
      .values({
        submissionId: id,
        authorId: user.id,
        content: parsed.data.content,
      })
      .returning();

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "submission.comment_added",
      resourceType: "submission",
      resourceId: id,
      resourceLabel: id,
      summary: `Added feedback comment on submission ${id}`,
      details: {
        submissionId: id,
        commentId: created.id,
      },
      request,
    });

    const comment = await db.query.submissionComments.findFirst({
      where: eq(submissionComments.id, created.id),
      with: {
        author: {
          columns: { name: true, role: true },
        },
      },
    });

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/submissions/[id]/comments error:", error);
    return NextResponse.json({ error: "internalServerError" }, { status: 500 });
  }
}
