import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const repairConversationParticipantName = mutation({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db
      .query("leads")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();
    const client = await ctx.db
      .query("clients")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();
    const participantName = client?.name ?? lead?.name;
    if (!participantName) {
      return { updated: 0, reason: "no_lead_or_client_name" };
    }

    const advisors = await ctx.db.query("advisors").take(10);
    let updated = 0;
    const now = new Date().toISOString();
    for (const advisor of advisors) {
      const conversation = await ctx.db
        .query("whatsappConversations")
        .withIndex("by_advisor_participant", (q) =>
          q.eq("advisorId", advisor._id).eq("participantPhone", args.phone),
        )
        .unique();
      if (!conversation) continue;
      await ctx.db.patch(conversation._id, {
        participantName,
        updatedAt: now,
      });
      updated += 1;
    }

    return { updated, participantName };
  },
});
