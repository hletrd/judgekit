import { describe, expect, it } from "vitest";
import {
  decryptPluginConfigForUse,
  encryptPluginSecret,
  preparePluginConfigForStorage,
  redactPluginConfigForAudit,
  redactPluginConfigForRead,
} from "@/lib/plugins/secrets";

process.env.AUTH_SECRET = "plugin-secret-test-key-material-32chars";

describe("plugin secret helpers", () => {
  it("encrypts secret fields before storage and preserves existing encrypted secrets on blank updates", () => {
    const existingSecret = encryptPluginSecret("existing-openai-key");

    const prepared = preparePluginConfigForStorage(
      "chat-widget",
      {
        provider: "openai",
        openaiApiKey: "",
        claudeApiKey: "",
        geminiApiKey: "new-gemini-key",
      },
      {
        openaiApiKey: existingSecret,
        claudeApiKey: "",
        geminiApiKey: "",
      }
    );

    expect(prepared.openaiApiKey).toBe(existingSecret);
    expect(prepared.claudeApiKey).toBe("");
    expect(typeof prepared.geminiApiKey).toBe("string");
    expect(String(prepared.geminiApiKey)).not.toBe("new-gemini-key");
  });

  it("redacts secrets for admin reads and restores them for runtime use", () => {
    const encrypted = encryptPluginSecret("live-secret");
    const storedConfig = {
      provider: "openai",
      openaiApiKey: encrypted,
      claudeApiKey: "",
      geminiApiKey: "",
    };

    const redacted = redactPluginConfigForRead("chat-widget", storedConfig);
    expect(redacted.openaiApiKey).toBe("");
    expect(redacted.openaiApiKeyConfigured).toBe(true);

    const decrypted = decryptPluginConfigForUse("chat-widget", storedConfig);
    expect(decrypted.openaiApiKey).toBe("live-secret");
  });

  it("redacts secret keys in audit payloads", () => {
    const audit = redactPluginConfigForAudit("chat-widget", {
      provider: "openai",
      openaiApiKey: "secret-1",
      claudeApiKey: "secret-2",
      assistantName: "Tutor",
    });

    expect(audit.openaiApiKey).toBe("[REDACTED]");
    expect(audit.claudeApiKey).toBe("[REDACTED]");
    expect(audit.assistantName).toBe("Tutor");
  });
});
