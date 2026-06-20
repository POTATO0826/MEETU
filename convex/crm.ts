import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const leadStatus = v.union(
  v.literal("New"),
  v.literal("Contacted"),
  v.literal("Qualified"),
  v.literal("Proposal"),
  v.literal("Converted"),
);

const activeLeadStatuses = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
] as const;

const clientStatus = v.union(
  v.literal("Active"),
  v.literal("Onboarding"),
  v.literal("Review due"),
);

const clientActivityPriority = v.union(
  v.literal("Upcoming"),
  v.literal("Recent"),
  v.literal("Watch"),
);

const storeManualLeadConversionMemory = makeFunctionReference<
  "action",
  {
    leadId: Id<"leads">;
    clientId: Id<"clients">;
    phone: string;
    name: string;
    convertedAt: string;
  },
  null
>("manualConversionActions:storeManualLeadConversionMemory");

export const listLeads = query({
  args: {
    status: v.optional(leadStatus),
  },
  handler: async (ctx, args) => {
    const status = args.status;
    if (status) {
      return await ctx.db
        .query("leads")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(100);
    }

    const leadsByStatus = await Promise.all(
      activeLeadStatuses.map((activeStatus) =>
        ctx.db
          .query("leads")
          .withIndex("by_status", (q) => q.eq("status", activeStatus))
          .take(100),
      ),
    );

    return leadsByStatus
      .flat()
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 100);
  },
});

export const listClients = query({
  args: {
    status: v.optional(clientStatus),
  },
  handler: async (ctx, args) => {
    const status = args.status;
    if (status) {
      return await ctx.db
        .query("clients")
        .withIndex("by_status", (q) => q.eq("status", status))
        .take(100);
    }

    return await ctx.db.query("clients").order("desc").take(100);
  },
});

export const convertLeadToClient = mutation({
  args: {
    leadId: v.id("leads"),
  },
  handler: async (ctx, args) => {
    const result = await convertLead(ctx, args.leadId, "manual_advisor_action");
    await ctx.scheduler.runAfter(0, storeManualLeadConversionMemory, {
      leadId: args.leadId,
      clientId: result.clientId,
      phone: result.phone,
      name: result.name,
      convertedAt: result.convertedAt,
    });
    return result;
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
    return await ctx.db.query("meetings").withIndex("by_start").take(100);
  },
});

export const listClientActivities = query({
  args: {
    priority: v.optional(clientActivityPriority),
  },
  handler: async (ctx, args) => {
    const priority = args.priority;
    const activities = priority
      ? await ctx.db
          .query("clientActivities")
          .withIndex("by_priority", (q) => q.eq("priority", priority))
          .order("desc")
          .take(100)
      : await ctx.db
          .query("clientActivities")
          .withIndex("by_mentioned_at")
          .order("desc")
          .take(100);

    const enriched = [];
    for (const activity of activities) {
      const client = await ctx.db.get(activity.clientId);
      enriched.push({
        ...activity,
        clientName: client?.name ?? "Unknown client",
        clientSlug: client?.slug ?? "",
      });
    }

    return enriched;
  },
});

async function convertLead(
  ctx: MutationCtx,
  leadId: Id<"leads">,
  source: "manual_advisor_action",
) {
  const lead = await ctx.db.get(leadId);
  if (!lead) throw new Error("Lead not found");

  let client = lead.clientId ? await ctx.db.get(lead.clientId) : null;
  if (!client) {
    client = await ctx.db
      .query("clients")
      .withIndex("by_phone", (q) => q.eq("phone", lead.phone))
      .unique();
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const advisor = lead.advisorId ? await ctx.db.get(lead.advisorId) : null;
  const clientId =
    client?._id ??
    (await ctx.db.insert("clients", {
      externalId: `lead-${lead._id}`,
      slug: `${slugify(lead.name)}-${lead._id.slice(-6)}`,
      name: lead.name,
      age: lead.age,
      occupation: lead.occupation,
      location: lead.location,
      email: lead.email,
      phone: lead.phone,
      status: "Onboarding",
      clientSince: today,
      advisorName: advisor?.name ?? "MVP Advisor",
      advisorId: lead.advisorId,
      cadence: "To be determined",
      nextReview: addDays(today, 90),
      dependents: [],
      aum: lead.estimatedPortfolio,
      netWorth: lead.estimatedPortfolio,
      riskTolerance: "Moderate",
      timeHorizon: "To be determined",
      accounts: [],
      allocation: [],
      goals: [
        {
          name: lead.serviceInterest,
          detail: lead.whyApproached || lead.situationTeaser,
        },
      ],
      serviceTopics: [lead.serviceInterest],
      description: lead.situationTeaser,
      situation: lead.situation,
      whyApproached: lead.whyApproached,
      notes: lead.notes,
      createdAt: now,
      updatedAt: now,
    }));

  const timelineEvent = {
    date: today,
    label: "Converted to client profile manually",
  };
  const hasConversionEvent = lead.timeline.some(
    (event) =>
      event.date === timelineEvent.date && event.label === timelineEvent.label,
  );
  await ctx.db.patch(lead._id, {
    clientId,
    status: "Converted",
    timeline: hasConversionEvent
      ? lead.timeline
      : [...lead.timeline, timelineEvent],
    updatedAt: now,
  });

  const conversations = await ctx.db
    .query("whatsappConversations")
    .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
    .take(100);
  for (const conversation of conversations) {
    await ctx.db.patch(conversation._id, { clientId, updatedAt: now });
  }

  const meetings = await ctx.db
    .query("meetings")
    .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
    .take(100);
  for (const meeting of meetings) {
    await ctx.db.patch(meeting._id, { clientId, updatedAt: now });
  }

  const tasks = await ctx.db
    .query("advisorTasks")
    .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
    .take(100);
  for (const task of tasks) {
    await ctx.db.patch(task._id, { clientId, updatedAt: now });
  }

  await ctx.db.insert("agentEvents", {
    type: "ManualLeadConversion",
    leadId: lead._id,
    clientId,
    conversationId: conversations[0]?._id,
    summary: `${lead.name} was manually converted from lead to client.`,
    metadata: {
      source,
      phone: lead.phone,
      previousStatus: lead.status,
      linkedExistingClient: Boolean(client),
    },
    createdAt: now,
  });

  return {
    converted: true,
    clientId,
    phone: lead.phone,
    name: lead.name,
    convertedAt: now,
    action: client ? "linked_existing_client" : "created_client",
  };
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "client";
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
