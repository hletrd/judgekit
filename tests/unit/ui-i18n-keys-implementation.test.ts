import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { ALL_CAPABILITIES, CAPABILITY_GROUPS } from "@/lib/capabilities/types";
import { buildStatusLabels } from "@/lib/judge/status-labels";

type Messages = Record<string, unknown>;

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

function walk(dir: string, exts: Set<string>, acc: string[] = []): string[] {
  for (const entry of readdirSync(join(process.cwd(), dir))) {
    const relativePath = join(dir, entry);
    const fullPath = join(process.cwd(), relativePath);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      walk(relativePath, exts, acc);
      continue;
    }

    const extension = relativePath.split(".").pop() ?? "";
    if (exts.has(extension)) {
      acc.push(relativePath);
    }
  }

  return acc;
}

function getAtPath(messages: Messages, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[part];
  }, messages);
}

describe("UI i18n key coverage", () => {
  it("keeps literal translation keys used by app/components present in both en and ko bundles", () => {
    const en = JSON.parse(read("messages/en.json")) as Messages;
    const ko = JSON.parse(read("messages/ko.json")) as Messages;
    const uiFiles = [
      ...walk("src/app", new Set(["ts", "tsx"])),
      ...walk("src/components", new Set(["ts", "tsx"])),
    ];

    const namespacePattern =
      /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\("([^"]+)"\)/g;
    const keyCallPattern = /(?<![A-Za-z0-9_])(\w+)\("([A-Za-z0-9_.-]+)"/g;

    /**
     * Strip comments before pattern-matching so JSDoc @example blocks don't
     * register fake translation calls (e.g. contest-status-styles.ts has an
     * example that aliases `t` to a different namespace inside a comment).
     */
    function stripComments(src: string): string {
      return src
        // Remove block comments (incl. JSDoc).
        .replace(/\/\*[\s\S]*?\*\//g, "")
        // Remove single-line comments.
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
    }

    const missing: string[] = [];

    for (const file of uiFiles) {
      const source = stripComments(read(file));
      const namespaces = new Map<string, string>();

      for (const match of source.matchAll(namespacePattern)) {
        namespaces.set(match[1], match[2]);
      }

      for (const match of source.matchAll(keyCallPattern)) {
        const helperName = match[1];
        const key = match[2];
        const namespace = namespaces.get(helperName);
        if (!namespace) continue;

        const fullKey = `${namespace}.${key}`;
        for (const [lang, messages] of [
          ["en", en],
          ["ko", ko],
        ] as const) {
          if (getAtPath(messages, fullKey) === undefined) {
            missing.push(`${lang}:${file}:${fullKey}`);
          }
        }
      }
    }

    expect(missing).toEqual([]);
  });

  /**
   * The literal scan above cannot see keys built from a template literal
   * (`t(`status.${submission.status}`)`), which is how the TLE label went
   * missing: the DB status is `time_limit_exceeded` but the bundles only
   * carry `status.time_limit`. These cases pin the dynamic key sources.
   */
  it("resolves every submission status through buildStatusLabels to a real key", () => {
    const en = JSON.parse(read("messages/en.json")) as Messages;
    const ko = JSON.parse(read("messages/ko.json")) as Messages;

    const statusSource = read("src/lib/submissions/status.ts");
    const union = statusSource.match(/export type SubmissionStatus = ([^;]+);/)?.[1] ?? "";
    const statuses = [...union.matchAll(/"([a-z_]+)"/g)].map(match => match[1]);
    expect(statuses.length).toBeGreaterThan(0);

    const usedKeys: string[] = [];
    const labels = buildStatusLabels(key => {
      usedKeys.push(key);
      return key;
    });

    const missing: string[] = [];
    for (const status of statuses) {
      if (labels[status] === undefined) {
        missing.push(`buildStatusLabels:${status}`);
      }
    }
    for (const key of usedKeys) {
      for (const [lang, messages] of [["en", en], ["ko", ko]] as const) {
        if (getAtPath(messages, `submissions.${key}`) === undefined) {
          missing.push(`${lang}:submissions.${key}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("keeps a label for every capability group and capability", () => {
    const en = JSON.parse(read("messages/en.json")) as Messages;
    const ko = JSON.parse(read("messages/ko.json")) as Messages;

    const keys = [
      // capability-matrix.tsx renders `t(`groups.${groupKey}`)`, so the
      // message key must match the CAPABILITY_GROUPS object key, not labelKey.
      ...Object.keys(CAPABILITY_GROUPS).map(group => `capabilities.groups.${group}`),
      ...ALL_CAPABILITIES.map(capability => `capabilities.items.${capability}`),
    ];

    const missing: string[] = [];
    for (const key of keys) {
      for (const [lang, messages] of [["en", en], ["ko", ko]] as const) {
        if (getAtPath(messages, key) === undefined) {
          missing.push(`${lang}:${key}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("keeps a message for every error code the server actions hand back to t()", () => {
    const en = JSON.parse(read("messages/en.json")) as Messages;
    const ko = JSON.parse(read("messages/ko.json")) as Messages;

    // Actions whose `error` code is passed straight into t() by their caller.
    const actionNamespaces: Record<string, string> = {
      "change-password.ts": "changePassword",
      "public-signup.ts": "auth",
      "tag-management.ts": "admin.tags",
      "update-profile.ts": "profile",
      "user-management.ts": "admin.users",
    };

    const missing: string[] = [];
    for (const [file, namespace] of Object.entries(actionNamespaces)) {
      const source = read(join("src/lib/actions", file));
      const codes = new Set([...source.matchAll(/error:\s*"([^"]+)"/g)].map(match => match[1]));
      expect(codes.size).toBeGreaterThan(0);

      for (const code of codes) {
        for (const [lang, messages] of [["en", en], ["ko", ko]] as const) {
          if (getAtPath(messages, `${namespace}.${code}`) === undefined) {
            missing.push(`${lang}:${file}:${namespace}.${code}`);
          }
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("keeps a message for every code in a client-side known-error whitelist", () => {
    const en = JSON.parse(read("messages/en.json")) as Messages;
    const ko = JSON.parse(read("messages/ko.json")) as Messages;

    // Callers that filter an API error code through a Set before handing it to
    // t() — the Set is the contract, so every member needs a message.
    const whitelists: { file: string; setName: string; namespace: string }[] = [
      {
        file: "src/app/(dashboard)/dashboard/admin/settings/database-backup-restore.tsx",
        setName: "KNOWN_BACKUP_ERRORS",
        namespace: "admin.settings",
      },
      {
        file: "src/app/(public)/problem-sets/_components/problem-set-form.tsx",
        setName: "KNOWN_SUBMIT_ERRORS",
        namespace: "problemSets",
      },
      {
        file: "src/components/code/compiler-client.tsx",
        setName: "knownErrorKeys",
        namespace: "compiler",
      },
    ];

    const missing: string[] = [];
    for (const { file, setName, namespace } of whitelists) {
      const source = read(file);
      const start = source.indexOf(setName);
      expect(start).toBeGreaterThan(-1);
      const block = source.slice(start, source.indexOf("]", start));
      const codes = [...block.matchAll(/"([A-Za-z]+)"/g)].map(match => match[1]);
      expect(codes.length).toBeGreaterThan(0);

      for (const code of codes) {
        for (const [lang, messages] of [["en", en], ["ko", ko]] as const) {
          if (getAtPath(messages, `${namespace}.${code}`) === undefined) {
            missing.push(`${lang}:${setName}:${namespace}.${code}`);
          }
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it("keeps a nav label for every breadcrumb segment mapping", () => {
    const en = JSON.parse(read("messages/en.json")) as Messages;
    const ko = JSON.parse(read("messages/ko.json")) as Messages;

    const source = read("src/components/layout/breadcrumb.tsx");
    const start = source.indexOf("SEGMENT_LABEL_MAP");
    const block = source.slice(start, source.indexOf("};", start));
    const keys = [...block.matchAll(/:\s*"([A-Za-z]+)"/g)].map(match => match[1]);
    expect(keys.length).toBeGreaterThan(0);

    const missing: string[] = [];
    for (const key of keys) {
      for (const [lang, messages] of [["en", en], ["ko", ko]] as const) {
        if (getAtPath(messages, `nav.${key}`) === undefined) {
          missing.push(`${lang}:nav.${key}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
