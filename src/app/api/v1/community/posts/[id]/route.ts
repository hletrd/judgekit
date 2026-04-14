import { NextRequest } from "next/server";
import { createApiHandler, forbidden, notFound } from "@/lib/api/handler";
import { apiSuccess } from "@/lib/api/responses";
import { db } from "@/lib/db";
import { discussionPosts } from "@/lib/db/schema";
import { canModerateDiscussions } from "@/lib/discussions/permissions";
import { eq } from "drizzle-orm";
import { recordAuditEvent } from "@/lib/audit/events";

export const DELETE = createApiHandler({
  auth: true,
  rateLimit: "community:posts:delete",
  handler: async (req: NextRequest, { user, params }) => {
    if (!(await canModerateDiscussions(user.role))) {
      return forbidden();
    }

    const { id } = params;
    const post = await db.query.discussionPosts.findFirst({
      where: eq(discussionPosts.id, id),
      columns: { id: true, threadId: true },
    });

    if (!post) {
      return notFound("Discussion post");
    }

    await db.delete(discussionPosts).where(eq(discussionPosts.id, id));

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "discussion.reply_deleted",
      resourceType: "discussion_post",
      resourceId: id,
      resourceLabel: id,
      summary: `Deleted discussion reply ${id}`,
      details: { threadId: post.threadId },
      request: req,
    });

    return apiSuccess({ id });
  },
});
