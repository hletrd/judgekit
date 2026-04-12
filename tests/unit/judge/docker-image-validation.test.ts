import { describe, expect, it } from "vitest";
import { isAllowedJudgeDockerImage, isLocalJudgeDockerImage } from "@/lib/judge/docker-image-validation";

describe("judge docker image validation", () => {
  it("allows local judge images and trusted-registry judge images", () => {
    expect(isAllowedJudgeDockerImage("judge-python:latest", [])).toBe(true);
    expect(
      isAllowedJudgeDockerImage("registry.example.com/team/judge-rust:1.0", [
        "registry.example.com/",
      ])
    ).toBe(true);
  });

  it("rejects arbitrary public images and untrusted registries", () => {
    expect(isAllowedJudgeDockerImage("alpine:3.18", [])).toBe(false);
    expect(isAllowedJudgeDockerImage("library/judge-python:latest", [])).toBe(false);
    expect(
      isAllowedJudgeDockerImage("evil.example.com/judge-python:latest", [
        "registry.example.com/",
      ])
    ).toBe(false);
  });

  it("allows only unqualified local judge images for local build actions", () => {
    expect(isLocalJudgeDockerImage("judge-python:latest")).toBe(true);
    expect(isLocalJudgeDockerImage("registry.example.com/team/judge-python:latest")).toBe(false);
    expect(isLocalJudgeDockerImage("alpine:3.18")).toBe(false);
  });
});
