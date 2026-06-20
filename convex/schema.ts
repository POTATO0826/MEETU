import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const leadStatus = v.union(
  v.literal("New"),
  v.literal("Contacted"),
  v.literal("Qualified"),
  v.literal("Proposal"),
  v.literal("Converted"),
);

const serviceInterest = v.union(
  v.literal("Retirement Planning"),
  v.literal("Investment Management"),
  v.literal("Insurance"),
  v.literal("Estate Planning"),
  v.literal("Tax Strategy"),
  v.literal("College Savings"),
);

const leadSource = v.union(
  v.literal("Referral"),
  v.literal("Website"),
  v.literal("Seminar"),
  v.literal("LinkedIn"),
  v.literal("Cold Inquiry"),
  v.literal("WhatsApp"),
);

const clientStatus = v.union(
  v.literal("Active"),
  v.literal("Onboarding"),
  v.literal("Review due"),
);

const riskTolerance = v.union(
  v.literal("Conservative"),
  v.literal("Moderate"),
  v.literal("Moderate-Aggressive"),
  v.literal("Aggressive"),
);

const accountType = v.union(
  v.literal("401(k)"),
  v.literal("Roth IRA"),
  v.literal("Traditional IRA"),
  v.literal("Brokerage"),
  v.literal("529 Plan"),
  v.literal("HSA"),
  v.literal("Pension"),
);

const allocationLabel = v.union(
  v.literal("Stocks"),
  v.literal("Bonds"),
  v.literal("Cash"),
  v.literal("Alternatives"),
  v.literal("Real Estate"),
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

const clientActivityCategory = v.union(
  v.literal("Travel"),
  v.literal("Family"),
  v.literal("Work"),
  v.literal("Health"),
  v.literal("Milestone"),
  v.literal("Availability"),
);

const clientActivityPriority = v.union(
  v.literal("Upcoming"),
  v.literal("Recent"),
  v.literal("Watch"),
);

const conversationAnalysisStatus = v.union(
  v.literal("Idle"),
  v.literal("Queued"),
  v.literal("Running"),
  v.literal("Failed"),
);

const isoDate = v.string();
const isoDateTime = v.string();

export default defineSchema({
  advisors: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    whatsappPhone: v.optional(v.string()),
    timezone: v.string(),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  }).index("by_whatsapp_phone", ["whatsappPhone"]),

  leads: defineTable({
    externalId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    location: v.string(),
    occupation: v.string(),
    age: v.number(),
    status: leadStatus,
    serviceInterest,
    source: leadSource,
    addedDate: isoDate,
    lastContact: isoDate,
    estimatedPortfolio: v.number(),
    situationTeaser: v.string(),
    situation: v.string(),
    whyApproached: v.string(),
    notes: v.array(v.string()),
    timeline: v.array(
      v.object({
        date: isoDate,
        label: v.string(),
      }),
    ),
    advisorId: v.optional(v.id("advisors")),
    clientId: v.optional(v.id("clients")),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
    .index("by_external_id", ["externalId"])
    .index("by_status", ["status"])
    .index("by_phone", ["phone"])
    .index("by_advisor", ["advisorId"]),

  clients: defineTable({
    externalId: v.string(),
    slug: v.string(),
    name: v.string(),
    age: v.number(),
    occupation: v.string(),
    location: v.string(),
    email: v.string(),
    phone: v.string(),
    status: clientStatus,
    clientSince: isoDate,
    advisorName: v.string(),
    advisorId: v.optional(v.id("advisors")),
    cadence: v.string(),
    nextReview: isoDate,
    spouse: v.optional(v.string()),
    dependents: v.array(
      v.object({
        name: v.string(),
        relation: v.string(),
      }),
    ),
    aum: v.number(),
    netWorth: v.number(),
    riskTolerance,
    timeHorizon: v.string(),
    accounts: v.array(
      v.object({
        type: accountType,
        institution: v.string(),
        balance: v.number(),
      }),
    ),
    allocation: v.array(
      v.object({
        label: allocationLabel,
        percent: v.number(),
      }),
    ),
    goals: v.array(
      v.object({
        name: v.string(),
        detail: v.string(),
        progress: v.optional(v.number()),
      }),
    ),
    serviceTopics: v.array(serviceInterest),
    description: v.string(),
    situation: v.string(),
    whyApproached: v.string(),
    notes: v.array(v.string()),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
    .index("by_external_id", ["externalId"])
    .index("by_slug", ["slug"])
    .index("by_phone", ["phone"])
    .index("by_status", ["status"])
    .index("by_advisor", ["advisorId"]),

  meetings: defineTable({
    externalId: v.string(),
    title: v.string(),
    attendee: v.string(),
    attendeeRole: v.string(),
    leadId: v.optional(v.id("leads")),
    clientId: v.optional(v.id("clients")),
    advisorId: v.optional(v.id("advisors")),
    start: isoDateTime,
    durationMinutes: v.number(),
    mode: meetingMode,
    location: v.string(),
    status: meetingStatus,
    topic: serviceInterest,
    purpose: v.string(),
    agenda: v.array(v.string()),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
    .index("by_external_id", ["externalId"])
    .index("by_start", ["start"])
    .index("by_status", ["status"])
    .index("by_client", ["clientId"])
    .index("by_lead", ["leadId"])
    .index("by_advisor", ["advisorId"]),

  clientActivities: defineTable({
    clientId: v.id("clients"),
    conversationId: v.optional(v.id("whatsappConversations")),
    messageId: v.optional(v.id("whatsappMessages")),
    category: clientActivityCategory,
    activity: v.string(),
    timeframe: v.string(),
    mentionedAt: isoDate,
    suggestedTouchpoint: v.string(),
    source: v.union(
      v.literal("WhatsApp"),
      v.literal("Manual"),
      v.literal("Other"),
    ),
    priority: clientActivityPriority,
    confidence: v.number(),
    rationale: v.optional(v.string()),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
    .index("by_client", ["clientId"])
    .index("by_priority", ["priority"])
    .index("by_mentioned_at", ["mentionedAt"])
    .index("by_conversation", ["conversationId"]),

  whatsappConversations: defineTable({
    advisorId: v.id("advisors"),
    participantPhone: v.string(),
    participantName: v.optional(v.string()),
    leadId: v.optional(v.id("leads")),
    clientId: v.optional(v.id("clients")),
    status: v.union(v.literal("Open"), v.literal("Archived")),
    lastMessageAt: v.optional(isoDateTime),
    analysisStatus: v.optional(conversationAnalysisStatus),
    analysisRequestedAt: v.optional(isoDateTime),
    analysisStartedAt: v.optional(isoDateTime),
    analysisCompletedAt: v.optional(isoDateTime),
    analysisError: v.optional(v.string()),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
    .index("by_advisor_participant", ["advisorId", "participantPhone"])
    .index("by_lead", ["leadId"])
    .index("by_client", ["clientId"])
    .index("by_last_message", ["lastMessageAt"]),

  whatsappMessages: defineTable({
    conversationId: v.id("whatsappConversations"),
    advisorId: v.id("advisors"),
    providerMessageId: v.string(),
    direction: v.union(v.literal("Inbound"), v.literal("Outbound")),
    fromPhone: v.string(),
    toPhone: v.string(),
    senderName: v.optional(v.string()),
    body: v.string(),
    messageType: v.union(
      v.literal("Text"),
      v.literal("Image"),
      v.literal("Audio"),
      v.literal("Document"),
      v.literal("Other"),
    ),
    receivedAt: isoDateTime,
    rawPayload: v.any(),
    analysisStatus: v.union(
      v.literal("Pending"),
      v.literal("Processing"),
      v.literal("Processed"),
      v.literal("Failed"),
    ),
    createdAt: isoDateTime,
  })
    .index("by_provider_message_id", ["providerMessageId"])
    .index("by_conversation", ["conversationId"])
    .index("by_analysis_status", ["analysisStatus"])
    .index("by_received_at", ["receivedAt"]),

  webhookEvents: defineTable({
    provider: v.union(v.literal("WhatsApp"), v.literal("Meta"), v.literal("Other")),
    eventType: v.string(),
    providerEventId: v.optional(v.string()),
    receivedAt: isoDateTime,
    processedAt: v.optional(isoDateTime),
    status: v.union(
      v.literal("Received"),
      v.literal("Processed"),
      v.literal("Ignored"),
      v.literal("Failed"),
    ),
    rawPayload: v.any(),
    error: v.optional(v.string()),
  })
    .index("by_provider_event_id", ["providerEventId"])
    .index("by_status", ["status"])
    .index("by_received_at", ["receivedAt"]),

  messageAnalyses: defineTable({
    messageId: v.id("whatsappMessages"),
    conversationId: v.id("whatsappConversations"),
    leadId: v.optional(v.id("leads")),
    clientId: v.optional(v.id("clients")),
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
    createdAt: isoDateTime,
  })
    .index("by_message", ["messageId"])
    .index("by_conversation", ["conversationId"])
    .index("by_client", ["clientId"])
    .index("by_lead", ["leadId"]),

  agentEvents: defineTable({
    type: v.union(v.literal("ManualLeadConversion")),
    leadId: v.optional(v.id("leads")),
    clientId: v.optional(v.id("clients")),
    conversationId: v.optional(v.id("whatsappConversations")),
    summary: v.string(),
    metadata: v.any(),
    createdAt: isoDateTime,
  })
    .index("by_lead", ["leadId"])
    .index("by_client", ["clientId"])
    .index("by_conversation", ["conversationId"])
    .index("by_type", ["type"]),

  advisorTasks: defineTable({
    advisorId: v.id("advisors"),
    leadId: v.optional(v.id("leads")),
    clientId: v.optional(v.id("clients")),
    meetingId: v.optional(v.id("meetings")),
    messageAnalysisId: v.optional(v.id("messageAnalyses")),
    title: v.string(),
    detail: v.optional(v.string()),
    status: v.union(v.literal("Open"), v.literal("Done"), v.literal("Dismissed")),
    dueDate: v.optional(isoDate),
    createdAt: isoDateTime,
    updatedAt: isoDateTime,
  })
    .index("by_advisor_status", ["advisorId", "status"])
    .index("by_client", ["clientId"])
    .index("by_lead", ["leadId"])
    .index("by_due_date", ["dueDate"]),
});
