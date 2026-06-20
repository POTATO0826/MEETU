<div align="center">

# MEETU

**The calm, AI-assisted workspace for the independent financial advisor.**

Track prospects, run the meeting schedule, and keep client profiles close — while
an intelligence layer quietly reads WhatsApp threads, scans the news, and remembers
what matters about every relationship.

<sub>Next.js 16 · React 19 · Convex · Vercel AI SDK · Tailwind v4 · Bun</sub>

<sub>Team **CHAR SIEW PAO**</sub>

</div>

---

## Team Members

**Team CHAR SIEW PAO**

- Vince Loo Yi Sheng
- Lee Shuen Fei
- Vincent Lim Zhi Chen

## Overview

Most advisor CRMs are dense dashboards that fight you through a busy day. MEETU
takes the opposite approach: a warm, paper-and-serif interface that stays readable,
backed by automation that does the note-taking for you.

It's organized as a six-part workspace, each a tab in the sidebar:

| Section             | Purpose         | What it shows                                                                 |
| ------------------- | --------------- | ----------------------------------------------------------------------------- |
| **Activity**        | Client moments  | Life events (travel, family, work, health) surfaced from conversations, with a suggested touchpoint for each. |
| **Leads**           | Pipeline        | A board of prospects by stage (New → Contacted → Qualified → Proposal → Converted). |
| **Meetings**        | Schedule        | The advisor's agenda and calendar of upcoming and past meetings.              |
| **Client Profiles** | Active book     | Active clients with allocations, accounts, goals, and service interests.      |
| **News Radar**      | Talking points  | Fresh, AI-matched news with per-client talking points to open a conversation. |
| **Memory**          | AI brain        | An interactive knowledge graph of everything the system has learned.          |

Every record opens in a side **drawer** with the full detail, so you can dig in
without losing your place in the list.

## What makes it more than a CRM

MEETU's data doesn't only come from manual entry — it's continuously enriched by an
automation layer:

- **WhatsApp ingestion.** Inbound messages arrive either through the Meta Cloud API
  webhook (`/api/whatsapp/webhook`, HMAC-verified) or a personal-number listener
  built on [Baileys](https://github.com/WhiskeySockets/Baileys). Each message is
  stored, threaded into a conversation, and queued for analysis.
- **AI conversation analysis.** A Convex agent reads each thread and extracts a
  summary, sentiment, structured facts, suggested actions, and client "activities"
  (e.g. *"mentioned a trip to Japan in March"*) — each with a confidence score and a
  suggested follow-up.
- **News radar.** Headlines are scraped via [Apify](https://apify.com), then matched
  to individual clients and leads with AI-generated talking points and a relevance
  score, so every outreach has a natural hook.
- **Social context.** A client's public Facebook posts can be scraped on demand to
  add real-world context to their profile.
- **Long-term memory.** Learned facts are persisted to a [mem0](https://mem0.ai)
  knowledge graph and rendered as a live, force-directed graph in the Memory tab.

The model layer is provider-agnostic through the **Vercel AI SDK** — point it at
OpenAI or any OpenAI-compatible endpoint (Moonshot / Kimi is wired in out of the box).

## Challenge & Approach

> **Track:** _<add the track you're submitting under>_

**The problem.** Independent financial advisors don't lose clients because they give
bad advice — they lose them because they drop the thread. The signal that matters
(a client mentioning a new baby, a job change, or a trip) is buried in WhatsApp
chats and social feeds, while the tools meant to help are bloated CRMs that demand
constant manual data entry. The admin work crowds out the relationship.

**Why this track.** We wanted to show that AI is most valuable not as a chatbot bolted
onto an app, but as an invisible layer that does the tedious work a person would
otherwise skip: reading every message, remembering every detail, and surfacing the
right moment to reach out.

**Our approach.**

- **Capture where conversations already happen.** Rather than asking advisors to log
  notes, we ingest WhatsApp directly (Meta Cloud API + a Baileys bridge for personal
  numbers) and pull public social context on demand.
- **Turn raw messages into structured memory.** A Convex-hosted AI agent extracts
  facts, sentiment, suggested actions, and life events from each thread, then persists
  them to a mem0 knowledge graph the advisor can actually browse.
- **Make outreach effortless.** The News Radar matches fresh, scraped headlines to
  each client with ready-to-use talking points — turning "I should check in" into a
  concrete, relevant reason to call.
- **Keep the human in a calm space.** All of this feeds a deliberately unhurried,
  editorial interface, so the advisor sees insight, not a wall of dashboards.

The result is a workspace that feels like a thoughtful assistant: it watches the
boring parts so the advisor can focus on the conversation.

## The Meetings view

The Meetings page has two layouts, switchable from the header:

- **Agenda** — meetings grouped by day (Today, Tomorrow, weekdays), with an
  `Upcoming / Past` filter. The next meeting is marked with an accent rail.
- **Calendar** — a month grid where each day shows its meetings as color-coded
  chips (by status). Navigate months with the arrows or jump back with **Today**;
  click any meeting to open its detail drawer.

Both layouts share the same data and the same meeting drawer.

## Tech stack

| Layer          | Choice                                                                            |
| -------------- | --------------------------------------------------------------------------------- |
| Framework      | **Next.js 16** (App Router) with the **React 19** compiler                        |
| UI             | **React Server & Client Components**, **Tailwind CSS v4** (custom editorial theme) |
| Backend        | **Convex** — real-time database, server functions, scheduling, and actions        |
| AI             | **Vercel AI SDK** (`@ai-sdk/openai-compatible`) — OpenAI / Kimi (Moonshot)        |
| Memory         | **mem0** knowledge graph                                                           |
| Messaging      | **WhatsApp** via Meta Cloud API webhook + **Baileys** listener                    |
| Scraping       | **Apify** (news headlines, Facebook posts)                                        |
| Visualization  | **three.js** backdrop, **react-force-graph-2d** memory graph                      |
| Language / RT  | **TypeScript**, runs on **Bun**                                                   |

The editorial theme uses warm paper surfaces, a Newsreader serif display face,
Hanken Grotesk body text, and indigo / sage / clay / gold accents.

> **Note:** this project tracks a custom build of Next.js. Before changing code,
> read the relevant guide in `node_modules/next/dist/docs/` — APIs and conventions
> may differ from a stock Next.js install (see `AGENTS.md`).

## Getting started

### 1. Install

```bash
bun install
```

### 2. Configure environment

Create `.env.local` (frontend / Next.js) and set the Convex deployment's variables
with `npx convex env set <KEY> <VALUE>`.

| Variable                        | Where    | Purpose                                                        |
| ------------------------------- | -------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_CONVEX_URL`        | Next.js  | Convex deployment URL (set automatically by `convex dev`).     |
| `AI_PROVIDER`                   | Convex   | `kimi` to use Moonshot; otherwise OpenAI is used when keyed.   |
| `OPENAI_API_KEY` / `OPENAI_MODEL` / `OPENAI_BASE_URL` | Convex | OpenAI-compatible model config. |
| `KIMI_API_KEY` / `KIMI_MODEL` / `KIMI_BASE_URL`       | Convex | Moonshot / Kimi model config.   |
| `MEM0_API_KEY`                  | Convex   | Long-term memory graph.                                        |
| `APIFY_TOKEN` / `APIFY_ACTOR_ID`| Convex   | News scraping (Facebook actor is built in).                    |
| `WHATSAPP_VERIFY_TOKEN` / `WHATSAPP_APP_SECRET` | Next.js | Meta Cloud API webhook verification + signature check. |
| `INTERNAL_INGEST_SECRET`        | both     | Shared secret between the Baileys listener and the app.        |
| `BAILEYS_AUTH_DIR` / `NEXT_INTERNAL_BASE_URL` | listener | Baileys session storage and app base URL.        |

### 3. Run

```bash
bun run convex:dev   # start the Convex backend (and codegen)
bun dev              # start the Next.js dev server
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Optional services

```bash
bun run whatsapp:baileys   # connect a personal WhatsApp number via QR code
```

### Other scripts

```bash
bun run build           # production build
bun start               # serve the production build
bun run lint            # eslint
bun run convex:codegen  # regenerate Convex types
```

## Project structure

```
convex/                 # Convex backend
  schema.ts             # data model (advisors, leads, clients, meetings, …)
  crm.ts                # core CRM queries + mutations
  whatsapp.ts           # message ingestion + threading
  conversationAgent*.ts # AI analysis of conversations
  news*.ts              # news scraping + per-person talking points
  social*.ts            # Facebook scraping (Apify)
  memory.ts / graph*.ts # mem0 knowledge graph
  seed.ts / reset.ts    # demo data + utilities

src/
  app/
    (app)/              # authenticated workspace routes + shared layout
      activity/         # client moments feed
      leads/            # pipeline board
      meetings/         # agenda + calendar (+ new meeting)
      clients/          # client directory and profiles
      news/             # news radar
      graph/            # memory explorer
    api/whatsapp/       # Meta Cloud API webhook
    api/internal/       # internal ingest route (Baileys → app)
    page.tsx            # landing page
    layout.tsx          # root layout, fonts, global styles
  components/
    nav.tsx             # sidebar navigation
    drawer.tsx          # shared side-drawer primitive
    ui.tsx              # status pills, avatars, shared bits
    activity/           # activity board
    meetings/           # agenda, calendar, meeting row + drawer
    leads/              # board, cards, drawer
    clients/            # directory, cards, allocation bar, scrape control
    news/               # news radar
    memory/             # force-directed memory graph + panel
    backdrop/           # animated background
  lib/                  # client-side types, formatting, and helpers
scripts/
  baileys-listener.ts   # personal-number WhatsApp bridge
```

The Convex `seed.ts` populates a realistic demo dataset, so the workspace is fully
explorable before any live integrations are wired up.
