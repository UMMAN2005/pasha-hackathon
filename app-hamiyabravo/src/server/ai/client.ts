import { anthropic } from "@ai-sdk/anthropic";

export function aiAvailable(): boolean {
  const enabled = process.env.AI_ENABLED === "true";
  const hasKey = (process.env.ANTHROPIC_API_KEY || "").length > 0;
  return enabled && hasKey;
}

export function getModel() {
  return anthropic(process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6");
}
