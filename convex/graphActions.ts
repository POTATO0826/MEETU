"use node";

import MemoryClient from "mem0ai";
import { generateText } from "ai";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildChatModel } from "./aiModel";

// ---------------------------------------------------------------------------
// Side-panel intelligence for the knowledge graph (Mem0 + OpenAI/KIMI).
// All three actions degrade gracefully (empty results / friendly text) when a
// node has no client context or when the relevant API key is missing.
// ---------------------------------------------------------------------------

export const relatedMemories = action({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args): Promise<{ memories: string[] }> => {
    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) return { memories: [] };

    const contact = await ctx.runQuery(internal.graph.clientContact, {
      clientId: args.clientId,
    });
    if (!contact) return { memories: [] };

    try {
      const mem0 = new MemoryClient({ apiKey });
      const response = await mem0.getAll({
        filters: { user_id: memoryUserId(contact.phone) },
        page: 1,
        pageSize: 12,
      });
      const raw = response as unknown;
      const results: Array<{ memory?: string }> = Array.isArray(raw)
        ? raw
        : ((raw as { results?: Array<{ memory?: string }> }).results ?? []);
      const memories = results
        .map((m) => m.memory)
        .filter((m): m is string => Boolean(m));
      return { memories };
    } catch (error) {
      console.warn("[graph] Mem0 getAll failed", error);
      return { memories: [] };
    }
  },
});

export const addMemory = action({
  args: { clientId: v.id("clients"), text: v.string() },
  handler: async (ctx, args): Promise<{ ok: boolean }> => {
    const text = args.text.trim();
    if (!text) return { ok: false };

    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) return { ok: false };

    const contact = await ctx.runQuery(internal.graph.clientContact, {
      clientId: args.clientId,
    });
    if (!contact) return { ok: false };

    try {
      const mem0 = new MemoryClient({ apiKey });
      await mem0.add([{ role: "user", content: text }], {
        userId: memoryUserId(contact.phone),
        metadata: { source: "graph_manual" },
      });
      return { ok: true };
    } catch (error) {
      console.warn("[graph] Mem0 add failed", error);
      return { ok: false };
    }
  },
});

export const askAboutNode = action({
  args: {
    clientId: v.optional(v.id("clients")),
    nodeTitle: v.string(),
    nodeSummary: v.string(),
    question: v.string(),
  },
  handler: async (ctx, args): Promise<{ answer: string }> => {
    const question = args.question.trim();
    if (!question) return { answer: "" };

    let memories: string[] = [];
    if (args.clientId) {
      const apiKey = process.env.MEM0_API_KEY;
      const contact = await ctx.runQuery(internal.graph.clientContact, {
        clientId: args.clientId,
      });
      if (apiKey && contact) {
        try {
          const mem0 = new MemoryClient({ apiKey });
          const response = await mem0.search(question, {
            filters: { user_id: memoryUserId(contact.phone) },
            topK: 5,
          });
          memories = response.results
            .map((m) => m.memory)
            .filter((m): m is string => Boolean(m));
        } catch (error) {
          console.warn("[graph] Mem0 search failed", error);
        }
      }
    }

    const model = buildChatModel("the knowledge graph");
    const prompt = [
      "You are an assistant embedded in a financial advisor's knowledge graph.",
      "Answer the advisor's question about the selected node concisely and practically.",
      "",
      `Node: ${args.nodeTitle}`,
      args.nodeSummary ? `Context: ${args.nodeSummary}` : "",
      memories.length > 0
        ? `Known facts about this client:\n- ${memories.join("\n- ")}`
        : "",
      "",
      `Question: ${question}`,
      "",
      "Answer in 2-4 short sentences of clear, professional English. If you don't have enough information, say so and suggest what the advisor could check.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      // KIMI is a reasoning model and OpenAI models can also need room for a
      // helpful answer, so keep a generous token budget.
      const result = await generateText({
        model,
        prompt,
        maxOutputTokens: 4000,
      });
      const answer = result.text.trim();
      return {
        answer:
          answer ||
          "I couldn't generate an answer for that. Try rephrasing the question.",
      };
    } catch (error) {
      return {
        answer: `The AI request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  },
});

function memoryUserId(phone: string) {
  return `whatsapp:${phone}`;
}
