"use node";

import MemoryClient from "mem0ai";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const storeManualLeadConversionMemory = internalAction({
  args: {
    leadId: v.id("leads"),
    clientId: v.id("clients"),
    phone: v.string(),
    name: v.string(),
    convertedAt: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.MEM0_API_KEY;
    if (!apiKey) return null;

    try {
      const mem0 = new MemoryClient({ apiKey });
      await mem0.add(
        [
          {
            role: "user",
            content: `${args.name} is now a client. The lead was manually converted by the advisor at ${args.convertedAt}.`,
          },
        ],
        {
          userId: `whatsapp:${args.phone}`,
          metadata: {
            category: "client_status",
            source: "manual_lead_conversion",
            leadId: args.leadId,
            clientId: args.clientId,
            convertedAt: args.convertedAt,
          },
        },
      );
    } catch (error) {
      console.warn("[manual-conversion] Mem0 add failed", error);
    }

    return null;
  },
});
