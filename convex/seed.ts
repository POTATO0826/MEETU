import { v } from "convex/values";
import { mutationGeneric as mutation, type GenericMutationCtx } from "convex/server";
import type { GenericDataModel } from "convex/server";

import { clients } from "../src/lib/clients";
import { leads } from "../src/lib/leads";
import { meetings } from "../src/lib/meetings";

const now = () => new Date().toISOString();
type SeedCtx = GenericMutationCtx<GenericDataModel>;

async function upsertByExternalId(
  ctx: SeedCtx,
  table: "clients" | "leads" | "meetings",
  externalId: string,
  value: Record<string, unknown>,
) {
  const existing = await ctx.db
    .query(table)
    .filter((q) => q.eq(q.field("externalId"), externalId))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id as never, {
      ...value,
      updatedAt: now(),
    });
    return existing._id as string;
  }

  return await ctx.db.insert(table, {
    ...value,
    externalId,
    createdAt: now(),
    updatedAt: now(),
  } as never);
}

export const seedMockData = mutation({
  args: {
    advisorName: v.optional(v.string()),
    advisorTimezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = now();
    const advisorName = args.advisorName ?? "You";
  const advisor = await ctx.db
    .query("advisors")
      .filter((q) => q.eq(q.field("name"), advisorName))
      .first();

    const advisorId =
      advisor?._id ??
      (await ctx.db.insert("advisors", {
        name: advisorName,
        timezone: args.advisorTimezone ?? "America/New_York",
        createdAt,
        updatedAt: createdAt,
      }));

    const clientIdsByName = new Map<string, string>();
    for (const client of clients) {
      const clientId = await upsertByExternalId(ctx, "clients", client.id, {
        slug: client.slug,
        name: client.name,
        age: client.age,
        occupation: client.occupation,
        location: client.location,
        email: client.email,
        phone: client.phone,
        status: client.status,
        clientSince: client.clientSince,
        advisorName: client.advisor,
        advisorId,
        cadence: client.cadence,
        nextReview: client.nextReview,
        spouse: client.spouse,
        dependents: client.dependents,
        aum: client.aum,
        netWorth: client.netWorth,
        riskTolerance: client.riskTolerance,
        timeHorizon: client.timeHorizon,
        accounts: client.accounts,
        allocation: client.allocation,
        goals: client.goals,
        serviceTopics: client.serviceTopics,
        description: client.description,
        situation: client.situation,
        whyApproached: client.whyApproached,
        notes: client.notes,
      });

      clientIdsByName.set(client.name, clientId);
    }

    const leadIdsByName = new Map<string, string>();
    for (const lead of leads) {
      const leadId = await upsertByExternalId(ctx, "leads", lead.id, {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        location: lead.location,
        occupation: lead.occupation,
        age: lead.age,
        status: lead.status,
        serviceInterest: lead.serviceInterest,
        source: lead.source,
        addedDate: lead.addedDate,
        lastContact: lead.lastContact,
        estimatedPortfolio: lead.estimatedPortfolio,
        situationTeaser: lead.situationTeaser,
        situation: lead.situation,
        whyApproached: lead.whyApproached,
        notes: lead.notes,
        timeline: lead.timeline,
        advisorId,
        clientId: clientIdsByName.get(lead.name),
      });

      leadIdsByName.set(lead.name, leadId);
    }

    for (const meeting of meetings) {
      await upsertByExternalId(ctx, "meetings", meeting.id, {
        title: meeting.title,
        attendee: meeting.attendee,
        attendeeRole: meeting.attendeeRole,
        leadId: leadIdsByName.get(meeting.attendee),
        clientId: clientIdsByName.get(meeting.attendee),
        advisorId,
        start: meeting.start,
        durationMinutes: meeting.durationMinutes,
        mode: meeting.mode,
        location: meeting.location,
        status: meeting.status,
        topic: meeting.topic,
        purpose: meeting.purpose,
        agenda: meeting.agenda,
      });
    }

    return {
      advisorId,
      clients: clients.length,
      leads: leads.length,
      meetings: meetings.length,
    };
  },
});
