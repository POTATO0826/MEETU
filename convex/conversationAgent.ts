import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const leadStatus = v.union(
  v.literal("New"),
  v.literal("Contacted"),
  v.literal("Qualified"),
  v.literal("Proposal"),
);

const meetingMode = v.union(
  v.literal("Video"),
  v.literal("Phone"),
  v.literal("In-person"),
);

const meetingStatus = v.union(
  v.literal("Confirmed"),
  v.literal("Tentative"),
  v.literal("Completed"),
  v.literal("Canceled"),
);

const serviceInterest = v.union(
  v.literal("Retirement Planning"),
  v.literal("Investment Management"),
  v.literal("Insurance"),
  v.literal("Estate Planning"),
  v.literal("Tax Strategy"),
  v.literal("College Savings"),
);

const leadProfilePatch = v.object({
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  location: v.optional(v.string()),
  occupation: v.optional(v.string()),
  age: v.optional(v.number()),
  serviceInterest: v.optional(serviceInterest),
  estimatedPortfolio: v.optional(v.number()),
  situationTeaser: v.optional(v.string()),
  situation: v.optional(v.string()),
  whyApproached: v.optional(v.string()),
  lastContact: v.optional(v.string()),
});

export const claimConversationAnalysis = internalMutation({
  args: { conversationId: v.id("whatsappConversations") },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.analysisStatus === "Running") return null;

    const messages = await ctx.db
      .query("whatsappMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .take(80);
    const pendingMessages = messages
      .filter((message) => message.analysisStatus === "Pending")
      .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
      .slice(0, 20);

    if (pendingMessages.length === 0) {
      await ctx.db.patch(args.conversationId, {
        analysisStatus: "Idle",
        analysisCompletedAt: new Date().toISOString(),
      });
      return null;
    }

    const now = new Date().toISOString();
    for (const message of pendingMessages) {
      await ctx.db.patch(message._id, { analysisStatus: "Processing" });
    }
    await ctx.db.patch(args.conversationId, {
      analysisStatus: "Running",
      analysisStartedAt: now,
    });

    let lead = conversation.leadId ? await ctx.db.get(conversation.leadId) : null;
    if (!lead) {
      lead = await ctx.db
        .query("leads")
        .withIndex("by_phone", (q) =>
          q.eq("phone", conversation.participantPhone),
        )
        .unique();
      if (lead) {
        await ctx.db.patch(args.conversationId, { leadId: lead._id });
      }
    }

    return {
      conversation,
      lead,
      recentMessages: messages
        .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
        .slice(-30),
      pendingMessageIds: pendingMessages.map((message) => message._id),
    };
  },
});

export const findLeadByPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();
  },
});

export const createLeadFromConversation = internalMutation({
  args: {
    conversationId: v.id("whatsappConversations"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    location: v.optional(v.string()),
    occupation: v.optional(v.string()),
    age: v.optional(v.number()),
    serviceInterest: v.optional(serviceInterest),
    estimatedPortfolio: v.optional(v.number()),
    situationTeaser: v.optional(v.string()),
    situation: v.optional(v.string()),
    whyApproached: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const existing = await ctx.db
      .query("leads")
      .withIndex("by_phone", (q) =>
        q.eq("phone", conversation.participantPhone),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(conversation._id, { leadId: existing._id });
      return existing;
    }

    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const name =
      args.name ?? conversation.participantName ?? conversation.participantPhone;
    const leadId = await ctx.db.insert("leads", {
      externalId: `wa-${conversation.participantPhone}`,
      name,
      email: args.email ?? "",
      phone: conversation.participantPhone,
      location: args.location ?? "Unknown",
      occupation: args.occupation ?? "Unknown",
      age: args.age ?? 0,
      status: "New",
      serviceInterest: args.serviceInterest ?? "Investment Management",
      source: "WhatsApp",
      addedDate: today,
      lastContact: today,
      estimatedPortfolio: args.estimatedPortfolio ?? 0,
      situationTeaser:
        args.situationTeaser ?? "Lead created from WhatsApp conversation.",
      situation: args.situation ?? "Lead created from WhatsApp conversation.",
      whyApproached: args.whyApproached ?? "Reached out via WhatsApp.",
      notes: [],
      timeline: [{ date: today, label: "Lead created from WhatsApp" }],
      advisorId: conversation.advisorId,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(conversation._id, { leadId });
    return await ctx.db.get(leadId);
  },
});

export const updateLeadProfile = internalMutation({
  args: {
    leadId: v.id("leads"),
    patch: leadProfilePatch,
    confidence: v.number(),
    rationale: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.confidence < 0.8) {
      return { updated: false, reason: "confidence_too_low" };
    }
    const patch = compactPatch(args.patch);
    if (Object.keys(patch).length === 0) {
      return { updated: false, reason: "empty_patch" };
    }
    await ctx.db.patch(args.leadId, {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
    return { updated: true };
  },
});

export const updateLeadStatus = internalMutation({
  args: {
    leadId: v.id("leads"),
    status: leadStatus,
    confidence: v.number(),
    rationale: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.confidence < 0.8) {
      return { updated: false, reason: "confidence_too_low" };
    }
    await ctx.db.patch(args.leadId, {
      status: args.status,
      updatedAt: new Date().toISOString(),
    });
    return { updated: true };
  },
});

export const appendLeadNote = internalMutation({
  args: {
    leadId: v.id("leads"),
    note: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.confidence < 0.65) {
      return { updated: false, reason: "confidence_too_low" };
    }
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    if (lead.notes.some((note) => note === args.note)) {
      return { updated: false, reason: "duplicate_note" };
    }
    await ctx.db.patch(args.leadId, {
      notes: [...lead.notes, args.note],
      updatedAt: new Date().toISOString(),
    });
    return { updated: true };
  },
});

export const appendLeadTimelineEvent = internalMutation({
  args: {
    leadId: v.id("leads"),
    date: v.string(),
    label: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.confidence < 0.7) {
      return { updated: false, reason: "confidence_too_low" };
    }
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    if (
      lead.timeline.some(
        (event) => event.date === args.date && event.label === args.label,
      )
    ) {
      return { updated: false, reason: "duplicate_event" };
    }
    await ctx.db.patch(args.leadId, {
      timeline: [...lead.timeline, { date: args.date, label: args.label }],
      updatedAt: new Date().toISOString(),
    });
    return { updated: true };
  },
});

export const createLeadFollowUpTask = internalMutation({
  args: {
    leadId: v.id("leads"),
    title: v.string(),
    detail: v.optional(v.string()),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error("Lead not found");
    if (!lead.advisorId) throw new Error("Lead has no advisor");
    const now = new Date().toISOString();
    return await ctx.db.insert("advisorTasks", {
      advisorId: lead.advisorId,
      leadId: args.leadId,
      title: args.title,
      detail: args.detail,
      dueDate: args.dueDate,
      status: "Open",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const upsertMeetingFromConversation = internalMutation({
  args: {
    conversationId: v.id("whatsappConversations"),
    leadId: v.optional(v.id("leads")),
    clientId: v.optional(v.id("clients")),
    title: v.string(),
    attendeeRole: v.optional(v.string()),
    start: v.string(),
    durationMinutes: v.number(),
    mode: meetingMode,
    location: v.string(),
    status: meetingStatus,
    topic: serviceInterest,
    purpose: v.string(),
    agenda: v.array(v.string()),
    confidence: v.number(),
    rationale: v.string(),
  },
  handler: async (ctx, args) => {
    return await createOrUpdateMeeting(ctx, args);
  },
});

export const completeConversationAnalysis = internalMutation({
  args: {
    conversationId: v.id("whatsappConversations"),
    messageIds: v.array(v.id("whatsappMessages")),
    summary: v.string(),
    sentiment: v.union(
      v.literal("Positive"),
      v.literal("Neutral"),
      v.literal("Negative"),
      v.literal("Urgent"),
    ),
    extractedFacts: v.array(
      v.object({
        target: v.union(
          v.literal("Lead"),
          v.literal("Client"),
          v.literal("Meeting"),
          v.literal("Profile"),
        ),
        field: v.string(),
        value: v.string(),
        confidence: v.number(),
      }),
    ),
    suggestedActions: v.array(
      v.object({
        type: v.union(
          v.literal("UpdateLead"),
          v.literal("UpdateClient"),
          v.literal("ScheduleMeeting"),
          v.literal("CreateTask"),
          v.literal("NoAction"),
        ),
        title: v.string(),
        rationale: v.string(),
        confidence: v.number(),
      }),
    ),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    const now = new Date().toISOString();
    for (const messageId of args.messageIds) {
      await ctx.db.insert("messageAnalyses", {
        messageId,
        conversationId: args.conversationId,
        leadId: conversation.leadId,
        clientId: conversation.clientId,
        summary: args.summary,
        sentiment: args.sentiment,
        extractedFacts: args.extractedFacts,
        suggestedActions: args.suggestedActions,
        model: args.model,
        createdAt: now,
      });
      await ctx.db.patch(messageId, { analysisStatus: "Processed" });
    }

    const pending = await ctx.db
      .query("whatsappMessages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .take(80);
    const hasMorePending = pending.some(
      (message) => message.analysisStatus === "Pending",
    );

    await ctx.db.patch(args.conversationId, {
      analysisStatus: hasMorePending ? "Queued" : "Idle",
      analysisCompletedAt: now,
      analysisError: "",
    });
    return { hasMorePending };
  },
});

export const failConversationAnalysis = internalMutation({
  args: {
    conversationId: v.id("whatsappConversations"),
    messageIds: v.array(v.id("whatsappMessages")),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    for (const messageId of args.messageIds) {
      await ctx.db.patch(messageId, { analysisStatus: "Failed" });
    }
    await ctx.db.patch(args.conversationId, {
      analysisStatus: "Failed",
      analysisCompletedAt: now,
      analysisError: args.error,
    });
    return null;
  },
});

type MeetingMutationInput = {
  conversationId: Doc<"whatsappConversations">["_id"];
  leadId?: Doc<"leads">["_id"];
  clientId?: Doc<"clients">["_id"];
  title: string;
  attendeeRole?: string;
  start: string;
  durationMinutes: number;
  mode: Doc<"meetings">["mode"];
  location: string;
  status: Doc<"meetings">["status"];
  topic: Doc<"meetings">["topic"];
  purpose: string;
  agenda: string[];
  confidence: number;
  rationale: string;
};

async function createOrUpdateMeeting(
  ctx: MutationCtx,
  args: MeetingMutationInput,
) {
  if (args.confidence < 0.85) {
    return { updated: false, reason: "confidence_too_low" };
  }

  const parsedStart = Date.parse(args.start);
  if (!Number.isFinite(parsedStart)) {
    return { updated: false, reason: "invalid_start" };
  }
  if (args.durationMinutes <= 0 || args.durationMinutes > 480) {
    return { updated: false, reason: "invalid_duration" };
  }

  const conversation = await ctx.db.get(args.conversationId);
  if (!conversation) throw new Error("Conversation not found");

  const start = new Date(parsedStart).toISOString();
  const leadId = args.leadId ?? conversation.leadId;
  const clientId = args.clientId ?? conversation.clientId;
  const lead = leadId ? await ctx.db.get(leadId) : null;
  const client = clientId ? await ctx.db.get(clientId) : null;
  const attendee =
    client?.name ??
    lead?.name ??
    conversation.participantName ??
    conversation.participantPhone;
  const attendeeRole =
    args.attendeeRole ??
    (client ? "Client" : lead ? "Prospective client" : "WhatsApp contact");
  const now = new Date().toISOString();
  const externalId = `wa-${args.conversationId}-${start}`;

  const existingByExternalId = await ctx.db
    .query("meetings")
    .withIndex("by_external_id", (q) => q.eq("externalId", externalId))
    .unique();

  const meetingPatch = {
    title: args.title,
    attendee,
    attendeeRole,
    leadId,
    clientId,
    advisorId: conversation.advisorId,
    start,
    durationMinutes: args.durationMinutes,
    mode: args.mode,
    location: args.location,
    status: args.status,
    topic: args.topic,
    purpose: args.purpose,
    agenda: args.agenda,
    updatedAt: now,
  };

  if (existingByExternalId) {
    await ctx.db.patch(existingByExternalId._id, meetingPatch);
    return {
      updated: true,
      meetingId: existingByExternalId._id,
      action: "updated",
    };
  }

  const relatedMeetings = leadId
    ? await ctx.db
        .query("meetings")
        .withIndex("by_lead", (q) => q.eq("leadId", leadId))
        .take(20)
    : clientId
      ? await ctx.db
          .query("meetings")
          .withIndex("by_client", (q) => q.eq("clientId", clientId))
          .take(20)
      : [];
  const duplicate = relatedMeetings.find(
    (meeting) => meeting.start === start && meeting.status !== "Canceled",
  );

  if (duplicate) {
    await ctx.db.patch(duplicate._id, meetingPatch);
    return { updated: true, meetingId: duplicate._id, action: "updated" };
  }

  const meetingId = await ctx.db.insert("meetings", {
    externalId,
    ...meetingPatch,
    createdAt: now,
  });
  return { updated: true, meetingId, action: "created" };
}

function compactPatch<T extends Record<string, unknown>>(patch: T) {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<Doc<"leads">>;
}
