"use node";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, stepCountIs, tool } from "ai";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";
import MemoryClient from "mem0ai";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";

type ClaimedAnalysis = {
  conversation: {
    _id: Id<"whatsappConversations">;
    advisorId: Id<"advisors">;
    participantPhone: string;
    participantName?: string;
    leadId?: Id<"leads">;
    clientId?: Id<"clients">;
  };
  lead: LeadSnapshot | null;
  recentMessages: MessageSnapshot[];
  pendingMessageIds: Id<"whatsappMessages">[];
} | null;

type LeadSnapshot = {
  _id: Id<"leads">;
  name: string;
  email: string;
  phone: string;
  location: string;
  occupation: string;
  age: number;
  status: "New" | "Contacted" | "Qualified" | "Proposal";
  serviceInterest:
    | "Retirement Planning"
    | "Investment Management"
    | "Insurance"
    | "Estate Planning"
    | "Tax Strategy"
    | "College Savings";
  estimatedPortfolio: number;
  situationTeaser: string;
  situation: string;
  whyApproached: string;
  notes: string[];
  timeline: Array<{ date: string; label: string }>;
};

type MessageSnapshot = {
  _id: Id<"whatsappMessages">;
  direction: "Inbound" | "Outbound";
  senderName?: string;
  body: string;
  receivedAt: string;
  analysisStatus: "Pending" | "Processing" | "Processed" | "Failed";
};

type CompletionResult = { hasMorePending: boolean };

type Sentiment = "Positive" | "Neutral" | "Negative" | "Urgent";

const claimConversationAnalysis = makeFunctionReference<
  "mutation",
  { conversationId: Id<"whatsappConversations"> },
  ClaimedAnalysis
>("conversationAgent:claimConversationAnalysis");

const findLeadByPhone = makeFunctionReference<
  "query",
  { phone: string },
  LeadSnapshot | null
>("conversationAgent:findLeadByPhone");

const createLeadFromConversation = makeFunctionReference<
  "mutation",
  CreateLeadInput & { conversationId: Id<"whatsappConversations"> },
  LeadSnapshot | null
>("conversationAgent:createLeadFromConversation");

const updateLeadProfile = makeFunctionReference<
  "mutation",
  {
    leadId: Id<"leads">;
    patch: LeadProfilePatch;
    confidence: number;
    rationale: string;
  },
  { updated: boolean; reason?: string }
>("conversationAgent:updateLeadProfile");

const updateLeadStatus = makeFunctionReference<
  "mutation",
  {
    leadId: Id<"leads">;
    status: LeadSnapshot["status"];
    confidence: number;
    rationale: string;
  },
  { updated: boolean; reason?: string }
>("conversationAgent:updateLeadStatus");

const appendLeadNote = makeFunctionReference<
  "mutation",
  { leadId: Id<"leads">; note: string; confidence: number },
  { updated: boolean; reason?: string }
>("conversationAgent:appendLeadNote");

const appendLeadTimelineEvent = makeFunctionReference<
  "mutation",
  { leadId: Id<"leads">; date: string; label: string; confidence: number },
  { updated: boolean; reason?: string }
>("conversationAgent:appendLeadTimelineEvent");

const createLeadFollowUpTask = makeFunctionReference<
  "mutation",
  {
    leadId: Id<"leads">;
    title: string;
    detail?: string;
    dueDate?: string;
  },
  Id<"advisorTasks">
>("conversationAgent:createLeadFollowUpTask");

const completeConversationAnalysis = makeFunctionReference<
  "mutation",
  {
    conversationId: Id<"whatsappConversations">;
    messageIds: Id<"whatsappMessages">[];
    summary: string;
    sentiment: Sentiment;
    extractedFacts: ExtractedFact[];
    suggestedActions: SuggestedAction[];
    model?: string;
  },
  CompletionResult
>("conversationAgent:completeConversationAnalysis");

const failConversationAnalysis = makeFunctionReference<
  "mutation",
  {
    conversationId: Id<"whatsappConversations">;
    messageIds: Id<"whatsappMessages">[];
    error: string;
  },
  null
>("conversationAgent:failConversationAnalysis");

const analyzeConversationRef = makeFunctionReference<
  "action",
  { conversationId: Id<"whatsappConversations"> },
  null
>("conversationAgentActions:analyzeConversation");

const serviceInterestSchema = z.enum([
  "Retirement Planning",
  "Investment Management",
  "Insurance",
  "Estate Planning",
  "Tax Strategy",
  "College Savings",
]);

const leadStatusSchema = z.enum(["New", "Contacted", "Qualified", "Proposal"]);

const createLeadInputSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  location: z.string().optional(),
  occupation: z.string().optional(),
  age: z.number().optional(),
  serviceInterest: serviceInterestSchema.optional(),
  estimatedPortfolio: z.number().optional(),
  situationTeaser: z.string().optional(),
  situation: z.string().optional(),
  whyApproached: z.string().optional(),
});

const leadProfilePatchSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  occupation: z.string().optional(),
  age: z.number().optional(),
  serviceInterest: serviceInterestSchema.optional(),
  estimatedPortfolio: z.number().optional(),
  situationTeaser: z.string().optional(),
  situation: z.string().optional(),
  whyApproached: z.string().optional(),
  lastContact: z.string().optional(),
});

type CreateLeadInput = z.infer<typeof createLeadInputSchema>;
type LeadProfilePatch = z.infer<typeof leadProfilePatchSchema>;
type ExtractedFact = {
  target: "Lead" | "Client" | "Meeting" | "Profile";
  field: string;
  value: string;
  confidence: number;
};
type SuggestedAction = {
  type:
    | "UpdateLead"
    | "UpdateClient"
    | "ScheduleMeeting"
    | "CreateTask"
    | "NoAction";
  title: string;
  rationale: string;
  confidence: number;
};

export const analyzeConversation = internalAction({
  args: { conversationId: v.id("whatsappConversations") },
  handler: async (ctx, args) => {
    const claimed: ClaimedAnalysis = await ctx.runMutation(
      claimConversationAnalysis,
      args,
    );
    if (!claimed) return null;

    try {
      const modelId = process.env.KIMI_MODEL ?? "kimi-k2.6";
      const kimi = createOpenAICompatible({
        name: "kimi",
        apiKey: requiredEnv("KIMI_API_KEY"),
        baseURL: process.env.KIMI_BASE_URL ?? "https://api.moonshot.ai/v1",
      });
      const memories = await searchMemories(claimed.conversation.participantPhone);
      const facts: ExtractedFact[] = [];
      const actions: SuggestedAction[] = [];

      const result = await generateText({
        model: kimi.chatModel(modelId),
        system: buildSystemPrompt(),
        prompt: buildUserPrompt(claimed, memories),
        tools: buildTools(ctx, claimed, facts, actions),
        stopWhen: stepCountIs(8),
        maxOutputTokens: 1400,
      });

      const completion: CompletionResult = await ctx.runMutation(
        completeConversationAnalysis,
        {
          conversationId: args.conversationId,
          messageIds: claimed.pendingMessageIds,
          summary: result.text.trim() || "Conversation analyzed.",
          sentiment: inferSentiment(result.text),
          extractedFacts: facts.slice(0, 20),
          suggestedActions: actions.slice(0, 20),
          model: modelId,
        },
      );

      if (completion.hasMorePending) {
        await ctx.scheduler.runAfter(0, analyzeConversationRef, args);
      }
      return null;
    } catch (error) {
      await ctx.runMutation(failConversationAnalysis, {
        conversationId: args.conversationId,
        messageIds: claimed.pendingMessageIds,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
});

function buildTools(
  ctx: ActionCtx,
  claimed: NonNullable<ClaimedAnalysis>,
  facts: ExtractedFact[],
  actions: SuggestedAction[],
) {
  return {
    findLeadByPhone: tool({
      description: "Find an existing lead by exact phone number.",
      inputSchema: z.object({ phone: z.string() }),
      execute: async ({ phone }) => {
        return await ctx.runQuery(findLeadByPhone, { phone });
      },
    }),
    createLeadFromConversation: tool({
      description:
        "Create a lead for this WhatsApp conversation when no matching lead exists.",
      inputSchema: createLeadInputSchema,
      execute: async (input) => {
        actions.push({
          type: "UpdateLead",
          title: "Created lead from WhatsApp conversation",
          rationale: "The conversation did not have a linked lead.",
          confidence: 0.9,
        });
        return await ctx.runMutation(createLeadFromConversation, {
          conversationId: claimed.conversation._id,
          ...input,
        });
      },
    }),
    updateLeadProfile: tool({
      description:
        "Update stable lead fields. Only use when the client clearly stated the information.",
      inputSchema: z.object({
        leadId: z.string(),
        patch: leadProfilePatchSchema,
        confidence: z.number(),
        rationale: z.string(),
      }),
      execute: async ({ leadId, patch, confidence, rationale }) => {
        for (const [field, value] of Object.entries(patch)) {
          if (value !== undefined) {
            facts.push({
              target: "Lead",
              field,
              value: String(value),
              confidence,
            });
          }
        }
        actions.push({
          type: "UpdateLead",
          title: "Updated lead profile",
          rationale,
          confidence,
        });
        return await ctx.runMutation(updateLeadProfile, {
          leadId: leadId as Id<"leads">,
          patch,
          confidence,
          rationale,
        });
      },
    }),
    updateLeadStatus: tool({
      description:
        "Move the lead pipeline status only when the conversation clearly supports it.",
      inputSchema: z.object({
        leadId: z.string(),
        status: leadStatusSchema,
        confidence: z.number(),
        rationale: z.string(),
      }),
      execute: async ({ leadId, status, confidence, rationale }) => {
        actions.push({
          type: "UpdateLead",
          title: `Set lead status to ${status}`,
          rationale,
          confidence,
        });
        return await ctx.runMutation(updateLeadStatus, {
          leadId: leadId as Id<"leads">,
          status,
          confidence,
          rationale,
        });
      },
    }),
    appendLeadNote: tool({
      description:
        "Append a concise advisor note with useful conversation context.",
      inputSchema: z.object({
        leadId: z.string(),
        note: z.string(),
        confidence: z.number(),
      }),
      execute: async ({ leadId, note, confidence }) => {
        facts.push({ target: "Lead", field: "note", value: note, confidence });
        return await ctx.runMutation(appendLeadNote, {
          leadId: leadId as Id<"leads">,
          note,
          confidence,
        });
      },
    }),
    appendLeadTimelineEvent: tool({
      description:
        "Add a dated timeline event for meaningful client intent or milestone.",
      inputSchema: z.object({
        leadId: z.string(),
        date: z.string(),
        label: z.string(),
        confidence: z.number(),
      }),
      execute: async ({ leadId, date, label, confidence }) => {
        actions.push({
          type: "UpdateLead",
          title: "Added lead timeline event",
          rationale: label,
          confidence,
        });
        return await ctx.runMutation(appendLeadTimelineEvent, {
          leadId: leadId as Id<"leads">,
          date,
          label,
          confidence,
        });
      },
    }),
    createLeadFollowUpTask: tool({
      description:
        "Create an advisor follow-up task when the advisor needs to act later.",
      inputSchema: z.object({
        leadId: z.string(),
        title: z.string(),
        detail: z.string().optional(),
        dueDate: z.string().optional(),
      }),
      execute: async ({ leadId, title, detail, dueDate }) => {
        actions.push({
          type: "CreateTask",
          title,
          rationale: detail ?? "Follow-up requested by conversation analysis.",
          confidence: 0.8,
        });
        return await ctx.runMutation(createLeadFollowUpTask, {
          leadId: leadId as Id<"leads">,
          title,
          detail,
          dueDate,
        });
      },
    }),
    storeMemoryFact: tool({
      description:
        "Store durable client facts in Mem0, such as preferences, goals, constraints, and context.",
      inputSchema: z.object({
        fact: z.string(),
        category: z.string(),
        confidence: z.number(),
      }),
      execute: async ({ fact, category, confidence }) => {
        facts.push({
          target: "Profile",
          field: category,
          value: fact,
          confidence,
        });
        await addMemory(claimed.conversation.participantPhone, fact, {
          category,
          confidence,
          conversationId: claimed.conversation._id,
        });
        return { stored: true };
      },
    }),
  };
}

function buildSystemPrompt() {
  return [
    "You are an assistant for one financial advisor using WhatsApp with leads.",
    "Analyze only the provided conversation context and existing lead state.",
    "Use tools to create or update Convex records; do not claim an update happened unless a tool succeeds.",
    "Be conservative. Do not infer exact age, portfolio, meeting date, or pipeline status from vague language.",
    "If no lead exists and the sender appears to be a prospective client, create a lead.",
    "Store durable client facts in Mem0 with storeMemoryFact.",
    "Return a short operational summary for the advisor after tool use.",
  ].join("\n");
}

function buildUserPrompt(claimed: NonNullable<ClaimedAnalysis>, memories: string[]) {
  const conversation = claimed.conversation;
  const messages = claimed.recentMessages
    .map((message) => {
      const speaker =
        message.direction === "Inbound"
          ? conversation.participantName ?? conversation.participantPhone
          : "Advisor";
      return `[${message.receivedAt}] ${speaker}: ${message.body}`;
    })
    .join("\n");

  return [
    `Participant phone: ${conversation.participantPhone}`,
    `Participant name: ${conversation.participantName ?? "Unknown"}`,
    `Linked lead: ${claimed.lead ? JSON.stringify(claimed.lead) : "None"}`,
    `Relevant memories: ${memories.length > 0 ? memories.join(" | ") : "None"}`,
    "Recent WhatsApp messages:",
    messages,
  ].join("\n\n");
}

async function searchMemories(phone: string) {
  const apiKey = process.env.MEM0_API_KEY;
  if (!apiKey) return [];
  try {
    const mem0 = new MemoryClient({ apiKey });
    const response = await mem0.search("financial advisor lead context", {
      filters: { user_id: memoryUserId(phone) },
      topK: 5,
    });
    return response.results
      .map((memory) => memory.memory)
      .filter((memory): memory is string => Boolean(memory));
  } catch (error) {
    console.warn("[conversation-agent] Mem0 search failed", error);
    return [];
  }
}

async function addMemory(
  phone: string,
  fact: string,
  metadata: Record<string, unknown>,
) {
  const apiKey = process.env.MEM0_API_KEY;
  if (!apiKey) return;
  try {
    const mem0 = new MemoryClient({ apiKey });
    await mem0.add([{ role: "user", content: fact }], {
      filters: { user_id: memoryUserId(phone) },
      metadata,
    });
  } catch (error) {
    console.warn("[conversation-agent] Mem0 add failed", error);
  }
}

function memoryUserId(phone: string) {
  return `whatsapp:${phone}`;
}

function inferSentiment(text: string): Sentiment {
  const lower = text.toLowerCase();
  if (lower.includes("urgent") || lower.includes("asap")) return "Urgent";
  if (lower.includes("concern") || lower.includes("problem")) return "Negative";
  if (lower.includes("interested") || lower.includes("confirmed")) {
    return "Positive";
  }
  return "Neutral";
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for conversation analysis`);
  return value;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
