import { getTranslations } from "next-intl/server";
import { getEnabledCompilerLanguages } from "@/lib/compiler/catalog";
import { CompilerClient } from "@/app/(dashboard)/dashboard/compiler/compiler-client";

export default async function PlaygroundPage() {
  const [tCompiler, tShell] = await Promise.all([
    getTranslations("compiler"),
    getTranslations("publicShell"),
  ]);
  const languages = await getEnabledCompilerLanguages();

  if (languages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="mb-2 text-2xl font-bold">
            {tCompiler("noLanguagesTitle", { defaultValue: "No Languages Available" })}
          </h1>
          <p className="text-muted-foreground">
            {tCompiler("noLanguagesDescription", {
              defaultValue: "Please enable at least one language in the settings.",
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <CompilerClient
      languages={languages}
      title={tShell("playground.liveTitle")}
      description={tShell("playground.liveDescription")}
      preferredLanguage={null}
      runEndpoint="/api/v1/playground/run"
    />
  );
}
