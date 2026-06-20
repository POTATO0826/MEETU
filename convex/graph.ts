import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

// Internal: client contact lookup used by graphActions for Mem0 (memory) calls.
export const clientContact = internalQuery({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) return null;
    return { name: client.name, phone: client.phone };
  },
});
