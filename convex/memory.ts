import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Memory graph — the full "second brain" network, built from REAL data.
//
// The client-side MemoryGraph engine handles progressive disclosure (it derives
// tiers from the graph: hub -> tier-1 people -> tier-2 detail), so this query
// returns the whole connected graph at once:
//   advisor hub  ──►  people (clients + leads)  ──►  meetings / notes /
//                     decisions (tasks) / ideas (talking points) /
//                     documents / conversation insights
// ---------------------------------------------------------------------------

export type MemoryNodeType =
  | "advisor"
  | "person"
  | "meeting"
  | "note"
  | "decision"
  | "idea"
  | "document";

export type MemoryNode = {
  id: string;
  type: MemoryNodeType;
  label: string;
  sub?: string;
  conf?: number;
  summary?: string;
  insight?: string;
  source?: string;
  date?: string;
  tags?: string[];
  clientId?: string;
};

export type MemoryEdge = [string, string];

export type MemoryGraphData = { nodes: MemoryNode[]; edges: MemoryEdge[] };

const MAX_CLIENTS = 10;
const MAX_LEADS = 6;
const PER_PERSON = {
  meetings: 4,
  tasks: 4,
  analyses: 3,
  suggestions: 3,
  notes: 3,
  documents: 2,
};

export const graph = query({
  args: {},
  handler: async (ctx): Promise<MemoryGraphData> => {
    const nodes: MemoryNode[] = [];
    const edges: MemoryEdge[] = [];
    const add = (node: MemoryNode, parentId?: string) => {
      nodes.push(node);
      if (parentId) edges.push([parentId, node.id]);
    };

    // --- Tier 0: the advisor hub ---
    const advisor = await ctx.db.query("advisors").first();
    const hubId = "advisor:hub";
    add({
      id: hubId,
      type: "advisor",
      label: "You",
      sub: advisor?.name ?? "Financial Advisor",
      conf: 1,
      summary:
        "Your second brain — every client, conversation, idea and decision as one connected memory.",
      source: "MEETU",
    });

    const [clients, leads] = await Promise.all([
      ctx.db.query("clients").order("desc").take(MAX_CLIENTS),
      ctx.db.query("leads").order("desc").take(MAX_LEADS),
    ]);

    // --- Tier 1: people (clients + leads), each a "main topic" ---
    for (const client of clients) {
      const personId = `client:${client._id}`;
      add(
        {
          id: personId,
          type: "person",
          label: client.name,
          sub: client.occupation,
          conf: 0.92,
          summary: client.description || client.situation,
          insight: client.whyApproached || undefined,
          source: "Client profile",
          date: client.clientSince,
          tags: client.serviceTopics.slice(0, 4),
          clientId: client._id,
        },
        hubId,
      );
      await addClientChildren(ctx, client, personId, edges, nodes);
    }

    for (const lead of leads) {
      const personId = `lead:${lead._id}`;
      add(
        {
          id: personId,
          type: "person",
          label: lead.name,
          sub: `${lead.occupation} · Lead`,
          conf: 0.55,
          summary: lead.situation || lead.situationTeaser,
          insight: lead.whyApproached || undefined,
          source: "Lead",
          date: lead.addedDate,
          tags: [lead.serviceInterest, lead.status],
        },
        hubId,
      );
      await addLeadChildren(ctx, lead, personId, edges, nodes);
    }

    return { nodes, edges };
  },
});

// ---------------------------------------------------------------------------
// Per-person children
// ---------------------------------------------------------------------------

async function addClientChildren(
  ctx: QueryCtx,
  client: Doc<"clients">,
  personId: string,
  edges: MemoryEdge[],
  nodes: MemoryNode[],
): Promise<void> {
  const add = (node: MemoryNode) => {
    nodes.push(node);
    edges.push([personId, node.id]);
  };

  // Freeform notes
  client.notes.slice(0, PER_PERSON.notes).forEach((note, i) => {
    add({
      id: `cnote:${client._id}:${i}`,
      type: "note",
      label: shorten(note, 22),
      sub: "Note",
      conf: 0.7,
      summary: note,
      source: "Manual note",
      clientId: client._id,
    });
  });

  // Meetings
  const meetings = await ctx.db
    .query("meetings")
    .withIndex("by_client", (q) => q.eq("clientId", client._id))
    .order("desc")
    .take(PER_PERSON.meetings);
  for (const m of meetings) {
    add({
      id: `meeting:${m._id}`,
      type: "meeting",
      label: m.title,
      sub: m.start.slice(0, 10),
      conf: m.status === "Completed" ? 0.95 : 0.8,
      summary: m.purpose,
      insight: m.agenda[0],
      source: "Calendar",
      date: m.start,
      tags: [m.topic, m.mode],
      clientId: client._id,
    });
  }

  // Decisions (follow-up tasks)
  const tasks = await ctx.db
    .query("advisorTasks")
    .withIndex("by_client", (q) => q.eq("clientId", client._id))
    .take(PER_PERSON.tasks + 2);
  for (const t of tasks
    .filter((x) => x.status !== "Dismissed")
    .slice(0, PER_PERSON.tasks)) {
    add({
      id: `task:${t._id}`,
      type: "decision",
      label: shorten(t.title, 24),
      sub: t.status,
      conf: 0.75,
      summary: t.detail || t.title,
      insight: t.dueDate ? `Due ${t.dueDate}` : undefined,
      source: "Follow-up",
      date: t.dueDate,
      clientId: client._id,
    });
  }

  // Ideas (News Radar talking points)
  const suggestions = await ctx.db
    .query("topicSuggestions")
    .withIndex("by_client", (q) => q.eq("clientId", client._id))
    .order("desc")
    .take(PER_PERSON.suggestions);
  for (const s of suggestions) {
    add({
      id: `idea:${s._id}`,
      type: "idea",
      label: shorten(s.headline, 24),
      sub: "Talking point",
      conf: clamp01(s.relevanceScore / 100),
      summary: s.summary,
      insight: s.whyRelevant,
      source: s.source,
      tags: s.talkingPoints.slice(0, 2).map((p) => shorten(p, 28)),
      clientId: client._id,
    });
  }

  // Conversation insights (AI message analyses)
  const analyses = await ctx.db
    .query("messageAnalyses")
    .withIndex("by_client", (q) => q.eq("clientId", client._id))
    .order("desc")
    .take(PER_PERSON.analyses);
  for (const a of analyses) {
    add({
      id: `analysis:${a._id}`,
      type: "note",
      label: shorten(a.summary, 22),
      sub: `Insight · ${a.sentiment}`,
      conf: avgConfidence(a.suggestedActions) ?? 0.72,
      summary: a.summary,
      insight: a.suggestedActions[0]?.title,
      source: "WhatsApp AI",
      date: a.createdAt.slice(0, 10),
      clientId: client._id,
    });
  }

  // Documents (sparse WhatsApp documents)
  const docs = await clientDocuments(ctx, client._id, PER_PERSON.documents);
  for (const d of docs) {
    add({
      id: `doc:${d._id}`,
      type: "document",
      label: shorten(d.body || "Document", 22),
      sub: "Document",
      conf: 0.6,
      summary: d.body || "A document shared over WhatsApp.",
      source: "WhatsApp",
      date: d.receivedAt.slice(0, 10),
      clientId: client._id,
    });
  }
}

async function addLeadChildren(
  ctx: QueryCtx,
  lead: Doc<"leads">,
  personId: string,
  edges: MemoryEdge[],
  nodes: MemoryNode[],
): Promise<void> {
  const add = (node: MemoryNode) => {
    nodes.push(node);
    edges.push([personId, node.id]);
  };

  lead.notes.slice(0, PER_PERSON.notes).forEach((note, i) => {
    add({
      id: `lnote:${lead._id}:${i}`,
      type: "note",
      label: shorten(note, 22),
      sub: "Note",
      conf: 0.65,
      summary: note,
      source: "Manual note",
    });
  });

  // Timeline highlights become "decision"/milestone nodes for leads.
  lead.timeline.slice(0, 3).forEach((event, i) => {
    add({
      id: `ltl:${lead._id}:${i}`,
      type: "decision",
      label: shorten(event.label, 24),
      sub: event.date,
      conf: 0.6,
      summary: event.label,
      source: "Timeline",
      date: event.date,
    });
  });

  const meetings = await ctx.db
    .query("meetings")
    .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
    .order("desc")
    .take(PER_PERSON.meetings);
  for (const m of meetings) {
    add({
      id: `meeting:${m._id}`,
      type: "meeting",
      label: m.title,
      sub: m.start.slice(0, 10),
      conf: 0.7,
      summary: m.purpose,
      insight: m.agenda[0],
      source: "Calendar",
      date: m.start,
      tags: [m.topic, m.mode],
    });
  }

  const suggestions = await ctx.db
    .query("topicSuggestions")
    .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
    .order("desc")
    .take(PER_PERSON.suggestions);
  for (const s of suggestions) {
    add({
      id: `idea:${s._id}`,
      type: "idea",
      label: shorten(s.headline, 24),
      sub: "Talking point",
      conf: clamp01(s.relevanceScore / 100),
      summary: s.summary,
      insight: s.whyRelevant,
      source: s.source,
      tags: s.talkingPoints.slice(0, 2).map((p) => shorten(p, 28)),
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function clientDocuments(
  ctx: QueryCtx,
  clientId: Id<"clients">,
  limit: number,
): Promise<Doc<"whatsappMessages">[]> {
  const conversations = await ctx.db
    .query("whatsappConversations")
    .withIndex("by_client", (q) => q.eq("clientId", clientId))
    .take(2);
  const docs: Doc<"whatsappMessages">[] = [];
  for (const c of conversations) {
    const messages = await ctx.db
      .query("whatsappMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
      .take(30);
    for (const m of messages) {
      if (m.messageType === "Document") docs.push(m);
      if (docs.length >= limit) return docs;
    }
  }
  return docs;
}

function avgConfidence(
  actions: Array<{ confidence: number }>,
): number | undefined {
  if (actions.length === 0) return undefined;
  const sum = actions.reduce((acc, a) => acc + (a.confidence || 0), 0);
  return clamp01(sum / actions.length);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function shorten(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
