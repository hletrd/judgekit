import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("recruiting invitations panel account-password reset", () => {
  it("lets admins rotate the recruiting account password for redeemed candidates", () => {
    const source = read("src/components/contest/recruiting-invitations-panel.tsx");

    expect(source).toContain('handleResetAccountPassword(invitation: Invitation)');
    expect(source).toContain('JSON.stringify({ resetAccountPassword: true })');
    expect(source).toContain('setRevealedTemporaryPassword({ candidateName: invitation.candidateName, password });');
    expect(source).toContain('title={t("resetAccountPassword")}');
  });
});
