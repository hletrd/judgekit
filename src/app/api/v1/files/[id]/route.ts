import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { getApiUser, unauthorized, csrfForbidden } from "@/lib/api/auth";
import { consumeApiRateLimit } from "@/lib/security/api-rate-limit";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { resolveCapabilities } from "@/lib/capabilities/cache";
import { recordAuditEvent } from "@/lib/audit/events";
import { readUploadedFile, deleteUploadedFile } from "@/lib/files/storage";
import { isImageMimeType } from "@/lib/files/image-processing";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const { id } = await params;

    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1);

    if (!file) {
      return apiError("notFound", 404);
    }

    // Check ETag for conditional request
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === `"${file.id}"`) {
      return new NextResponse(null, { status: 304 });
    }

    let buffer: Buffer;
    try {
      buffer = readUploadedFile(file.storedName);
    } catch {
      return apiError("notFound", 404);
    }

    const isImage = isImageMimeType(file.mimeType);
    const disposition = isImage
      ? "inline"
      : `attachment; filename="${encodeURIComponent(file.originalName)}"`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": disposition,
        "Cache-Control": "public, max-age=31536000, immutable",
        ETag: `"${file.id}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (error) {
    logger.error({ err: error }, "File serve failed");
    return apiError("internalServerError", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const csrfError = csrfForbidden(request);
    if (csrfError) return csrfError;

    const rateLimitError = await consumeApiRateLimit(request, "files:delete");
    if (rateLimitError) return rateLimitError;

    const user = await getApiUser(request);
    if (!user) return unauthorized();

    const caps = await resolveCapabilities(user.role);
    const { id } = await params;

    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1);

    if (!file) {
      return apiError("notFound", 404);
    }

    // Must have files.manage, or own the file with files.upload
    if (!caps.has("files.manage")) {
      if (!caps.has("files.upload") || file.uploadedBy !== user.id) {
        return apiError("forbidden", 403);
      }
    }

    deleteUploadedFile(file.storedName);
    await db.delete(files).where(eq(files.id, id));

    recordAuditEvent({
      actorId: user.id,
      actorRole: user.role,
      action: "file.deleted",
      resourceType: "file",
      resourceId: file.id,
      resourceLabel: file.originalName,
      summary: `Deleted file: ${file.originalName}`,
      request,
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    logger.error({ err: error }, "File delete failed");
    return apiError("internalServerError", 500);
  }
}
