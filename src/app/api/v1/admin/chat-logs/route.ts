import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql, and, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages, users } from "@/lib/db/schema";
import { forbidden } from "@/lib/api/auth";
import { createApiHandler } from "@/lib/api/handler";
import { resolveCapabilities } from "@/lib/capabilities/cache";
import { recordAuditEvent } from "@/lib/audit/events";

export const GET = createApiHandler({
  handler: async (req: NextRequest, { user }) => {
    const caps = await resolveCapabilities(user.role);
    if (!caps.has("system.chat_logs")) return forbidden();

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const sessionId = url.searchParams.get("sessionId");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = 50;
    const offset = (page - 1) * limit;

    if (sessionId) {
      // Get messages for a specific session
      const messages = await db.query.chatMessages.findMany({
        where: eq(chatMessages.sessionId, sessionId),
        orderBy: [asc(chatMessages.createdAt)],
        with: {
          user: { columns: { id: true, name: true, username: true } },
        },
      });
      recordAuditEvent({
        actorId: user.id,
        actorRole: user.role,
        action: "chat_log.session_viewed",
        resourceType: "chat_session",
        resourceId: sessionId,
        resourceLabel: sessionId,
        summary: `Viewed chat transcript for session ${sessionId}`,
        details: { sessionId },
        request: req,
      });
      return NextResponse.json({ messages });
    }

    // Get session list (grouped by sessionId)
    const filters = [];
    if (userId) {
      filters.push(eq(chatMessages.userId, userId));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const sessions = await db
      .select({
        sessionId: chatMessages.sessionId,
        userId: chatMessages.userId,
        problemId: chatMessages.problemId,
        provider: chatMessages.provider,
        model: chatMessages.model,
        messageCount: sql<number>`count(*)`,
        firstMessage: sql<string>`min(${chatMessages.content})`,
        startedAt: sql<string>`min(${chatMessages.createdAt})`,
        lastMessageAt: sql<string>`max(${chatMessages.createdAt})`,
        userName: users.name,
        username: users.username,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.userId, users.id))
      .where(whereClause)
      .groupBy(chatMessages.sessionId)
      .orderBy(desc(sql`max(${chatMessages.createdAt})`))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(distinct ${chatMessages.sessionId})` })
      .from(chatMessages)
      .where(whereClause);

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "chat_log.list_viewed",
      resourceType: "chat_log",
      resourceId: userId ?? null,
      resourceLabel: userId ?? "all",
      summary: userId
        ? `Viewed chat-log sessions filtered to user ${userId}`
        : "Viewed chat-log session index",
      details: { userId, page, limit },
      request: req,
    });

    return NextResponse.json({ sessions, total: Number(total), page, limit });
  },
});
