import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { problems } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getApiUser, unauthorized, forbidden, isInstructor } from "@/lib/api/auth";
import { recordAuditEvent } from "@/lib/audit/events";
import { canAccessProblem } from "@/lib/auth/permissions";
import { createProblemWithTestCases } from "@/lib/problem-management";
import { problemMutationSchema } from "@/lib/validators/problem-management";

export async function GET(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;
    const visibility = searchParams.get("visibility");

    const allProblems = await db.select().from(problems).orderBy(desc(problems.createdAt));

    const accessibleProblems =
      user.role === "admin" || user.role === "super_admin"
        ? allProblems
        : (
            await Promise.all(
              allProblems.map(async (problem) => ({
                problem,
                hasAccess: await canAccessProblem(problem.id, user.id, user.role),
              }))
            )
          )
            .filter((entry) => entry.hasAccess)
            .map((entry) => entry.problem);

    const filtered = visibility
      ? accessibleProblems.filter((problem) => problem.visibility === visibility)
      : accessibleProblems;

    const paginatedProblems = filtered.slice(offset, offset + limit);

    return NextResponse.json({ data: paginatedProblems, page, limit, total: filtered.length });
  } catch (error) {
    console.error("GET /api/v1/problems error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();
    if (!isInstructor(user.role)) return forbidden();

    const body = await request.json();
    const parsedInput = problemMutationSchema.safeParse({
      title: body.title,
      description: body.description ?? "",
      timeLimitMs: body.timeLimitMs ?? 2000,
      memoryLimitMb: body.memoryLimitMb ?? 256,
      visibility: body.visibility ?? "private",
      testCases: body.testCases ?? [],
    });

    if (!parsedInput.success) {
      return NextResponse.json(
        { error: parsedInput.error.issues[0]?.message ?? "createError" },
        { status: 400 }
      );
    }

    const id = createProblemWithTestCases(parsedInput.data, user.id);

    const problem = await db.query.problems.findFirst({
      where: eq(problems.id, id),
      with: {
        testCases: true,
      },
    });

    if (problem) {
      recordAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        action: "problem.created",
        resourceType: "problem",
        resourceId: problem.id,
        resourceLabel: problem.title,
        summary: `Created problem \"${problem.title}\"`,
        details: {
          visibility: problem.visibility,
          timeLimitMs: problem.timeLimitMs,
          memoryLimitMb: problem.memoryLimitMb,
          testCaseCount: problem.testCases.length,
        },
        request,
      });
    }

    return NextResponse.json({ data: problem }, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/problems error:", error);
    return NextResponse.json({ error: "createError" }, { status: 500 });
  }
}
