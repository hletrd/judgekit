import { apiSuccess } from "@/lib/api/responses";
import { db } from "@/lib/db";
import { languageConfigs } from "@/lib/db/schema";
import { getJudgeLanguageDefinition } from "@/lib/judge/languages";
import { eq } from "drizzle-orm";
import { createApiHandler } from "@/lib/api/handler";

export const GET = createApiHandler({
  auth: false,
  handler: async () => {
    const languages = await db
      .select()
      .from(languageConfigs)
      .where(eq(languageConfigs.isEnabled, true));

    return apiSuccess(languages.flatMap((language) => {
      const definition = getJudgeLanguageDefinition(language.language);

      if (!definition) {
        return [];
      }

      return [{
        id: language.id,
        language: definition.language,
        displayName: definition.displayName,
        standard: definition.standard,
        extension: definition.extension,
      }];
    }), {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  },
});
