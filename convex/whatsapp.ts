import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

type ReceiveMessageArgs = {
  providerMessageId: string;
  direction: "Inbound" | "Outbound";
  fromPhone: string;
  toPhone: string;
  senderName?: string;
  body: string;
  receivedAt: string;
  rawPayload: unknown;
};

const analyzeConversation = makeFunctionReference<
  "action",
  { conversationId: Id<"whatsappConversations"> },
  null
>("conversationAgentActions:analyzeConversation");

export const listPendingMessages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("whatsappMessages")
      .withIndex("by_analysis_status", (q) => q.eq("analysisStatus", "Pending"))
      .take(50);
  },
});

export const receiveMessage = mutation({
  args: {
    advisorId: v.id("advisors"),
    providerMessageId: v.string(),
    direction: v.union(v.literal("Inbound"), v.literal("Outbound")),
    fromPhone: v.string(),
    toPhone: v.string(),
    senderName: v.optional(v.string()),
    body: v.string(),
    receivedAt: v.string(),
    rawPayload: v.any(),
  },
  handler: async (ctx, args) => {
    return await receiveMessageForAdvisor(ctx, args.advisorId, args);
  },
});

export const receiveMessageForMvpAdvisor = mutation({
  args: {
    providerMessageId: v.string(),
    direction: v.union(v.literal("Inbound"), v.literal("Outbound")),
    fromPhone: v.string(),
    toPhone: v.string(),
    senderName: v.optional(v.string()),
    body: v.string(),
    receivedAt: v.string(),
    rawPayload: v.any(),
  },
  handler: async (ctx, args) => {
    const advisorId = await getOrCreateMvpAdvisor(ctx);
    return await receiveMessageForAdvisor(ctx, advisorId, args);
  },
});

async function getOrCreateMvpAdvisor(ctx: MutationCtx) {
  const existing = await ctx.db
    .query("advisors")
    .filter((q) => q.eq(q.field("name"), "MVP Advisor"))
    .unique();

  if (existing) return existing._id;

  const timestamp = new Date().toISOString();
  return await ctx.db.insert("advisors", {
    name: "MVP Advisor",
    timezone: "Asia/Kuala_Lumpur",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function receiveMessageForAdvisor(
  ctx: MutationCtx,
  advisorId: Id<"advisors">,
  args: ReceiveMessageArgs,
) {
  const existing = await ctx.db
    .query("whatsappMessages")
    .withIndex("by_provider_message_id", (q) =>
      q.eq("providerMessageId", args.providerMessageId),
    )
    .unique();

  if (existing) {
    return { messageId: existing._id, conversationId: existing.conversationId };
  }

  const timestamp = new Date().toISOString();
  const participantPhone =
    args.direction === "Inbound" ? args.fromPhone : args.toPhone;
  const conversation = await ctx.db
    .query("whatsappConversations")
    .withIndex("by_advisor_participant", (q) =>
      q.eq("advisorId", advisorId).eq("participantPhone", participantPhone),
    )
    .unique();

  const conversationId =
    conversation?._id ??
    (await ctx.db.insert("whatsappConversations", {
      advisorId,
      participantPhone,
      status: "Open",
      lastMessageAt: args.receivedAt,
      analysisStatus: "Queued",
      analysisRequestedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(args.senderName ? { participantName: args.senderName } : {}),
    }));

  await ctx.db.patch(conversationId, {
    lastMessageAt: args.receivedAt,
    analysisStatus: "Queued",
    analysisRequestedAt: timestamp,
    analysisError: "",
    updatedAt: timestamp,
    ...(args.senderName ? { participantName: args.senderName } : {}),
  });

  const messageId = await ctx.db.insert("whatsappMessages", {
    conversationId,
    advisorId,
    providerMessageId: args.providerMessageId,
    direction: args.direction,
    fromPhone: args.fromPhone,
    toPhone: args.toPhone,
    body: args.body,
    messageType: "Text",
    receivedAt: args.receivedAt,
    rawPayload: args.rawPayload,
    analysisStatus: "Pending",
    createdAt: timestamp,
    ...(args.senderName ? { senderName: args.senderName } : {}),
  });

  await ctx.scheduler.runAfter(0, analyzeConversation, { conversationId });

  return { messageId, conversationId };
}
