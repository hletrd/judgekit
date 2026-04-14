import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { languageConfigs } from "@/lib/db/schema";
import { getJudgeLanguageDefinition } from "@/lib/judge/languages";

export type EnabledCompilerLanguage = {
  id: string;
  language: string;
  displayName: string;
  standard: string | null;
  extension: string;
};

export async function getEnabledCompilerLanguages(): Promise<EnabledCompilerLanguage[]> {
  return (await db
    .select({
      id: languageConfigs.id,
      language: languageConfigs.language,
      displayName: languageConfigs.displayName,
      standard: languageConfigs.standard,
      extension: languageConfigs.extension,
    })
    .from(languageConfigs)
    .where(eq(languageConfigs.isEnabled, true)))
    .flatMap((lang) => {
      const definition = getJudgeLanguageDefinition(lang.language);
      if (!definition) return [];
      return [{
        ...lang,
        displayName: definition.displayName,
        standard: definition.standard,
        extension: definition.extension,
      }];
    });
}
