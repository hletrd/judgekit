import { resolveCapabilities } from "@/lib/capabilities/cache";

export async function canModerateDiscussions(role: string): Promise<boolean> {
  const capabilities = await resolveCapabilities(role);
  return capabilities.has("community.moderate");
}
