"use node";

import { generateText } from "ai";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { buildChatModel, type ChatModel } from "./aiModel";

// Only keep real article URLs (drop nav/newsletter/jobs/tag pages).
const ARTICLE_URL = /sinchew\.com\.my\/news\//i;
const MAX_ARTICLES = 20;
const TOP_ARTICLES_PER_PERSON = 3;
const BODY_CHAR_LIMIT = 5000;

type SavedArticle = {
  id: string;
  url: string;
  title: string;
  englishTitle?: string;
  category?: string;
  summary?: string;
  bodyText?: string;
};

type EnrichedArticle = SavedArticle & {
  index: number;
  displayTitle: string;
};

type PersonProfile = {
  kind: "Client" | "Lead";
  id: string;
  name: string;
  slug?: string;
  occupation: string;
  profileText: string;
};

// How long the scraped headline pool stays "fresh" before a topic search
// triggers a new scrape.
const POOL_STALE_MS = 6 * 60 * 60 * 1000;
const TOPIC_MATCH_LIMIT = 4;

type PoolArticle = {
  id: string;
  url: string;
  title: string;
  englishTitle?: string;
  category?: string;
  bodyText?: string;
  scrapedAt: string;
};

export type TopicResult = {
  articleUrl: string;
  headline: string;
  source: string;
  summary: string;
  whyRelevant: string;
  talkingPoints: string[];
  relevanceScore: number;
};

export type TopicSearchResponse = {
  scrapedFresh: boolean;
  poolSize: number;
  tailoredTo: string | null;
  results: TopicResult[];
};

export const searchTopic = action({
  args: {
    query: v.string(),
    clientId: v.optional(v.id("clients")),
    leadId: v.optional(v.id("leads")),
  },
  handler: async (ctx, args): Promise<TopicSearchResponse> => {
    const query = args.query.trim();
    if (!query) {
      return { scrapedFresh: false, poolSize: 0, tailoredTo: null, results: [] };
    }

    const model = buildChatModel("news research");

    // 1. Load the recent article pool; scrape + translate fresh if stale.
    const { pool, scrapedFresh } = await ensurePool(ctx, model);
    if (pool.length === 0) {
      return { scrapedFresh, poolSize: 0, tailoredTo: null, results: [] };
    }

    // 2. Optional person to tailor talking points to.
    const person = await ctx.runQuery(internal.news.getPersonProfile, {
      clientId: args.clientId,
      leadId: args.leadId,
    });

    const indexed = pool.map((a, index) => ({
      ...a,
      index,
      displayTitle: a.englishTitle ?? a.title,
    }));

    // 3. Rank the pool against the typed topic.
    const picks = await rankByTopic(model, query, indexed);
    let chosen = picks
      .map((i) => indexed[i])
      .filter((a): a is (typeof indexed)[number] => Boolean(a))
      .slice(0, TOPIC_MATCH_LIMIT);

    // Deterministic fallback: if the AI ranker found nothing but the query
    // matches a stored news category (e.g. tapping a "Health" / "Politics"
    // chip), select those articles directly so chips always return results.
    if (chosen.length === 0) {
      const q = query.toLowerCase();
      chosen = indexed
        .filter((a) => a.category && a.category.toLowerCase() === q)
        .slice(0, TOPIC_MATCH_LIMIT);
    }

    if (chosen.length === 0) {
      return {
        scrapedFresh,
        poolSize: pool.length,
        tailoredTo: person?.name ?? null,
        results: [],
      };
    }

    // 4. Deep-read the chosen articles (cache bodies).
    const bodies = new Map<string, string>();
    for (const article of chosen) {
      if (article.bodyText) {
        bodies.set(article.url, article.bodyText);
        continue;
      }
      const body = await fetchArticleBody(article.url);
      if (body) {
        bodies.set(article.url, body);
        await ctx.runMutation(internal.news.cacheArticleBody, {
          id: article.id as Id<"newsArticles">,
          bodyText: body,
        });
      }
    }

    // 5. Turn the topic + articles into talking points.
    const summarized = await summarizeTopic(
      model,
      query,
      person,
      chosen.map((a) => ({
        ref: a.index,
        title: a.displayTitle,
        body: bodies.get(a.url) ?? a.displayTitle,
      })),
    );

    const results: TopicResult[] = summarized
      .map((r) => {
        const article = indexed[r.ref];
        if (!article) return null;
        return {
          articleUrl: article.url,
          headline: r.headline || article.displayTitle,
          source: "Sin Chew Daily",
          summary: r.summary,
          whyRelevant: r.whyRelevant,
          talkingPoints: r.talkingPoints.slice(0, 4),
          relevanceScore: clampScore(r.relevanceScore),
        };
      })
      .filter((r): r is TopicResult => r !== null)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      scrapedFresh,
      poolSize: pool.length,
      tailoredTo: person?.name ?? null,
      results,
    };
  },
});

// Prepares the article pool for the topic-search UI: scrapes if stale and makes
// sure every headline has an English title + category (so the suggested-topic
// chips, which read those categories, are always populated). Returns nothing —
// the page reads results via the reactive `suggestedTopics` query.
export const prepareTopics = action({
  args: {},
  handler: async (ctx): Promise<{ poolSize: number; scrapedFresh: boolean }> => {
    const model = buildChatModel("news research");
    const { pool, scrapedFresh } = await ensurePool(ctx, model);

    const untranslated: SavedArticle[] = pool
      .filter((a) => !a.englishTitle)
      .map((a) => ({ id: a.id, url: a.url, title: a.title }));
    if (untranslated.length > 0) {
      await translateHeadlines(ctx, model, untranslated);
    }

    return { poolSize: pool.length, scrapedFresh };
  },
});

function isStale(pool: PoolArticle[]): boolean {
  const newest = pool.reduce((max, a) => {
    const t = new Date(a.scrapedAt).getTime();
    return Number.isFinite(t) && t > max ? t : max;
  }, 0);
  return Date.now() - newest > POOL_STALE_MS;
}

async function ensurePool(
  ctx: ActionCtx,
  model: ChatModel,
): Promise<{ pool: PoolArticle[]; scrapedFresh: boolean }> {
  let pool: PoolArticle[] = await ctx.runQuery(internal.news.getArticlePool, {});
  if (pool.length > 0 && !isStale(pool)) {
    return { pool, scrapedFresh: false };
  }

  const saved = await scrapeAndSave(ctx);
  if (saved.length > 0) {
    // Translate + categorize new headlines so the topic chips stay populated.
    await translateHeadlines(ctx, model, saved);
  }
  pool = await ctx.runQuery(internal.news.getArticlePool, {});
  return { pool, scrapedFresh: true };
}

async function scrapeAndSave(ctx: ActionCtx): Promise<SavedArticle[]> {
  const scraped = await fetchSinchewHeadlines();
  const articles = dedupeArticles(scraped)
    .filter((a) => ARTICLE_URL.test(a.url))
    .slice(0, MAX_ARTICLES);
  if (articles.length === 0) return [];
  return await ctx.runMutation(internal.news.saveArticles, { articles });
}

type IndexedArticle = {
  index: number;
  url: string;
  displayTitle: string;
};

async function rankByTopic(
  model: ChatModel,
  query: string,
  articles: IndexedArticle[],
): Promise<number[]> {
  const list = articles
    .map((a) => `${a.index}. ${a.displayTitle}`)
    .join("\n");

  const prompt = [
    "A financial advisor wants to start a conversation with a customer about this topic:",
    `"${query}"`,
    "",
    "Here are current news headlines:",
    list,
    "",
    `Pick up to ${TOPIC_MATCH_LIMIT} headlines that relate to that topic, even loosely (same theme, sector, or angle).`,
    "Be generous: if a headline could plausibly be used to bring up the topic, include it. Only return an empty array if nothing is even loosely related.",
    "Return ONLY a JSON array of headline numbers, e.g. [2,5,9].",
  ].join("\n");

  const result = await generateText({ model, prompt, maxOutputTokens: 3000 });
  const parsed = parseJsonArray(result.text);
  const indices = parsed
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 0 && n < articles.length);
  return Array.from(new Set(indices)).slice(0, TOPIC_MATCH_LIMIT);
}

type TopicSummary = {
  ref: number;
  headline: string;
  summary: string;
  whyRelevant: string;
  talkingPoints: string[];
  relevanceScore: number;
};

async function summarizeTopic(
  model: ChatModel,
  query: string,
  person: { kind: string; name: string; profileText: string } | null,
  articles: Array<{ ref: number; title: string; body: string }>,
): Promise<TopicSummary[]> {
  const blocks = articles
    .map(
      (a) =>
        `--- Article ref ${a.ref} ---\nTitle: ${a.title}\nContent (may contain page noise, focus on the news):\n${a.body}`,
    )
    .join("\n\n");

  const personLines = person
    ? [
        "",
        `Tailor the talking points to this specific ${person.kind.toLowerCase()}:`,
        person.profileText,
      ]
    : [];

  const prompt = [
    "You are a sales enablement assistant for a financial advisor.",
    `The advisor wants to start a conversation around this topic: "${query}".`,
    "For each article below, write content the advisor can use to bring up that topic naturally.",
    "Everything must be in clear, professional English.",
    ...personLines,
    "",
    blocks,
    "",
    "For each article return an object with:",
    '- "ref": the article ref number',
    '- "headline": a short English headline for the article',
    '- "summary": 1-2 sentence neutral summary of the actual news',
    `- "whyRelevant": 1 sentence on how it connects to the topic "${query}"${person ? " and this person" : ""}`,
    '- "talkingPoints": array of 2-3 short, natural conversation openers the advisor can say',
    '- "relevanceScore": integer 0-100 for how well it fits the topic',
    "Return ONLY a JSON array of these objects.",
  ].join("\n");

  const result = await generateText({ model, prompt, maxOutputTokens: 6000 });
  const parsed = parseJsonArray(result.text);

  return parsed
    .map((entry) => {
      const obj = entry as Record<string, unknown>;
      const points = Array.isArray(obj.talkingPoints)
        ? obj.talkingPoints.map((p) => String(p)).filter(Boolean)
        : [];
      return {
        ref: Number(obj.ref),
        headline: String(obj.headline ?? "").trim(),
        summary: String(obj.summary ?? "").trim(),
        whyRelevant: String(obj.whyRelevant ?? "").trim(),
        talkingPoints: points,
        relevanceScore: Number(obj.relevanceScore ?? 0),
      };
    })
    .filter((r) => Number.isInteger(r.ref) && r.talkingPoints.length > 0);
}

export const runNewsResearch = internalAction({
  args: { runId: v.id("newsRuns") },
  handler: async (ctx, args) => {
    try {
      // 1. Pull the latest Sin Chew headlines via the Apify actor.
      const scraped = await fetchSinchewHeadlines();
      const articlesInput = dedupeArticles(scraped)
        .filter((a) => ARTICLE_URL.test(a.url))
        .slice(0, MAX_ARTICLES);

      const saved: SavedArticle[] = await ctx.runMutation(
        internal.news.saveArticles,
        { articles: articlesInput },
      );

      if (saved.length === 0) {
        await ctx.runMutation(internal.news.completeRun, {
          runId: args.runId,
          articlesFetched: 0,
          suggestionsCreated: 0,
          peopleConsidered: 0,
        });
        return null;
      }

      const model = buildChatModel("news research");

      // 2. Translate any headlines that don't yet have an English title.
      await translateHeadlines(ctx, model, saved);

      const articles: EnrichedArticle[] = saved.map((a, index) => ({
        ...a,
        index,
        displayTitle: a.englishTitle ?? a.title,
      }));

      // 3. Load the people to match against and reset previous suggestions.
      const inputs = await ctx.runQuery(internal.news.getResearchInputs, {});
      await ctx.runMutation(internal.news.clearSuggestions, {});

      const people: PersonProfile[] = [
        ...inputs.clients.map(clientProfile),
        ...inputs.leads.map(leadProfile),
      ];

      const bodyCache = new Map<string, string>();
      for (const a of articles) {
        if (a.bodyText) bodyCache.set(a.url, a.bodyText);
      }

      // Research people with bounded concurrency to keep wall-clock time down
      // without hammering the model's rate limits.
      const counts = await mapWithConcurrency(people, 3, (person) =>
        researchPerson(ctx, model, person, articles, bodyCache, args.runId),
      );
      const suggestionsCreated = counts.reduce((a, b) => a + b, 0);

      await ctx.runMutation(internal.news.completeRun, {
        runId: args.runId,
        articlesFetched: saved.length,
        suggestionsCreated,
        peopleConsidered: people.length,
      });
      return null;
    } catch (error) {
      await ctx.runMutation(internal.news.failRun, {
        runId: args.runId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  },
});

// ---------------------------------------------------------------------------
// Per-person research (stage 1 rank -> deep-read -> stage 2 talking points)
// ---------------------------------------------------------------------------

async function researchPerson(
  ctx: ActionCtx,
  model: ChatModel,
  person: PersonProfile,
  articles: EnrichedArticle[],
  bodyCache: Map<string, string>,
  runId: Id<"newsRuns">,
): Promise<number> {
  const picks = await rankHeadlines(model, person, articles);
  if (picks.length === 0) return 0;

  const chosen = picks
    .map((i) => articles[i])
    .filter((a): a is EnrichedArticle => Boolean(a))
    .slice(0, TOP_ARTICLES_PER_PERSON);
  if (chosen.length === 0) return 0;

  // Ensure we have the full article body for each chosen article (cached).
  for (const article of chosen) {
    if (bodyCache.has(article.url)) continue;
    const body = await fetchArticleBody(article.url);
    if (body) {
      bodyCache.set(article.url, body);
      await ctx.runMutation(internal.news.cacheArticleBody, {
        id: article.id as Id<"newsArticles">,
        bodyText: body,
      });
    }
  }

  const results = await summarizeForPerson(
    model,
    person,
    chosen.map((a) => ({
      ref: a.index,
      title: a.displayTitle,
      body: bodyCache.get(a.url) ?? a.displayTitle,
    })),
  );

  const suggestions = results
    .map((r) => {
      const article = articles[r.ref];
      if (!article) return null;
      return {
        targetType: person.kind,
        clientId:
          person.kind === "Client" ? (person.id as Id<"clients">) : undefined,
        leadId:
          person.kind === "Lead" ? (person.id as Id<"leads">) : undefined,
        targetName: person.name,
        targetSlug: person.slug,
        targetOccupation: person.occupation,
        articleUrl: article.url,
        headline: article.displayTitle,
        source: "Sin Chew Daily",
        summary: r.summary,
        whyRelevant: r.whyRelevant,
        talkingPoints: r.talkingPoints.slice(0, 4),
        relevanceScore: clampScore(r.relevanceScore),
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  if (suggestions.length === 0) return 0;

  const inserted: number = await ctx.runMutation(
    internal.news.insertSuggestions,
    { runId, suggestions },
  );
  return inserted;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index]);
      }
    })(),
  );
  await Promise.all(runners);
  return results;
}

// ---------------------------------------------------------------------------
// Apify
// ---------------------------------------------------------------------------

type ScrapedArticle = {
  url: string;
  title: string;
  source: string;
  scrapedAt?: string;
};

async function fetchSinchewHeadlines(): Promise<ScrapedArticle[]> {
  const token = requiredEnv("APIFY_TOKEN");
  const actorId = requiredEnv("APIFY_ACTOR_ID").replace("/", "~");
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(
        `Apify run failed (${response.status}): ${await safeText(response)}`,
      );
    }
    const items = (await response.json()) as Array<Record<string, unknown>>;
    return items
      .map((item) => ({
        url: String(item.url ?? ""),
        title: String(item.title ?? "").trim(),
        source: String(item.source ?? "Sin Chew Daily"),
        scrapedAt:
          typeof item.scrapedAt === "string" ? item.scrapedAt : undefined,
      }))
      .filter((item) => item.url && item.title);
  } finally {
    clearTimeout(timeout);
  }
}

function dedupeArticles(articles: ScrapedArticle[]): ScrapedArticle[] {
  const seen = new Set<string>();
  const out: ScrapedArticle[] = [];
  for (const article of articles) {
    if (seen.has(article.url)) continue;
    seen.add(article.url);
    out.push(article);
  }
  return out;
}

async function fetchArticleBody(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MeetuNewsRadar/1.0; +https://meetu.app)",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return htmlToText(await response.text());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function htmlToText(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  // Prefer paragraph text — Sin Chew article bodies live in <p> tags.
  const paragraphs = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripTags(m[1]).trim())
    .filter((t) => t.length > 18);

  let text = paragraphs.join("\n");
  if (text.length < 200) text = stripTags(cleaned);

  return collapseWhitespace(text).slice(0, BODY_CHAR_LIMIT);
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "));
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function collapseWhitespace(text: string): string {
  return text.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
}

// ---------------------------------------------------------------------------
// KIMI stages
// ---------------------------------------------------------------------------

async function translateHeadlines(
  ctx: ActionCtx,
  model: ChatModel,
  saved: SavedArticle[],
): Promise<void> {
  const pending = saved.filter((a) => !a.englishTitle);
  if (pending.length === 0) return;

  const list = pending
    .map((a, i) => `${i}. ${a.title}`)
    .join("\n");

  const prompt = [
    "Translate these Malaysian (Sin Chew) news headlines into concise English.",
    "Also give a one or two word category (e.g. Economy, Markets, Politics, Property, Tax, Crime, Sports, Health, Local).",
    'Return ONLY a JSON array like: [{"index":0,"englishTitle":"...","category":"..."}]',
    "",
    list,
  ].join("\n");

  // kimi-k2.6 is a reasoning model: it spends completion tokens "thinking"
  // before emitting the answer, so the budget must be generous or the visible
  // text comes back empty (finish_reason: length).
  const result = await generateText({
    model,
    prompt,
    maxOutputTokens: 8000,
  });

  const parsed = parseJsonArray(result.text);
  const items: Array<{
    id: Id<"newsArticles">;
    englishTitle: string;
    category: string;
  }> = [];

  for (const entry of parsed) {
    const idx = Number((entry as Record<string, unknown>).index);
    const article = pending[idx];
    if (!article) continue;
    const englishTitle = String(
      (entry as Record<string, unknown>).englishTitle ?? "",
    ).trim();
    if (!englishTitle) continue;
    items.push({
      id: article.id as Id<"newsArticles">,
      englishTitle,
      category: String(
        (entry as Record<string, unknown>).category ?? "News",
      ).trim(),
    });
    article.englishTitle = englishTitle;
    article.category = items[items.length - 1].category;
  }

  if (items.length > 0) {
    await ctx.runMutation(internal.news.updateArticleTranslations, { items });
  }
}

async function rankHeadlines(
  model: ChatModel,
  person: PersonProfile,
  articles: EnrichedArticle[],
): Promise<number[]> {
  const list = articles
    .map((a) => `${a.index}. ${a.displayTitle}`)
    .join("\n");

  const prompt = [
    "You help a financial advisor find news that is genuinely useful as a conversation starter with this specific person.",
    "",
    `Person (${person.kind}):`,
    person.profileText,
    "",
    "Headlines:",
    list,
    "",
    `Pick the up to ${TOP_ARTICLES_PER_PERSON} headlines most relevant to this person's financial situation, goals, profession, or location.`,
    "Only include headlines with a real, non-generic connection. If none fit, return an empty array.",
    'Return ONLY a JSON array of headline numbers, e.g. [3,7,12].',
  ].join("\n");

  const result = await generateText({ model, prompt, maxOutputTokens: 3000 });
  const parsed = parseJsonArray(result.text);
  const indices = parsed
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 0 && n < articles.length);
  return Array.from(new Set(indices)).slice(0, TOP_ARTICLES_PER_PERSON);
}

type PersonResult = {
  ref: number;
  summary: string;
  whyRelevant: string;
  talkingPoints: string[];
  relevanceScore: number;
};

async function summarizeForPerson(
  model: ChatModel,
  person: PersonProfile,
  articles: Array<{ ref: number; title: string; body: string }>,
): Promise<PersonResult[]> {
  const blocks = articles
    .map(
      (a) =>
        `--- Article ref ${a.ref} ---\nTitle: ${a.title}\nContent (may contain page noise, focus on the news):\n${a.body}`,
    )
    .join("\n\n");

  const prompt = [
    "You are a sales enablement assistant for a financial advisor.",
    "For each article below, write content the advisor can use to start a conversation with this person.",
    "Everything you write must be in clear, professional English.",
    "",
    `Person (${person.kind}):`,
    person.profileText,
    "",
    blocks,
    "",
    "For each article return an object with:",
    '- "ref": the article ref number',
    '- "summary": 1-2 sentence neutral summary of the actual news',
    '- "whyRelevant": 1 sentence on why it matters to THIS person specifically',
    '- "talkingPoints": array of 2-3 short, natural conversation openers the advisor can say',
    '- "relevanceScore": integer 0-100',
    'Return ONLY a JSON array of these objects.',
  ].join("\n");

  const result = await generateText({ model, prompt, maxOutputTokens: 6000 });
  const parsed = parseJsonArray(result.text);

  return parsed
    .map((entry) => {
      const obj = entry as Record<string, unknown>;
      const points = Array.isArray(obj.talkingPoints)
        ? obj.talkingPoints.map((p) => String(p)).filter(Boolean)
        : [];
      return {
        ref: Number(obj.ref),
        summary: String(obj.summary ?? "").trim(),
        whyRelevant: String(obj.whyRelevant ?? "").trim(),
        talkingPoints: points,
        relevanceScore: Number(obj.relevanceScore ?? 0),
      };
    })
    .filter(
      (r) =>
        Number.isInteger(r.ref) &&
        r.summary.length > 0 &&
        r.talkingPoints.length > 0,
    );
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

function clientProfile(c: {
  id: string;
  slug: string;
  name: string;
  occupation: string;
  location: string;
  serviceTopics: string[];
  goals: string[];
  riskTolerance: string;
  situation: string;
}): PersonProfile {
  return {
    kind: "Client",
    id: c.id,
    slug: c.slug,
    name: c.name,
    occupation: c.occupation,
    profileText: [
      `Name: ${c.name}`,
      `Occupation: ${c.occupation}`,
      `Location: ${c.location}`,
      `Service topics: ${c.serviceTopics.join(", ") || "n/a"}`,
      `Goals: ${c.goals.join(", ") || "n/a"}`,
      `Risk tolerance: ${c.riskTolerance}`,
      `Situation: ${c.situation}`,
    ].join("\n"),
  };
}

function leadProfile(l: {
  id: string;
  name: string;
  occupation: string;
  location: string;
  serviceInterest: string;
  situation: string;
  whyApproached: string;
}): PersonProfile {
  return {
    kind: "Lead",
    id: l.id,
    name: l.name,
    occupation: l.occupation,
    profileText: [
      `Name: ${l.name}`,
      `Occupation: ${l.occupation}`,
      `Location: ${l.location}`,
      `Service interest: ${l.serviceInterest}`,
      `Situation: ${l.situation}`,
      `Why approached: ${l.whyApproached}`,
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function parseJsonArray(text: string): unknown[] {
  const direct = tryParse(text);
  if (Array.isArray(direct)) return direct;

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end > start) {
    const slice = tryParse(text.slice(start, end + 1));
    if (Array.isArray(slice)) return slice;
  }
  return [];
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "";
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for news research`);
  return value;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
