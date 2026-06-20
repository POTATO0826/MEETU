import { v } from "convex/values";
import { query } from "./_generated/server";

export const conversationByPhone = query({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const advisors = await ctx.db.query("advisors").take(10);
    const conversations = [];
    for (const advisor of advisors) {
      const conversation = await ctx.db
        .query("whatsappConversations")
        .withIndex("by_advisor_participant", (q) =>
          q.eq("advisorId", advisor._id).eq("participantPhone", args.phone),
        )
        .unique();
      if (conversation) conversations.push(conversation);
    }

    const details = [];
    for (const conversation of conversations) {
      const messages = await ctx.db
        .query("whatsappMessages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .take(100);
      const analyses = await ctx.db
        .query("messageAnalyses")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .take(100);
      const events = await ctx.db
        .query("agentEvents")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .take(20);

      details.push({
        conversation,
        messages: messages.sort((a, b) =>
          a.receivedAt.localeCompare(b.receivedAt),
        ),
        analyses,
        events,
      });
    }

    const lead = await ctx.db
      .query("leads")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();
    const client = await ctx.db
      .query("clients")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();

    return { lead, client, conversations: details };
  },
});

export const latestConversationByPhone = query({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const advisors = await ctx.db.query("advisors").take(10);
    for (const advisor of advisors) {
      const conversation = await ctx.db
        .query("whatsappConversations")
        .withIndex("by_advisor_participant", (q) =>
          q.eq("advisorId", advisor._id).eq("participantPhone", args.phone),
        )
        .unique();
      if (!conversation) continue;

      const messages = await ctx.db
        .query("whatsappMessages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .take(100);
      const analyses = await ctx.db
        .query("messageAnalyses")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .take(100);
      const lead = conversation.leadId
        ? await ctx.db.get(conversation.leadId)
        : null;
      const client = conversation.clientId
        ? await ctx.db.get(conversation.clientId)
        : null;

      return {
        conversation,
        lead,
        client,
        latestMessages: messages
          .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
          .slice(0, 6),
        latestAnalyses: analyses
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 6),
      };
    }

    return null;
  },
});
