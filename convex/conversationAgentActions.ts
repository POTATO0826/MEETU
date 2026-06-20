"use node";

import { generateText, stepCountIs, tool } from "ai";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";
import MemoryClient from "mem0ai";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { activeModelLabel, buildChatModel } from "./aiModel";

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
  client: ClientSnapshot | null;
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
  status: "New" | "Contacted" | "Qualified" | "Proposal" | "Converted";
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

type ClientSnapshot = {
  _id: Id<"clients">;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Onboarding" | "Review due";
  clientSince: string;
  serviceTopics: LeadSnapshot["serviceInterest"][];
  situation: string;
  whyApproached: string;
  notes: string[];
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

const convertLeadToClient = makeFunctionReference<
  "mutation",
  {
    leadId: Id<"leads">;
    confidence: number;
    rationale: string;
  },
  {
    converted: boolean;
    reason?: string;
    clientId?: Id<"clients">;
    action?: string;
  }
>("conversationAgent:convertLeadToClient");

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

const upsertMeetingFromConversation = makeFunctionReference<
  "mutation",
  MeetingInput & {
    conversationId: Id<"whatsappConversations">;
    leadId?: Id<"leads">;
    clientId?: Id<"clients">;
    confidence: number;
    rationale: string;
  },
  { updated: boolean; reason?: string; meetingId?: Id<"meetings">; action?: string }
>("conversationAgent:upsertMeetingFromConversation");

const storeClientActivity = makeFunctionReference<
  "mutation",
  ClientActivityInput & {
    conversationId: Id<"whatsappConversations">;
    messageId?: Id<"whatsappMessages">;
  },
  {
    stored: boolean;
    reason?: string;
    activityId?: Id<"clientActivities">;
  }
>("conversationAgent:storeClientActivity");

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
const meetingModeSchema = z.enum(["Video", "Phone", "In-person"]);
const meetingStatusSchema = z.enum([
  "Confirmed",
  "Tentative",
  "Completed",
  "Canceled",
]);
const clientActivityCategorySchema = z.enum([
  "Travel",
  "Family",
  "Work",
  "Health",
  "Milestone",
  "Availability",
]);
const clientActivityPrioritySchema = z.enum(["Upcoming", "Recent", "Watch"]);

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

const meetingInputSchema = z.object({
  title: z.string(),
  attendeeRole: z.string().optional(),
  start: z.string(),
  durationMinutes: z.number(),
  mode: meetingModeSchema,
  location: z.string(),
  status: meetingStatusSchema,
  topic: serviceInterestSchema,
  purpose: z.string(),
  agenda: z.array(z.string()),
});

const clientActivityInputSchema = z.object({
  clientId: z.string(),
  messageId: z.string().optional(),
  category: clientActivityCategorySchema,
  activity: z.string(),
  timeframe: z.string(),
  mentionedAt: z.string(),
  suggestedTouchpoint: z.string(),
  priority: clientActivityPrioritySchema,
  confidence: z.number(),
  rationale: z.string(),
});

type CreateLeadInput = z.infer<typeof createLeadInputSchema>;
type LeadProfilePatch = z.infer<typeof leadProfilePatchSchema>;
type MeetingInput = z.infer<typeof meetingInputSchema>;
type ClientActivityInput = {
  clientId: Id<"clients">;
  messageId?: Id<"whatsappMessages">;
  category: z.infer<typeof clientActivityCategorySchema>;
  activity: string;
  timeframe: string;
  mentionedAt: string;
  suggestedTouchpoint: string;
  priority: z.infer<typeof clientActivityPrioritySchema>;
  confidence: number;
  rationale: string;
};
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
      const model = buildChatModel("conversation analysis");
      const memories = await searchMemories(claimed.conversation.participantPhone);
      const facts: ExtractedFact[] = [];
      const actions: SuggestedAction[] = [];
      const result = await generateText({
        model,
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
          model: activeModelLabel(),
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
      description:
        "Find an existing lead by exact phone number. Use this before creating a new lead when the conversation is not already linked to a lead, or when you need to verify whether the WhatsApp participant already exists in the lead pipeline.",
      inputSchema: z.object({ phone: z.string() }),
      execute: async ({ phone }) => {
        return await ctx.runQuery(findLeadByPhone, { phone });
      },
    }),
    createLeadFromConversation: tool({
      description:
        "Create a lead for this WhatsApp conversation. Use this when there is no linked lead/client and the sender appears to be a prospective client or is asking for financial-advisor help. Do not use if an existing lead or client is already linked or can be found by phone.",
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
        "Update stable lead profile fields such as name, email, phone, location, occupation, age, service interest, portfolio estimate, situation, or reason for reaching out. Use only when the participant clearly states or confirms the information. Do not guess, infer demographics, or overwrite known fields from vague context.",
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
        "Move a lead through the active pipeline stages: New, Contacted, Qualified, or Proposal. Use when the newest conversation clearly supports a pipeline change, such as a first reply, qualification details, or proposal discussion. Do not use this for client conversion; use convertLeadToClient when the lead has become a client.",
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
    convertLeadToClient: tool({
      description:
        "Convert an existing lead into a client profile. Use this tool whenever the conversation clearly indicates the lead has become a client, including accepted proposal, signed-up language, onboarding agreement, or an advisor message confirming the person is being onboarded/accepted as a client. Do not use for ordinary interest, a scheduled meeting, or vague encouragement.",
      inputSchema: z.object({
        leadId: z.string(),
        confidence: z.number(),
        rationale: z.string(),
      }),
      execute: async ({ leadId, confidence, rationale }) => {
        actions.push({
          type: "UpdateClient",
          title: "Converted lead to client",
          rationale,
          confidence,
        });
        return await ctx.runMutation(convertLeadToClient, {
          leadId: leadId as Id<"leads">,
          confidence,
          rationale,
        });
      },
    }),
    appendLeadNote: tool({
      description:
        "Append a concise advisor note to the lead. Use for useful qualitative context that should be visible to the advisor, such as preferences, constraints, stated goals, missing information, meeting preferences, or important conversation milestones. Do not duplicate existing notes or store trivial chat acknowledgements.",
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
        "Add a dated timeline event to the lead. Use for meaningful milestones such as lead creation, qualification, meeting confirmation, proposal sent, onboarding, or other date-specific events. Do not use for ordinary back-and-forth messages or facts that are better stored as notes.",
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
        "Create an advisor follow-up task tied to a lead. Use when the conversation creates a future action for the advisor, such as sending documents, following up on missing details, confirming a time/location, or checking back on a deadline. Do not use for actions already completed in the conversation.",
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
    upsertMeetingFromConversation: tool({
      description:
        "Create or update a meeting in the schedule. Use only when the conversation includes a clear meeting date, time, participant acceptance, meeting mode, and enough location/link/phone context for the advisor to act. If the participant only expresses preference or interest without accepting a specific slot, create a follow-up task instead.",
      inputSchema: meetingInputSchema.extend({
        leadId: z.string().optional(),
        clientId: z.string().optional(),
        confidence: z.number(),
        rationale: z.string(),
      }),
      execute: async ({
        leadId,
        clientId,
        confidence,
        rationale,
        ...meeting
      }) => {
        facts.push({
          target: "Meeting",
          field: "start",
          value: meeting.start,
          confidence,
        });
        actions.push({
          type: "ScheduleMeeting",
          title: meeting.title,
          rationale,
          confidence,
        });
        return await ctx.runMutation(upsertMeetingFromConversation, {
          conversationId: claimed.conversation._id,
          leadId: leadId as Id<"leads"> | undefined,
          clientId: clientId as Id<"clients"> | undefined,
          confidence,
          rationale,
          ...meeting,
        });
      },
    }),
    storeMemoryFact: tool({
      description:
        "Store a durable client memory in Mem0. Use for stable facts that should help future conversations, such as goals, preferences, constraints, language, location, family context, risk tolerance, or client status. Do not use this for relationship activity/life updates that should appear on the Activity page; use storeClientActivityMemory for those. Do not store advisor names as client nicknames, transient scheduling chatter, or facts from outbound advisor identity metadata.",
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
    storeClientActivityMemory: tool({
      description:
        "Store client activity for relationship maintenance in Convex and Mem0. Use when a linked client mentions a personal/professional life update, upcoming plan, recent event, availability constraint, milestone, health/family/work/travel context, or other human context the advisor should remember and may follow up on. Use only for facts about the client, not the advisor. Do not use for generic greetings, trivial small talk, vague feelings, ordinary scheduling logistics, or lead-only prospects without a clientId.",
      inputSchema: clientActivityInputSchema,
      execute: async ({
        clientId,
        messageId,
        category,
        activity,
        timeframe,
        mentionedAt,
        suggestedTouchpoint,
        priority,
        confidence,
        rationale,
      }) => {
        facts.push({
          target: "Profile",
          field: `client_activity:${category}`,
          value: `${activity} (${timeframe})`,
          confidence,
        });
        actions.push({
          type: "UpdateClient",
          title: "Stored client activity",
          rationale,
          confidence,
        });
        const result = await ctx.runMutation(storeClientActivity, {
          conversationId: claimed.conversation._id,
          clientId: clientId as Id<"clients">,
          messageId: messageId as Id<"whatsappMessages"> | undefined,
          category,
          activity,
          timeframe,
          mentionedAt,
          suggestedTouchpoint,
          priority,
          confidence,
          rationale,
        });
        if (result.stored) {
          await addMemory(
            claimed.conversation.participantPhone,
            `Client activity: ${activity}. Timeframe: ${timeframe}. Suggested touchpoint: ${suggestedTouchpoint}`,
            {
              category: "client_activity",
              activityCategory: category,
              priority,
              confidence,
              conversationId: claimed.conversation._id,
              clientId,
              activityId: result.activityId,
            },
          );
        }
        return result;
      },
    }),
  };
}

function buildSystemPrompt() {
  return [
    "You are an assistant for one financial advisor using WhatsApp with leads.",
    "Analyze only the provided conversation context and existing lead/client state.",
    "Use tools to create or update Convex records; do not claim an update happened unless a tool succeeds.",
    "The newest pending messages are the reason you were called. Evaluate them first, then use prior messages only as context.",
    "Be conservative. Do not infer exact age, portfolio, meeting date, or pipeline status from vague language.",
    "Lead-to-client conversion rule: if a linked lead has no linked client and the newest messages clearly show onboarding, accepted proposal, signed-up language, or advisor confirmation that the person is being onboarded/accepted as a client, you must call convertLeadToClient.",
    "Advisor outbound messages are authoritative business state. If the advisor tells the contact they are now a client, will be onboarded as a client, or are accepted as a client, convert the lead even if the client did not say the exact words.",
    "Do not merely summarize a clear client-conversion event. Call convertLeadToClient first, then summarize the completed update.",
    "Do not convert from vague encouragement, a scheduled meeting, or ordinary interest alone.",
    "Only schedule or update a meeting when the conversation includes a specific date/time and clear acceptance in the same context.",
    "When scheduling, convert the meeting start to an ISO datetime. The advisor is in Asia/Kuala_Lumpur unless context says otherwise.",
    "If no lead exists and the sender appears to be a prospective client, create a lead.",
    "If a linked client exists, treat the person as a client and avoid lead-only status changes.",
    "Store durable client facts in Mem0 with storeMemoryFact.",
    "For client relationship activity, use storeClientActivityMemory instead of generic memory. This includes life events, upcoming plans, recent events, family/work/travel/health updates, milestones, and availability context that could help the advisor maintain the relationship.",
    "Only store client activity when there is a linked clientId. Do not store advisor-side activity or outbound sender identity as client activity.",
    "Do not store generic greetings, trivial small talk, or ordinary scheduling logistics as client activity.",
    "Return a short operational summary for the advisor after tool use.",
  ].join("\n");
}

function buildUserPrompt(claimed: NonNullable<ClaimedAnalysis>, memories: string[]) {
  const conversation = claimed.conversation;
  const messages = formatMessages(claimed.recentMessages, conversation);
  const pendingMessages = formatMessages(
    claimed.recentMessages.filter((message) =>
      claimed.pendingMessageIds.includes(message._id),
    ),
    conversation,
  );

  return [
    `Current time: ${new Date().toISOString()} (advisor timezone: Asia/Kuala_Lumpur)`,
    `Participant phone: ${conversation.participantPhone}`,
    `Participant name: ${conversation.participantName ?? "Unknown"}`,
    `Linked lead: ${claimed.lead ? JSON.stringify(claimed.lead) : "None"}`,
    `Linked client: ${claimed.client ? JSON.stringify(claimed.client) : "None"}`,
    `Relevant memories: ${memories.length > 0 ? memories.join(" | ") : "None"}`,
    "Newest pending messages to analyze:",
    pendingMessages || "None",
    "Recent WhatsApp messages:",
    messages,
  ].join("\n\n");
}

function formatMessages(
  messages: MessageSnapshot[],
  conversation: NonNullable<ClaimedAnalysis>["conversation"],
) {
  return messages
    .map((message) => {
      const speaker =
        message.direction === "Inbound"
          ? conversation.participantName ?? conversation.participantPhone
          : "Advisor";
      return `[${message.receivedAt}] ${speaker}: ${message.body}`;
    })
    .join("\n");
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
      userId: memoryUserId(phone),
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
