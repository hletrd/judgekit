import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Enforce next/image usage: upgrade the default "warn" to "error".
  {
    rules: {
      "@next/next/no-img-element": "error",
    },
  },
  {
    files: ["tests/**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "jsx-a11y/role-has-required-aria-props": "off",
    },
  },
  {
    files: ["scripts/**/*.{js,cjs,mjs}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/types/**/*.d.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: [
      "src/components/code/code-surface.tsx",
      "src/app/(dashboard)/dashboard/admin/languages/language-config-table.tsx",
      "src/app/(dashboard)/dashboard/admin/plugins/[id]/plugin-config-client.tsx",
      "src/components/contest/contest-quick-stats.tsx",
      "src/components/exam/countdown-timer.tsx",
      "src/components/lecture/lecture-toolbar.tsx",
      "src/hooks/use-submission-polling.ts",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/purity": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: [
      "src/app/api/v1/submissions/[id]/events/route.ts",
      "src/lib/db/export.ts",
      "src/lib/db/import.ts",
      "src/lib/db/migrate.ts",
      "src/lib/plugins/chat-widget/providers.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    ".sisyphus/**",
    "static-site/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
