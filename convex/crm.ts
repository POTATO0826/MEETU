import { v } from "convex/values";
import { queryGeneric as query } from "convex/server";

const leadStatus = v.union(
  v.literal("New"),
  v.literal("Contacted"),
  v.literal("Qualified"),
  v.literal("Proposal"),
);

const clientStatus = v.union(
  v.literal("Active"),
  v.literal("Onboarding"),
  v.literal("Review due"),
);

export const listLeads = query({
  args: {
    status: v.optional(leadStatus),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("leads")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .collect();
    }

    return await ctx.db.query("leads").collect();
  },
});

export const listClients = query({
  args: {
    status: v.optional(clientStatus),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("clients")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .collect();
    }

    return await ctx.db.query("clients").collect();
  },
});

export const getClientBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clients")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const listMeetings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("meetings").withIndex("by_start").collect();
  },
});
