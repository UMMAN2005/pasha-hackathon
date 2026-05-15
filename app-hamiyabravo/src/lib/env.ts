import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_PASSWORD: z.string().min(32),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ANTHROPIC_MODEL: z.string().optional().default("claude-sonnet-4-6"),
  AI_ENABLED: z.string().optional().default("true"),
  DEMO_TODAY: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

let cached: z.infer<typeof schema> | null = null;

export function getEnv(): z.infer<typeof schema> {
  if (!cached) {
    cached = schema.parse(process.env);
  }
  return cached;
}

export const env = {
  get DATABASE_URL(): string {
    return getEnv().DATABASE_URL;
  },
  get SESSION_PASSWORD(): string {
    return getEnv().SESSION_PASSWORD;
  },
  get ANTHROPIC_API_KEY(): string {
    return getEnv().ANTHROPIC_API_KEY;
  },
  get ANTHROPIC_MODEL(): string {
    return getEnv().ANTHROPIC_MODEL;
  },
  get AI_ENABLED(): string {
    return getEnv().AI_ENABLED;
  },
  get DEMO_TODAY(): string {
    return getEnv().DEMO_TODAY;
  },
};
