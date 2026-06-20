import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const now = () => new Date().toISOString();

type SeedPerson = {
  externalId: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  location: string;
  occupation: string;
  age: number;
  interest: Doc<"leads">["serviceInterest"];
};

const seedPeople: SeedPerson[] = [
  {
    externalId: "seed-vince-loo",
    name: "Vince Loo",
    slug: "vince-loo-seed",
    email: "loovincent268@gmail.com",
    phone: "60123339001",
    location: "Malaysia",
    occupation: "Product designer",
    age: 21,
    interest: "Investment Management",
  },
  {
    externalId: "seed-jasmine-tan",
    name: "Jasmine Tan",
    slug: "jasmine-tan-seed",
    email: "jasmine.tan@example.com",
    phone: "60123339002",
    location: "Kuala Lumpur, Malaysia",
    occupation: "Marketing director",
    age: 34,
    interest: "Insurance",
  },
];

const seedLeads: SeedPerson[] = [
  {
    externalId: "seed-amar-rahman",
    name: "Amar Rahman",
    slug: "amar-rahman-seed",
    email: "amar.rahman@example.com",
    phone: "60123339003",
    location: "Selangor, Malaysia",
    occupation: "Software engineer",
    age: 29,
    interest: "Retirement Planning",
  },
  {
    externalId: "seed-mei-wong",
    name: "Mei Wong",
    slug: "mei-wong-seed",
    email: "mei.wong@example.com",
    phone: "60123339004",
    location: "Penang, Malaysia",
    occupation: "Business owner",
    age: 41,
    interest: "Tax Strategy",
  },
];

export const seedMockData = mutation({
  args: {
    advisorName: v.optional(v.string()),
    advisorTimezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const advisorId = await upsertAdvisor(ctx, {
      name: args.advisorName ?? "LeeSF",
      timezone: args.advisorTimezone ?? "Asia/Kuala_Lumpur",
    });

    const clientIds = new Map<string, Id<"clients">>();
    for (const person of seedPeople) {
      const clientId = await upsertClient(ctx, advisorId, person);
      clientIds.set(person.externalId, clientId);
    }

    const leadIds = new Map<string, Id<"leads">>();
    for (const person of seedLeads) {
      const leadId = await upsertLead(ctx, advisorId, person);
      leadIds.set(person.externalId, leadId);
    }

    const vinceConversationId = await upsertConversation(ctx, {
      advisorId,
      participantPhone: "60123339001",
      participantName: "Vince Loo",
      clientId: clientIds.get("seed-vince-loo"),
      lastMessageAt: "2026-06-20T05:42:00.000Z",
      analysisStatus: "Idle",
    });
    const jasmineConversationId = await upsertConversation(ctx, {
      advisorId,
      participantPhone: "60123339002",
      participantName: "Jasmine Tan",
      clientId: clientIds.get("seed-jasmine-tan"),
      lastMessageAt: "2026-06-19T10:30:00.000Z",
      analysisStatus: "Idle",
    });
    const amarConversationId = await upsertConversation(ctx, {
      advisorId,
      participantPhone: "60123339003",
      participantName: "Amar Rahman",
      leadId: leadIds.get("seed-amar-rahman"),
      lastMessageAt: "2026-06-20T03:15:00.000Z",
      analysisStatus: "Queued",
    });

    const vinceMessageId = await upsertMessage(ctx, {
      conversationId: vinceConversationId,
      advisorId,
      providerMessageId: "seed-vince-003",
      direction: "Inbound",
      fromPhone: "60123339001",
      toPhone: "advisor",
      senderName: "Vince Loo",
      body: "I will be travelling to Japan in late June after my product launch wraps up.",
      receivedAt: "2026-06-20T05:42:00.000Z",
      analysisStatus: "Processed",
    });
    await upsertMessage(ctx, {
      conversationId: vinceConversationId,
      advisorId,
      providerMessageId: "seed-vince-001",
      direction: "Inbound",
      fromPhone: "60123339001",
      toPhone: "advisor",
      senderName: "Vince Loo",
      body: "Hi, I want to start building a financial portfolio this year.",
      receivedAt: "2026-06-20T05:20:00.000Z",
      analysisStatus: "Processed",
    });
    await upsertMessage(ctx, {
      conversationId: vinceConversationId,
      advisorId,
      providerMessageId: "seed-vince-002",
      direction: "Outbound",
      fromPhone: "advisor",
      toPhone: "60123339001",
      senderName: "LeeSF",
      body: "Thanks Vince, glad to have you onboard as a client. We will start with your first 90-day plan.",
      receivedAt: "2026-06-20T05:25:00.000Z",
      analysisStatus: "Processed",
    });

    const jasmineMessageId = await upsertMessage(ctx, {
      conversationId: jasmineConversationId,
      advisorId,
      providerMessageId: "seed-jasmine-002",
      direction: "Inbound",
      fromPhone: "60123339002",
      toPhone: "advisor",
      senderName: "Jasmine Tan",
      body: "My son starts daycare next month, so I want to revisit protection and monthly cash flow.",
      receivedAt: "2026-06-19T10:30:00.000Z",
      analysisStatus: "Processed",
    });
    await upsertMessage(ctx, {
      conversationId: jasmineConversationId,
      advisorId,
      providerMessageId: "seed-jasmine-001",
      direction: "Outbound",
      fromPhone: "advisor",
      toPhone: "60123339002",
      senderName: "LeeSF",
      body: "Let's review the coverage gaps before daycare starts.",
      receivedAt: "2026-06-19T10:25:00.000Z",
      analysisStatus: "Processed",
    });

    await upsertMessage(ctx, {
      conversationId: amarConversationId,
      advisorId,
      providerMessageId: "seed-amar-001",
      direction: "Inbound",
      fromPhone: "60123339003",
      toPhone: "advisor",
      senderName: "Amar Rahman",
      body: "Can we set up a call? I just changed jobs and want to understand EPF and retirement planning.",
      receivedAt: "2026-06-20T03:15:00.000Z",
      analysisStatus: "Pending",
    });

    await upsertMeeting(ctx, {
      externalId: "seed-meeting-vince-review",
      title: "Vince onboarding review",
      attendee: "Vince Loo",
      attendeeRole: "Client",
      advisorId,
      clientId: clientIds.get("seed-vince-loo"),
      start: "2026-06-24T06:00:00.000Z",
      durationMinutes: 45,
      mode: "Video",
      location: "Google Meet",
      status: "Confirmed",
      topic: "Investment Management",
      purpose: "Align first 90-day portfolio plan.",
      agenda: ["Confirm goals", "Review cash flow", "Set first allocation"],
    });
    await upsertMeeting(ctx, {
      externalId: "seed-meeting-amar-discovery",
      title: "Amar discovery call",
      attendee: "Amar Rahman",
      attendeeRole: "Prospective client",
      advisorId,
      leadId: leadIds.get("seed-amar-rahman"),
      start: "2026-06-23T04:30:00.000Z",
      durationMinutes: 30,
      mode: "Phone",
      location: "WhatsApp call",
      status: "Tentative",
      topic: "Retirement Planning",
      purpose: "Understand job change and retirement planning needs.",
      agenda: ["Current EPF", "New role benefits", "Retirement timeline"],
    });

    await upsertClientActivity(ctx, {
      clientId: requireId(clientIds.get("seed-vince-loo"), "Vince client"),
      conversationId: vinceConversationId,
      messageId: vinceMessageId,
      category: "Travel",
      activity: "Travelling to Japan after a product launch wraps up.",
      timeframe: "Late June",
      mentionedAt: "2026-06-20",
      suggestedTouchpoint: "Ask how the launch went and wish him a good trip before he leaves.",
      source: "WhatsApp",
      priority: "Upcoming",
      confidence: 0.92,
      rationale: "Client explicitly mentioned an upcoming trip and product launch.",
    });
    await upsertClientActivity(ctx, {
      clientId: requireId(clientIds.get("seed-jasmine-tan"), "Jasmine client"),
      conversationId: jasmineConversationId,
      messageId: jasmineMessageId,
      category: "Family",
      activity: "Her son starts daycare, changing the household budget rhythm.",
      timeframe: "Next month",
      mentionedAt: "2026-06-19",
      suggestedTouchpoint: "Check how daycare transition is going before the protection review.",
      source: "WhatsApp",
      priority: "Upcoming",
      confidence: 0.9,
      rationale: "Client explicitly mentioned daycare starting next month.",
    });

    await upsertAdvisorTask(ctx, {
      advisorId,
      clientId: clientIds.get("seed-jasmine-tan"),
      title: "Prepare daycare cash-flow review",
      detail: "Bring protection and monthly budget options for Jasmine.",
      status: "Open",
      dueDate: "2026-06-25",
    });

    await upsertMessageAnalysis(ctx, {
      messageId: vinceMessageId,
      conversationId: vinceConversationId,
      clientId: clientIds.get("seed-vince-loo"),
      summary: "Vince mentioned Japan travel after a product launch.",
      sentiment: "Positive",
      extractedFacts: [
        {
          target: "Profile",
          field: "client_activity:Travel",
          value: "Travelling to Japan after a product launch wraps up.",
          confidence: 0.92,
        },
      ],
      suggestedActions: [
        {
          type: "UpdateClient",
          title: "Stored client activity",
          rationale: "Useful relationship-maintenance context.",
          confidence: 0.92,
        },
      ],
      model: "seed",
    });

    return {
      advisorId,
      clients: seedPeople.length,
      leads: seedLeads.length,
      conversations: 3,
      messages: 6,
      meetings: 2,
      clientActivities: 2,
      advisorTasks: 1,
      messageAnalyses: 1,
    };
  },
});

async function upsertAdvisor(
  ctx: MutationCtx,
  input: { name: string; timezone: string },
) {
  const existing = await ctx.db
    .query("advisors")
    .withIndex("by_whatsapp_phone", (q) => q.eq("whatsappPhone", "advisor"))
    .unique();
  const timestamp = now();
  if (existing) {
    await ctx.db.patch(existing._id, {
      name: input.name,
      timezone: input.timezone,
      updatedAt: timestamp,
    });
    return existing._id;
  }
  return await ctx.db.insert("advisors", {
    name: input.name,
    email: "advisor@example.com",
    phone: "advisor",
    whatsappPhone: "advisor",
    timezone: input.timezone,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function upsertClient(
  ctx: MutationCtx,
  advisorId: Id<"advisors">,
  person: SeedPerson,
) {
  const timestamp = now();
  const existing = await ctx.db
    .query("clients")
    .withIndex("by_external_id", (q) => q.eq("externalId", person.externalId))
    .unique();
  const value = {
    slug: person.slug,
    name: person.name,
    age: person.age,
    occupation: person.occupation,
    location: person.location,
    email: person.email,
    phone: person.phone,
    status: "Onboarding" as const,
    clientSince: "2026-06-20",
    advisorName: "LeeSF",
    advisorId,
    cadence: "Monthly",
    nextReview: "2026-09-20",
    dependents: [],
    aum: person.externalId === "seed-vince-loo" ? 0 : 85000,
    netWorth: person.externalId === "seed-vince-loo" ? 0 : 210000,
    riskTolerance: "Moderate" as const,
    timeHorizon: "5-10 years",
    accounts: [],
    allocation: [],
    goals: [{ name: person.interest, detail: "Seeded client planning goal." }],
    serviceTopics: [person.interest],
    description: `Seeded client profile for ${person.name}.`,
    situation: "Created for WhatsApp conversation testing.",
    whyApproached: `Interested in ${person.interest}.`,
    notes: ["Seeded profile for development testing."],
    updatedAt: timestamp,
  };
  if (existing) {
    await ctx.db.patch(existing._id, value);
    return existing._id;
  }
  return await ctx.db.insert("clients", {
    externalId: person.externalId,
    ...value,
    createdAt: timestamp,
  });
}

async function upsertLead(
  ctx: MutationCtx,
  advisorId: Id<"advisors">,
  person: SeedPerson,
) {
  const timestamp = now();
  const existing = await ctx.db
    .query("leads")
    .withIndex("by_external_id", (q) => q.eq("externalId", person.externalId))
    .unique();
  const value = {
    name: person.name,
    email: person.email,
    phone: person.phone,
    location: person.location,
    occupation: person.occupation,
    age: person.age,
    status: "Contacted" as const,
    serviceInterest: person.interest,
    source: "WhatsApp" as const,
    addedDate: "2026-06-20",
    lastContact: "2026-06-20",
    estimatedPortfolio: 0,
    situationTeaser: `Asked about ${person.interest}.`,
    situation: "Seeded lead from WhatsApp testing.",
    whyApproached: `Wants help with ${person.interest}.`,
    notes: ["Seeded WhatsApp lead."],
    timeline: [{ date: "2026-06-20", label: "Lead created from WhatsApp" }],
    advisorId,
    updatedAt: timestamp,
  };
  if (existing) {
    await ctx.db.patch(existing._id, value);
    return existing._id;
  }
  return await ctx.db.insert("leads", {
    externalId: person.externalId,
    ...value,
    createdAt: timestamp,
  });
}

async function upsertConversation(
  ctx: MutationCtx,
  input: {
    advisorId: Id<"advisors">;
    participantPhone: string;
    participantName: string;
    leadId?: Id<"leads">;
    clientId?: Id<"clients">;
    lastMessageAt: string;
    analysisStatus: Doc<"whatsappConversations">["analysisStatus"];
  },
) {
  const timestamp = now();
  const existing = await ctx.db
    .query("whatsappConversations")
    .withIndex("by_advisor_participant", (q) =>
      q.eq("advisorId", input.advisorId).eq("participantPhone", input.participantPhone),
    )
    .unique();
  const value = {
    participantName: input.participantName,
    leadId: input.leadId,
    clientId: input.clientId,
    status: "Open" as const,
    lastMessageAt: input.lastMessageAt,
    analysisStatus: input.analysisStatus,
    analysisRequestedAt: timestamp,
    analysisCompletedAt: input.analysisStatus === "Idle" ? timestamp : undefined,
    analysisError: "",
    updatedAt: timestamp,
  };
  if (existing) {
    await ctx.db.patch(existing._id, value);
    return existing._id;
  }
  return await ctx.db.insert("whatsappConversations", {
    advisorId: input.advisorId,
    participantPhone: input.participantPhone,
    ...value,
    createdAt: timestamp,
  });
}

async function upsertMessage(
  ctx: MutationCtx,
  input: Omit<Doc<"whatsappMessages">, "_id" | "_creationTime" | "createdAt" | "messageType" | "rawPayload">,
) {
  const existing = await ctx.db
    .query("whatsappMessages")
    .withIndex("by_provider_message_id", (q) =>
      q.eq("providerMessageId", input.providerMessageId),
    )
    .unique();
  const value = {
    ...input,
    messageType: "Text" as const,
    rawPayload: { seed: true },
  };
  if (existing) {
    await ctx.db.patch(existing._id, value);
    return existing._id;
  }
  return await ctx.db.insert("whatsappMessages", {
    ...value,
    createdAt: now(),
  });
}

async function upsertMeeting(
  ctx: MutationCtx,
  input: Omit<Doc<"meetings">, "_id" | "_creationTime" | "createdAt" | "updatedAt">,
) {
  const timestamp = now();
  const existing = await ctx.db
    .query("meetings")
    .withIndex("by_external_id", (q) => q.eq("externalId", input.externalId))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, { ...input, updatedAt: timestamp });
    return existing._id;
  }
  return await ctx.db.insert("meetings", {
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function upsertClientActivity(
  ctx: MutationCtx,
  input: Omit<Doc<"clientActivities">, "_id" | "_creationTime" | "createdAt" | "updatedAt">,
) {
  const existing = await ctx.db
    .query("clientActivities")
    .withIndex("by_client", (q) => q.eq("clientId", input.clientId))
    .take(20);
  const duplicate = existing.find(
    (activity) =>
      activity.category === input.category &&
      activity.activity === input.activity &&
      activity.timeframe === input.timeframe,
  );
  const timestamp = now();
  if (duplicate) {
    await ctx.db.patch(duplicate._id, { ...input, updatedAt: timestamp });
    return duplicate._id;
  }
  return await ctx.db.insert("clientActivities", {
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function upsertAdvisorTask(
  ctx: MutationCtx,
  input: Omit<Doc<"advisorTasks">, "_id" | "_creationTime" | "createdAt" | "updatedAt">,
) {
  const existing = await ctx.db
    .query("advisorTasks")
    .withIndex("by_advisor_status", (q) =>
      q.eq("advisorId", input.advisorId).eq("status", input.status),
    )
    .take(20);
  const duplicate = existing.find((task) => task.title === input.title);
  const timestamp = now();
  if (duplicate) {
    await ctx.db.patch(duplicate._id, { ...input, updatedAt: timestamp });
    return duplicate._id;
  }
  return await ctx.db.insert("advisorTasks", {
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

async function upsertMessageAnalysis(
  ctx: MutationCtx,
  input: Omit<Doc<"messageAnalyses">, "_id" | "_creationTime" | "createdAt">,
) {
  const existing = await ctx.db
    .query("messageAnalyses")
    .withIndex("by_message", (q) => q.eq("messageId", input.messageId))
    .take(20);
  const duplicate = existing.find(
    (analysis) => analysis.summary === input.summary,
  );
  if (duplicate) return duplicate._id;
  return await ctx.db.insert("messageAnalyses", {
    ...input,
    createdAt: now(),
  });
}

function requireId<T>(value: T | undefined, label: string): T {
  if (!value) throw new Error(`${label} not found`);
  return value;
}
