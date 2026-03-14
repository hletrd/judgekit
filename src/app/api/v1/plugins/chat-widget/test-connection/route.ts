import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

const requestSchema = z.object({
  provider: z.enum(["openai", "claude", "gemini"]),
  apiKey: z.string().min(1),
  model: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalidRequest" }, { status: 400 });
    }

    const { provider, apiKey, model } = parsed.data;

    // Make a minimal API call to test the connection
    let response: Response;

    switch (provider) {
      case "openai":
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 1,
          }),
        });
        break;

      case "claude":
        response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 1,
          }),
        });
        break;

      case "gemini": {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "Hi" }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        });
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ success: false, error: `${response.status}: ${text.slice(0, 200)}` });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Test connection error");
    return NextResponse.json({ success: false, error: String(error) });
  }
}
