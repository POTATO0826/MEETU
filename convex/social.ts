import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

const scrapedPostInput = v.object({
  externalPostId: v.optional(v.string()),
  postUrl: v.optional(v.string()),
  postedAt: v.optional(v.string()),
  text: v.string(),
  rawPayload: v.any(),
});

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

export const getClientForScrape = internalQuery({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.clientId);
  },
});

export const getScrapeRunForAnalysis = internalQuery({
  args: {
    scrapeRunId: v.id("clientSocialScrapeRuns"),
  },
  handler: async (ctx, args) => {
    const scrapeRun = await ctx.db.get(args.scrapeRunId);
    if (!scrapeRun) return null;
    const client = await ctx.db.get(scrapeRun.clientId);
    const posts = await ctx.db
      .query("clientSocialPosts")
      .withIndex("by_scrape_run", (q) => q.eq("scrapeRunId", args.scrapeRunId))
      .take(25);

    return { scrapeRun, client, posts };
  },
});

export const listClientFacebookPosts = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("clientSocialPosts")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(20);

    return posts.sort((a, b) => {
      const aTime = a.postedAt ?? a.createdAt;
      const bTime = b.postedAt ?? b.createdAt;
      return bTime.localeCompare(aTime);
    });
  },
});

export const listClientActivities = query({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("clientActivities")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .take(50);

    return activities
      .sort((a, b) => b.mentionedAt.localeCompare(a.mentionedAt))
      .slice(0, 10);
  },
});

export const saveClientFacebookProfileUrl = mutation({
  args: {
    clientId: v.id("clients"),
    facebookProfileUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");

    const facebookProfileUrl = normalizeFacebookUrl(args.facebookProfileUrl);
    await ctx.db.patch(args.clientId, {
      facebookProfileUrl,
      updatedAt: new Date().toISOString(),
    });
    return { saved: true, facebookProfileUrl };
  },
});

export const requeueSkippedFacebookPosts = mutation({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("clientSocialPosts")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .order("desc")
      .take(50);
    const now = new Date().toISOString();
    let requeued = 0;

    for (const post of posts) {
      if (post.analysisStatus !== "Skipped") continue;
      await ctx.db.patch(post._id, {
        analysisStatus: "Pending",
        updatedAt: now,
      });
      requeued += 1;
    }

    return { requeued };
  },
});

export const startFacebookScrapeRun = internalMutation({
  args: {
    clientId: v.id("clients"),
    facebookProfileUrl: v.string(),
    actorId: v.string(),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");

    const now = new Date().toISOString();
    await ctx.db.patch(args.clientId, {
      facebookProfileUrl: args.facebookProfileUrl,
      updatedAt: now,
    });

    return await ctx.db.insert("clientSocialScrapeRuns", {
      clientId: args.clientId,
      platform: "Facebook",
      profileUrl: args.facebookProfileUrl,
      provider: "Apify",
      actorId: args.actorId,
      status: "Running",
      requestedAt: now,
      itemCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const completeFacebookScrapeRun = internalMutation({
  args: {
    scrapeRunId: v.id("clientSocialScrapeRuns"),
    providerRunId: v.optional(v.string()),
    datasetId: v.optional(v.string()),
    posts: v.array(scrapedPostInput),
  },
  handler: async (ctx, args) => {
    const scrapeRun = await ctx.db.get(args.scrapeRunId);
    if (!scrapeRun) throw new Error("Scrape run not found");

    const now = new Date().toISOString();
    let inserted = 0;
    let updated = 0;

    for (const post of args.posts) {
      const existing =
        post.postUrl !== undefined
          ? await ctx.db
              .query("clientSocialPosts")
              .withIndex("by_post_url", (q) => q.eq("postUrl", post.postUrl))
              .unique()
          : null;

      const value = {
        clientId: scrapeRun.clientId,
        scrapeRunId: args.scrapeRunId,
        platform: "Facebook" as const,
        profileUrl: scrapeRun.profileUrl,
        externalPostId: post.externalPostId,
        postUrl: post.postUrl,
        postedAt: post.postedAt,
        text: post.text,
        rawPayload: post.rawPayload,
        analysisStatus: "Pending" as const,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.patch(existing._id, value);
        updated += 1;
      } else {
        await ctx.db.insert("clientSocialPosts", {
          ...value,
          createdAt: now,
        });
        inserted += 1;
      }
    }

    await ctx.db.patch(args.scrapeRunId, {
      providerRunId: args.providerRunId,
      datasetId: args.datasetId,
      status: "Succeeded",
      completedAt: now,
      itemCount: args.posts.length,
      error: "",
      updatedAt: now,
    });

    return { inserted, updated, itemCount: args.posts.length };
  },
});

export const storeFacebookActivity = internalMutation({
  args: {
    clientId: v.id("clients"),
    postId: v.id("clientSocialPosts"),
    category: clientActivityCategory,
    activity: v.string(),
    timeframe: v.string(),
    mentionedAt: v.string(),
    suggestedTouchpoint: v.string(),
    priority: clientActivityPriority,
    confidence: v.number(),
    rationale: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.confidence < 0.75) {
      return { stored: false, reason: "confidence_too_low" };
    }

    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Facebook post not found");
    if (post.clientId !== args.clientId) {
      throw new Error("Facebook post does not belong to the client");
    }

    const existing = await ctx.db
      .query("clientActivities")
      .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
      .take(80);
    const duplicate = existing.find(
      (activity) =>
        activity.source === "Facebook" &&
        activity.category === args.category &&
        normalizeText(activity.activity) === normalizeText(args.activity) &&
        normalizeText(activity.timeframe) === normalizeText(args.timeframe),
    );
    if (duplicate) {
      await ctx.db.patch(args.postId, {
        analysisStatus: "Processed",
        updatedAt: new Date().toISOString(),
      });
      return {
        stored: false,
        reason: "duplicate_activity",
        activityId: duplicate._id,
      };
    }

    const now = new Date().toISOString();
    const activityId = await ctx.db.insert("clientActivities", {
      clientId: args.clientId,
      category: args.category,
      activity: args.activity,
      timeframe: args.timeframe,
      mentionedAt: args.mentionedAt,
      suggestedTouchpoint: args.suggestedTouchpoint,
      source: "Facebook",
      priority: args.priority,
      confidence: args.confidence,
      rationale: args.rationale,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.postId, {
      analysisStatus: "Processed",
      updatedAt: now,
    });

    return { stored: true, activityId };
  },
});

export const markFacebookPostsAnalyzed = internalMutation({
  args: {
    postIds: v.array(v.id("clientSocialPosts")),
    status: v.union(v.literal("Processed"), v.literal("Skipped")),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    for (const postId of args.postIds) {
      await ctx.db.patch(postId, {
        analysisStatus: args.status,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const failFacebookScrapeRun = internalMutation({
  args: {
    scrapeRunId: v.id("clientSocialScrapeRuns"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.scrapeRunId, {
      status: "Failed",
      completedAt: new Date().toISOString(),
      error: args.error,
      updatedAt: new Date().toISOString(),
    });
    return null;
  },
});

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeFacebookUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Facebook profile URL is required");
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}
