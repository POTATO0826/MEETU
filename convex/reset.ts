import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const resetAllTablesRef = makeFunctionReference<
  "mutation",
  { confirm: "RESET" },
  { deleted: number; done: boolean }
>("reset:resetAllTables");

export const resetAllTables = mutation({
  args: {
    confirm: v.literal("RESET"),
  },
  handler: async (ctx, args) => {
    let deleted = 0;

    deleted += await deleteFromAgentEvents(ctx);
    deleted += await deleteFromAdvisorTasks(ctx);
    deleted += await deleteFromMessageAnalyses(ctx);
    deleted += await deleteFromWebhookEvents(ctx);
    deleted += await deleteFromClientSocialPosts(ctx);
    deleted += await deleteFromClientSocialScrapeRuns(ctx);
    deleted += await deleteFromWhatsappMessages(ctx);
    deleted += await deleteFromWhatsappConversations(ctx);
    deleted += await deleteFromMeetings(ctx);
    deleted += await deleteFromClientActivities(ctx);
    deleted += await deleteFromLeads(ctx);
    deleted += await deleteFromClients(ctx);
    deleted += await deleteFromAdvisors(ctx);

    const done = deleted === 0;
    if (!done) {
      await ctx.scheduler.runAfter(0, resetAllTablesRef, args);
    }

    return { deleted, done };
  },
});

async function deleteFromAgentEvents(ctx: MutationCtx) {
  const rows = await ctx.db.query("agentEvents").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function deleteFromAdvisorTasks(ctx: MutationCtx) {
  const rows = await ctx.db.query("advisorTasks").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function deleteFromMessageAnalyses(ctx: MutationCtx) {
  const rows = await ctx.db.query("messageAnalyses").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function deleteFromWebhookEvents(ctx: MutationCtx) {
  const rows = await ctx.db.query("webhookEvents").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function deleteFromClientSocialPosts(ctx: MutationCtx) {
  const rows = await ctx.db.query("clientSocialPosts").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function deleteFromClientSocialScrapeRuns(ctx: MutationCtx) {
  const rows = await ctx.db.query("clientSocialScrapeRuns").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function deleteFromWhatsappMessages(ctx: MutationCtx) {
  const rows = await ctx.db.query("whatsappMessages").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function deleteFromWhatsappConversations(ctx: MutationCtx) {
  const rows = await ctx.db.query("whatsappConversations").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function deleteFromMeetings(ctx: MutationCtx) {
  const rows = await ctx.db.query("meetings").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function deleteFromClientActivities(ctx: MutationCtx) {
  const rows = await ctx.db.query("clientActivities").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function deleteFromLeads(ctx: MutationCtx) {
  const rows = await ctx.db.query("leads").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function deleteFromClients(ctx: MutationCtx) {
  const rows = await ctx.db.query("clients").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}

async function deleteFromAdvisors(ctx: MutationCtx) {
  const rows = await ctx.db.query("advisors").take(100);
  for (const row of rows) await ctx.db.delete(row._id);
  return rows.length;
}
