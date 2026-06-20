import { v } from "convex/values";
import {
  mutationGeneric as mutation,
  queryGeneric as query,
} from "convex/server";
import type { GenericDataModel, GenericMutationCtx } from "convex/server";

type MutationCtx = GenericMutationCtx<GenericDataModel>;
type ReceiveMessageArgs = {
  providerMessageId: string;
  fromPhone: string;
  toPhone: string;
  senderName?: string;
  body: string;
  receivedAt: string;
  rawPayload: unknown;
};

export const listPendingMessages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("whatsappMessages")
      .withIndex("by_analysis_status", (q) => q.eq("analysisStatus", "Pending"))
      .collect();
  },
});

export const receiveMessage = mutation({
  args: {
    advisorId: v.id("advisors"),
    providerMessageId: v.string(),
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
  advisorId: unknown,
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
  const conversation = await ctx.db
    .query("whatsappConversations")
    .filter((q) =>
      q.and(
        q.eq(q.field("advisorId"), advisorId as never),
        q.eq(q.field("participantPhone"), args.fromPhone),
      ),
    )
    .unique();

  const conversationId =
    conversation?._id ??
    (await ctx.db.insert("whatsappConversations", {
      advisorId,
      participantPhone: args.fromPhone,
      status: "Open",
      lastMessageAt: args.receivedAt,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(args.senderName ? { participantName: args.senderName } : {}),
    } as never));

  await ctx.db.patch(conversationId as never, {
    lastMessageAt: args.receivedAt,
    updatedAt: timestamp,
    ...(args.senderName ? { participantName: args.senderName } : {}),
  });

  const messageId = await ctx.db.insert("whatsappMessages", {
    conversationId,
    advisorId,
    providerMessageId: args.providerMessageId,
    direction: "Inbound",
    fromPhone: args.fromPhone,
    toPhone: args.toPhone,
    body: args.body,
    messageType: "Text",
    receivedAt: args.receivedAt,
    rawPayload: args.rawPayload,
    analysisStatus: "Pending",
    createdAt: timestamp,
    ...(args.senderName ? { senderName: args.senderName } : {}),
  } as never);

  return { messageId, conversationId };
}
