import { createApiHandler } from "@/lib/api/handler";
import { apiSuccess, apiError } from "@/lib/api/responses";
import { forbidden } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { languageConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { isJudgeLanguage, getJudgeLanguageDefinition, serializeJudgeCommand } from "@/lib/judge/languages";
import { executeCompilerRun } from "@/lib/compiler/execute";
import { resolveCapabilities } from "@/lib/capabilities";
import { getPlatformModePolicy } from "@/lib/platform-mode";
import { getEffectivePlatformMode } from "@/lib/platform-mode-context";

const MAX_SOURCE_CODE_LENGTH = 64 * 1024; // 64KB
const MAX_STDIN_LENGTH = 64 * 1024; // 64KB

const compilerRunSchema = z.object({
  language: z.string().min(1),
  sourceCode: z.string().min(1).max(MAX_SOURCE_CODE_LENGTH),
  stdin: z.string().max(MAX_STDIN_LENGTH).default(""),
  assignmentId: z.string().max(100).nullish(),
});

export const POST = createApiHandler({
  auth: true,
  rateLimit: "compiler:run",
  schema: compilerRunSchema,
  handler: async (_req, { user, body }) => {
    const platformMode = await getEffectivePlatformMode({
      userId: user.id,
      assignmentId: body.assignmentId ?? null,
    });
    if (getPlatformModePolicy(platformMode).restrictStandaloneCompiler) {
      return apiError("compilerDisabledInCurrentMode", 403);
    }

    const caps = await resolveCapabilities(user.role);
    if (!caps.has("content.submit_solutions")) {
      return forbidden();
    }

    // Validate language exists in judge language definitions
    if (!isJudgeLanguage(body.language)) {
      return apiError("languageNotFound", 404, "language");
    }

    const [langConfig] = await db
      .select({
        extension: languageConfigs.extension,
        dockerImage: languageConfigs.dockerImage,
        compileCommand: languageConfigs.compileCommand,
        runCommand: languageConfigs.runCommand,
        isEnabled: languageConfigs.isEnabled,
      })
      .from(languageConfigs)
      .where(eq(languageConfigs.language, body.language))
      .limit(1);

    // Language not found in DB
    if (!langConfig) {
      return apiError("languageNotFound", 404, "language");
    }

    // Language exists but is disabled
    if (!langConfig.isEnabled) {
      return apiError("languageDisabled", 400, "language");
    }

    // Fall back to built-in language definitions when DB fields are empty
    const langDef = getJudgeLanguageDefinition(body.language);
    const extension = langConfig.extension || langDef?.extension;
    const dockerImage = langConfig.dockerImage || langDef?.dockerImage;
    const runCommand = langConfig.runCommand || (langDef ? langDef.runCommand.join(" ") : null);
    const compileCommand = langConfig.compileCommand || serializeJudgeCommand(langDef?.compileCommand);

    if (!extension || !dockerImage || !runCommand) {
      return apiError("internalServerError", 500);
    }

    const result = await executeCompilerRun({
      sourceCode: body.sourceCode,
      stdin: body.stdin,
      language: {
        extension,
        dockerImage: dockerImage.trim(),
        compileCommand: compileCommand?.trim() || null,
        runCommand: runCommand.trim(),
      },
    });

    return apiSuccess(result);
  },
});
