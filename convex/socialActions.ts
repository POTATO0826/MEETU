"use node";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";
import { action } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";

const FACEBOOK_POSTS_ACTOR_ID = "apify/facebook-posts-scraper";
const APIFY_API_BASE_URL = "https://api.apify.com/v2";
const APIFY_RUN_TIMEOUT_SECONDS = 180;
const APIFY_POLL_INTERVAL_MS = 5000;

type FacebookPostItem = Record<string, unknown>;
type ApifyRun = {
  id: string;
  status: string;
  defaultDatasetId?: string;
};
type ScrapedPost = {
  externalPostId?: string;
  postUrl?: string;
  postedAt?: string;
  text: string;
  rawPayload: FacebookPostItem;
};
type ScrapeResult = {
  scrapeRunId: Id<"clientSocialScrapeRuns">;
  providerRunId: string;
  datasetId?: string;
  itemCount: number;
  inserted: number;
  updated: number;
};
type ScrapeRunAnalysis = {
  scrapeRun: Doc<"clientSocialScrapeRuns">;
  client: Doc<"clients"> | null;
  posts: Doc<"clientSocialPosts">[];
} | null;

const clientActivityCategorySchema = z.enum([
  "Travel",
  "Family",
  "Work",
  "Health",
  "Milestone",
  "Availability",
]);
const clientActivityPrioritySchema = z.enum(["Upcoming", "Recent", "Watch"]);

const getClientForScrape = makeFunctionReference<
  "query",
  { clientId: Id<"clients"> },
  Doc<"clients"> | null
>("social:getClientForScrape");

const listClientFacebookPosts = makeFunctionReference<
  "query",
  { clientId: Id<"clients"> },
  Doc<"clientSocialPosts">[]
>("social:listClientFacebookPosts");

const startFacebookScrapeRun = makeFunctionReference<
  "mutation",
  {
    clientId: Id<"clients">;
    facebookProfileUrl: string;
    actorId: string;
  },
  Id<"clientSocialScrapeRuns">
>("social:startFacebookScrapeRun");

const completeFacebookScrapeRun = makeFunctionReference<
  "mutation",
  {
    scrapeRunId: Id<"clientSocialScrapeRuns">;
    providerRunId?: string;
    datasetId?: string;
    posts: ScrapedPost[];
  },
  { inserted: number; updated: number; itemCount: number }
>("social:completeFacebookScrapeRun");

const getScrapeRunForAnalysis = makeFunctionReference<
  "query",
  { scrapeRunId: Id<"clientSocialScrapeRuns"> },
  ScrapeRunAnalysis
>("social:getScrapeRunForAnalysis");

const storeFacebookActivity = makeFunctionReference<
  "mutation",
  {
    clientId: Id<"clients">;
    postId: Id<"clientSocialPosts">;
    category: z.infer<typeof clientActivityCategorySchema>;
    activity: string;
    timeframe: string;
    mentionedAt: string;
    suggestedTouchpoint: string;
    priority: z.infer<typeof clientActivityPrioritySchema>;
    confidence: number;
    rationale: string;
  },
  {
    stored: boolean;
    reason?: string;
    activityId?: Id<"clientActivities">;
  }
>("social:storeFacebookActivity");

const markFacebookPostsAnalyzed = makeFunctionReference<
  "mutation",
  {
    postIds: Id<"clientSocialPosts">[];
    status: "Processed" | "Skipped";
  },
  null
>("social:markFacebookPostsAnalyzed");

const failFacebookScrapeRun = makeFunctionReference<
  "mutation",
  { scrapeRunId: Id<"clientSocialScrapeRuns">; error: string },
  null
>("social:failFacebookScrapeRun");

export const scrapeClientFacebookPosts = action({
  args: {
    clientId: v.id("clients"),
    facebookProfileUrl: v.string(),
    maxPosts: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ScrapeResult> => {
    const facebookProfileUrl = normalizeFacebookUrl(args.facebookProfileUrl);
    const maxPosts = clampMaxPosts(args.maxPosts ?? 10);
    const client: Doc<"clients"> | null = await ctx.runQuery(getClientForScrape, {
      clientId: args.clientId,
    });
    if (!client) throw new Error("Client not found");

    const scrapeRunId: Id<"clientSocialScrapeRuns"> = await ctx.runMutation(
      startFacebookScrapeRun,
      {
        clientId: args.clientId,
        facebookProfileUrl,
        actorId: FACEBOOK_POSTS_ACTOR_ID,
      },
    );

    try {
      const token = requiredEnv("APIFY_TOKEN");
      const run = await callApifyActor(
        token,
        FACEBOOK_POSTS_ACTOR_ID,
        {
          startUrls: [{ url: facebookProfileUrl }],
          resultsLimit: maxPosts,
          maxItems: maxPosts,
        },
        maxPosts,
      );

      if (run.status !== "SUCCEEDED") {
        throw new Error(`Apify run finished with status ${run.status}`);
      }

      const datasetId = run.defaultDatasetId;
      const items = datasetId
        ? await listApifyDatasetItems(token, datasetId, maxPosts)
        : [];

      const posts = items.map(normalizePost).filter((post) => post.text);
      const stored: {
        inserted: number;
        updated: number;
        itemCount: number;
      } = await ctx.runMutation(
        completeFacebookScrapeRun,
        {
          scrapeRunId,
          providerRunId: run.id,
          datasetId,
          posts,
        },
      );
      await analyzeFacebookScrape(ctx, scrapeRunId);

      return {
        scrapeRunId,
        providerRunId: run.id,
        datasetId,
        itemCount: stored.itemCount,
        inserted: stored.inserted,
        updated: stored.updated,
      };
    } catch (error) {
      await ctx.runMutation(failFacebookScrapeRun, {
        scrapeRunId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
});

export const analyzeClientFacebookPosts = action({
  args: {
    clientId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    const client = await ctx.runQuery(getClientForScrape, {
      clientId: args.clientId,
    });
    if (!client) throw new Error("Client not found");

    const posts = await ctx.runQuery(listClientFacebookPosts, {
      clientId: args.clientId,
    });
    await analyzeFacebookPosts(ctx, client, posts);
    return null;
  },
});

async function analyzeFacebookScrape(
  ctx: ActionCtx,
  scrapeRunId: Id<"clientSocialScrapeRuns">,
) {
  const claimed = await ctx.runQuery(getScrapeRunForAnalysis, { scrapeRunId });
  if (!claimed?.client) return;
  await analyzeFacebookPosts(ctx, claimed.client, claimed.posts);
}

async function analyzeFacebookPosts(
  ctx: ActionCtx,
  client: Doc<"clients">,
  posts: Doc<"clientSocialPosts">[],
) {
  const pendingPosts = posts.filter(
    (post) => post.analysisStatus === "Pending" && post.text.trim(),
  );
  if (pendingPosts.length === 0) return;

  const modelId = process.env.KIMI_MODEL ?? "kimi-k2.6";
  const kimi = createOpenAICompatible({
    name: "kimi",
    apiKey: requiredEnv("KIMI_API_KEY"),
    baseURL: process.env.KIMI_BASE_URL ?? "https://api.moonshot.ai/v1",
  });
  const touchedPostIds = new Set<Id<"clientSocialPosts">>();

  const touchpointSchema = z.object({
    touchpoints: z.array(
      z.object({
        postId: z.string(),
        category: clientActivityCategorySchema,
        activity: z.string(),
        timeframe: z.string(),
        mentionedAt: z.string(),
        suggestedTouchpoint: z.string(),
        priority: clientActivityPrioritySchema,
        confidence: z.number(),
        rationale: z.string(),
      }),
    ),
  });

  try {
    const result = await generateText({
      model: kimi.chatModel(modelId),
      system: [
        "You analyze consented Facebook posts for one financial advisor.",
        "Create relationship touchpoints only when a post reveals a client life update, upcoming plan, recent event, milestone, availability context, work/family/travel/health update, or other human context worth remembering.",
        "Travel/location posts are useful touchpoints. If a post mentions a city, country, trip, day of travel, sightseeing, vacation, hiking, trail running, or hashtags like #travel, #japantravel, #shanghai, #tokyo, store it as Travel unless it is clearly not about the client.",
        "Short captions can still be useful. For example, 'Tokyo Day 1', 'Shanghai travel', or 'First time visiting Okazaki City' should become touchpoints.",
        "Return one touchpoint per useful post. Do not merely summarize raw posts as touchpoints.",
        "Do not create touchpoints from generic quotes, memes, ads, political commentary, or reshared articles with no personal/location/activity context.",
        "Keep activity and suggestedTouchpoint concise and advisor-friendly.",
        "mentionedAt must be an ISO date YYYY-MM-DD, based on the post date if available, otherwise today's date.",
        "Return only valid JSON with this shape: {\"touchpoints\":[{\"postId\":\"...\",\"category\":\"Travel|Family|Work|Health|Milestone|Availability\",\"activity\":\"...\",\"timeframe\":\"...\",\"mentionedAt\":\"YYYY-MM-DD\",\"suggestedTouchpoint\":\"...\",\"priority\":\"Upcoming|Recent|Watch\",\"confidence\":0.8,\"rationale\":\"...\"}]}",
        "If there are no touchpoints, return {\"touchpoints\":[]}.",
      ].join("\n"),
      prompt: buildFacebookAnalysisPrompt(client, pendingPosts),
      maxOutputTokens: 1800,
      providerOptions: {
        kimi: {
          thinking: { type: "disabled" },
          response_format: { type: "json_object" },
        },
      },
    });
    const parsed = touchpointSchema.parse(parseJsonObject(result.text));

    const validPostIds = new Set(pendingPosts.map((post) => post._id));
    for (const touchpoint of parsed.touchpoints.slice(0, 10)) {
      const postId = touchpoint.postId as Id<"clientSocialPosts">;
      if (!validPostIds.has(postId)) continue;
      touchedPostIds.add(postId);
      await ctx.runMutation(storeFacebookActivity, {
        clientId: client._id,
        postId,
        category: touchpoint.category,
        activity: touchpoint.activity,
        timeframe: touchpoint.timeframe,
        mentionedAt: touchpoint.mentionedAt,
        suggestedTouchpoint: touchpoint.suggestedTouchpoint,
        priority: touchpoint.priority,
        confidence: touchpoint.confidence,
        rationale: touchpoint.rationale,
      });
    }
  } catch (error) {
    console.warn("[facebook-analysis] LLM analysis failed", error);
  }

  const untouchedPostIds = pendingPosts
    .map((post) => post._id)
    .filter((postId) => !touchedPostIds.has(postId));
  if (untouchedPostIds.length > 0) {
    await ctx.runMutation(markFacebookPostsAnalyzed, {
      postIds: untouchedPostIds,
      status: "Skipped",
    });
  }
}

function buildFacebookAnalysisPrompt(
  client: Doc<"clients">,
  posts: Doc<"clientSocialPosts">[],
) {
  return [
    `Current date: ${new Date().toISOString().slice(0, 10)}`,
    `Client: ${client.name}`,
    `Client profile: ${JSON.stringify({
      status: client.status,
      location: client.location,
      occupation: client.occupation,
      serviceTopics: client.serviceTopics,
      notes: client.notes,
    })}`,
    "Scraped Facebook posts:",
    posts
      .map((post) =>
        [
          `Post ID: ${post._id}`,
          `Posted at: ${post.postedAt ?? "Unknown"}`,
          `URL: ${post.postUrl ?? "Unknown"}`,
          `Text: ${post.text}`,
        ].join("\n"),
      )
      .join("\n\n"),
  ].join("\n\n");
}

async function callApifyActor(
  token: string,
  actorId: string,
  input: Record<string, unknown>,
  maxItems: number,
) {
  const actorRunUrl = new URL(
    `${APIFY_API_BASE_URL}/acts/${encodeApifyId(actorId)}/runs`,
  );
  actorRunUrl.searchParams.set("waitForFinish", "60");
  actorRunUrl.searchParams.set("maxItems", String(maxItems));

  const startedRun = await apifyRequest<ApifyRun>(token, actorRunUrl, {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (isTerminalApifyStatus(startedRun.status)) return startedRun;

  const deadline = Date.now() + APIFY_RUN_TIMEOUT_SECONDS * 1000;
  let run = startedRun;
  while (!isTerminalApifyStatus(run.status) && Date.now() < deadline) {
    await sleep(APIFY_POLL_INTERVAL_MS);
    const runUrl = new URL(`${APIFY_API_BASE_URL}/actor-runs/${run.id}`);
    runUrl.searchParams.set("waitForFinish", "60");
    run = await apifyRequest<ApifyRun>(token, runUrl);
  }

  if (!isTerminalApifyStatus(run.status)) {
    throw new Error("Apify run did not finish before the timeout");
  }

  return run;
}

async function listApifyDatasetItems(
  token: string,
  datasetId: string,
  maxPosts: number,
) {
  const datasetUrl = new URL(
    `${APIFY_API_BASE_URL}/datasets/${encodeApifyId(datasetId)}/items`,
  );
  datasetUrl.searchParams.set("clean", "true");
  datasetUrl.searchParams.set("desc", "true");
  datasetUrl.searchParams.set("limit", String(maxPosts));

  return await apifyRequest<FacebookPostItem[]>(token, datasetUrl);
}

async function apifyRequest<T>(
  token: string,
  url: URL,
  init: RequestInit = {},
) {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "object" &&
      body.error !== null &&
      "message" in body.error &&
      typeof body.error.message === "string"
        ? body.error.message
        : text;
    throw new Error(`Apify API error ${response.status}: ${message}`);
  }

  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    body.data !== undefined
  ) {
    return body.data as T;
  }

  return body as T;
}

function encodeApifyId(id: string) {
  return id.replace("/", "~");
}

function isTerminalApifyStatus(status: string) {
  return ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePost(item: FacebookPostItem) {
  return {
    externalPostId: getString(item, [
      "postId",
      "id",
      "legacyId",
      "facebookId",
    ]),
    postUrl: getString(item, ["url", "postUrl", "link", "topLevelUrl"]),
    postedAt: parseDateString(getString(item, ["time", "date", "timestamp"])),
    text:
      getString(item, [
        "text",
        "message",
        "caption",
        "description",
        "postText",
      ]) ?? "",
    rawPayload: item,
  };
}

function getString(item: FacebookPostItem, keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function parseDateString(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return undefined;
  return new Date(parsed).toISOString();
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim()) as unknown;

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    }
  }

  throw new Error("Facebook analysis did not return valid JSON");
}

function normalizeFacebookUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Facebook profile URL is required");
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function clampMaxPosts(value: number) {
  if (!Number.isFinite(value)) return 10;
  return Math.max(1, Math.min(25, Math.floor(value)));
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
