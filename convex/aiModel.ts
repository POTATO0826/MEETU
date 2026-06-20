"use node";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export type ChatModel = ReturnType<
  ReturnType<typeof createOpenAICompatible>["chatModel"]
>;

export function buildChatModel(context: string): ChatModel {
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    const openai = createOpenAICompatible({
      name: "openai",
      apiKey: openAiKey,
      baseURL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    });
    return openai.chatModel(process.env.OPENAI_MODEL ?? "gpt-4.1-mini");
  }

  const kimi = createOpenAICompatible({
    name: "kimi",
    apiKey: requiredEnv("KIMI_API_KEY", context),
    baseURL: process.env.KIMI_BASE_URL ?? "https://api.moonshot.ai/v1",
  });
  return kimi.chatModel(process.env.KIMI_MODEL ?? "kimi-k2.6");
}

export function activeModelLabel(): string {
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  }
  return process.env.KIMI_MODEL ?? "kimi-k2.6";
}

function requiredEnv(name: string, context: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required for ${context}. Set OPENAI_API_KEY to use OpenAI instead.`,
    );
  }
  return value;
}
