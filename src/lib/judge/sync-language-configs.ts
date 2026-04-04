import { db } from "@/lib/db";
import { languageConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { DEFAULT_JUDGE_LANGUAGES, serializeJudgeCommand } from "./languages";

const RETRY_DELAY_MS = 30_000;
const MAX_RETRIES = 3;

async function doSync(): Promise<boolean> {
  const existing = await db
    .select({
      language: languageConfigs.language,
      runCommand: languageConfigs.runCommand,
      compileCommand: languageConfigs.compileCommand,
    })
    .from(languageConfigs);

  const existingMap = new Map(existing.map((r) => [r.language, r]));
  let inserted = 0;
  let updated = 0;

  for (const lang of DEFAULT_JUDGE_LANGUAGES) {
    const record = existingMap.get(lang.language);

    if (!record) {
      const compileCmd = serializeJudgeCommand(lang.compileCommand);
      await db.insert(languageConfigs).values({
        id: nanoid(),
        language: lang.language,
        displayName: lang.displayName,
        extension: lang.extension,
        dockerImage: lang.dockerImage,
        compiler: lang.compiler ?? null,
        runCommand: lang.runCommand.join(" "),
        isEnabled: true,
        updatedAt: new Date(),
        ...(lang.standard ? { standard: lang.standard } : {}),
        ...(compileCmd ? { compileCommand: compileCmd } : {}),
      });
      inserted++;
      continue;
    }

    // Back-fill empty run/compile commands from built-in definitions
    if (!record.runCommand || !record.compileCommand) {
      const updates: Record<string, string | Date> = { updatedAt: new Date() };
      if (!record.runCommand) {
        updates.runCommand = lang.runCommand.join(" ");
      }
      if (!record.compileCommand && lang.compileCommand) {
        updates.compileCommand = serializeJudgeCommand(lang.compileCommand)!;
      }
      await db
        .update(languageConfigs)
        .set(updates)
        .where(eq(languageConfigs.language, lang.language));
      updated++;
    }
  }

  if (inserted > 0) {
    console.log(`[language-sync] inserted ${inserted} new language configs`);
  }
  if (updated > 0) {
    console.log(`[language-sync] back-filled commands for ${updated} existing configs`);
  }
  return true;
}

export async function syncLanguageConfigsOnStartup() {
  try {
    await doSync();
  } catch {
    // Table may not exist yet (pre-migration). Schedule retries.
    let retries = 0;
    const retry = () => {
      setTimeout(async () => {
        retries++;
        try {
          await doSync();
        } catch {
          if (retries < MAX_RETRIES) retry();
        }
      }, RETRY_DELAY_MS);
    };
    retry();
  }
}
