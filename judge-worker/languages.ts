import { JUDGE_LANGUAGE_CONFIGS } from "../src/lib/judge/languages";

export { JUDGE_LANGUAGE_CONFIGS as LANGUAGE_CONFIGS };

export type LanguageConfig = (typeof JUDGE_LANGUAGE_CONFIGS)[keyof typeof JUDGE_LANGUAGE_CONFIGS];
