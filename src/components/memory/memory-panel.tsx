"use client";

import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { MemoryNode } from "./memory-graph";
import { Close, Plus } from "@/components/icons";

export const TYPE_COLOR: Record<string, string> = {
  person: "#34548C",
  meeting: "#566F4F",
  note: "#8A6A3A",
  decision: "#9C3B33",
  idea: "#6A5278",
  document: "#48586A",
  advisor: "#2A261D",
};

export const colorOf = (type: string) => TYPE_COLOR[type] ?? "#555";

export type GraphStats = {
  total: number;
  people: number;
  byType: Array<{ type: string; count: number }>;
  avgConf: number;
};

const SUGGESTIONS = [
  "Who should I follow up with this week?",
  "Which clients have upcoming meetings?",
  "What are the freshest talking points?",
];

export function MemoryPanel({
  node,
  related,
  stats,
  onSelectRelated,
  onClose,
}: {
  node: MemoryNode | null;
  related: MemoryNode[];
  stats: GraphStats;
  onSelectRelated: (id: string) => void;
  onClose: () => void;
}) {
  if (!node || node.type === "advisor") {
    return <Overview stats={stats} />;
  }
  return (
    <Detail
      key={node.id}
      node={node}
      related={related}
      onSelectRelated={onSelectRelated}
      onClose={onClose}
    />
  );
}

// ---------------------------------------------------------------------------
// Overview (nothing selected)
// ---------------------------------------------------------------------------

function Overview({ stats }: { stats: GraphStats }) {
  const askAI = useAction(api.graphActions.askAboutNode);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const ask = async (q: string) => {
    const query = q.trim();
    if (!query || asking) return;
    setAsking(true);
    setAnswer(null);
    try {
      const r = await askAI({
        nodeTitle: "Your practice",
        nodeSummary: `A book of ${stats.people} people and ${stats.total} memories.`,
        question: query,
      });
      setAnswer(r.answer);
    } catch (e) {
      setAnswer(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <Shell>
      <div className="px-5 pb-3 pt-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-dim">
          Second brain
        </div>
        <h2 className="mt-1 font-serif text-[24px] font-medium leading-tight text-[#211D16]">
          Your memory map
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          Click any glowing topic to bloom its memories. Drag to spin the globe.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="People" value={String(stats.people)} />
          <Stat label="Memories" value={String(stats.total)} />
          <Stat
            label="AI confidence"
            value={`${Math.round(stats.avgConf * 100)}%`}
            accent
          />
          <Stat
            label="Types"
            value={String(stats.byType.length)}
          />
        </div>

        <Section title="What's in your brain">
          <ul className="flex flex-col gap-1.5">
            {stats.byType.map((t) => (
              <li
                key={t.type}
                className="glass-row flex items-center justify-between rounded-[11px] border border-white/45 bg-white/15 px-3 py-2 text-[12.5px] text-ink-soft backdrop-blur-md"
              >
                <span className="inline-flex items-center gap-2 capitalize">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: colorOf(t.type) }}
                  />
                  {t.type}
                </span>
                <span className="font-semibold tabular-nums text-muted">
                  {t.count}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Ask the brain">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask(question);
              }}
              placeholder="Ask about your whole practice…"
              className="meeting-glass-field w-full rounded-[12px] border border-white/65 bg-white/25 px-3 py-2 text-[13px] text-[#1F1B15] outline-none backdrop-blur-xl transition placeholder:text-[#8A8170] focus:border-[#B5832E]/45 focus:bg-white/40"
            />
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={asking}
                  onClick={() => {
                    setQuestion(s);
                    ask(s);
                  }}
                  className="glass-row rounded-full border border-white/55 bg-white/20 px-2.5 py-1 text-[11px] text-[#5C5446] backdrop-blur-md transition-colors hover:text-ink disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            {asking && <Thinking />}
            {answer && <AnswerBox text={answer} />}
          </div>
        </Section>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Detail (a node selected)
// ---------------------------------------------------------------------------

function Detail({
  node,
  related,
  onSelectRelated,
  onClose,
}: {
  node: MemoryNode;
  related: MemoryNode[];
  onSelectRelated: (id: string) => void;
  onClose: () => void;
}) {
  const fetchMemories = useAction(api.graphActions.relatedMemories);
  const addMemory = useAction(api.graphActions.addMemory);
  const askAI = useAction(api.graphActions.askAboutNode);

  const accent = colorOf(node.type);
  const clientId = node.clientId as Id<"clients"> | undefined;

  const [memories, setMemories] = useState<string[] | null>(null);
  const [memLoading, setMemLoading] = useState(false);
  const [memoText, setMemoText] = useState("");
  const [memoSaving, setMemoSaving] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (loadedFor.current === node.id) return;
    loadedFor.current = node.id;
    if (!clientId) {
      setMemories([]);
      return;
    }
    setMemLoading(true);
    fetchMemories({ clientId })
      .then((r) => setMemories(r.memories))
      .catch(() => setMemories([]))
      .finally(() => setMemLoading(false));
  }, [node.id, clientId, fetchMemories]);

  const onAdd = async () => {
    const text = memoText.trim();
    if (!text || !clientId || memoSaving) return;
    setMemoSaving(true);
    setMemoSaved(false);
    try {
      const r = await addMemory({ clientId, text });
      if (r.ok) {
        setMemoSaved(true);
        setMemoText("");
        setMemories((prev) => [text, ...(prev ?? [])]);
        setTimeout(() => setMemoSaved(false), 2000);
      }
    } finally {
      setMemoSaving(false);
    }
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || asking) return;
    setAsking(true);
    setAnswer(null);
    try {
      const r = await askAI({
        clientId,
        nodeTitle: node.label,
        nodeSummary: node.summary ?? node.sub ?? "",
        question: q,
      });
      setAnswer(r.answer);
    } catch (e) {
      setAnswer(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAsking(false);
    }
  };

  const conf = node.conf ?? 0;

  return (
    <Shell>
      <div className="flex items-start gap-3 border-b border-white/40 px-5 pb-4 pt-5">
        <span
          className="mt-1.5 inline-block h-2.5 w-2.5 flex-none rounded-full"
          style={{ background: accent }}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="rounded-full border border-white/55 bg-white/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur-md"
              style={{ color: accent }}
            >
              {node.type}
            </span>
            <ConfidenceBadge conf={conf} />
          </div>
          <h2 className="font-serif text-[21px] font-medium leading-tight text-[#211D16]">
            {node.label}
          </h2>
          {node.sub && (
            <p className="mt-0.5 text-[12.5px] text-quiet">{node.sub}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="glass-row flex h-8 w-8 flex-none items-center justify-center rounded-full border border-white/45 bg-white/20 text-[#6b6253] backdrop-blur-md"
        >
          <Close className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {node.summary && (
          <p className="text-[13.5px] leading-relaxed text-ink-soft">
            {node.summary}
          </p>
        )}

        {node.insight && (
          <div
            className="mt-4 rounded-[12px] border-l-2 py-2 pl-3.5 pr-3"
            style={{ borderColor: accent }}
          >
            <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-dim">
              AI insight
            </div>
            <p className="text-[13px] leading-relaxed text-ink-soft">
              {node.insight}
            </p>
          </div>
        )}

        {node.tags && node.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {node.tags.map((tag, i) => (
              <span
                key={i}
                className="rounded-full border border-white/55 bg-white/20 px-2.5 py-0.5 text-[11px] font-medium text-[#5C5446] backdrop-blur-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {related.length > 0 && (
          <Section title="Related memories">
            <ul className="flex flex-col gap-1.5">
              {related.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onSelectRelated(r.id)}
                    className="glass-row flex w-full items-center gap-2 rounded-[11px] border border-white/45 bg-white/15 px-3 py-2 text-left text-[12.5px] text-ink-soft backdrop-blur-md"
                  >
                    <span
                      className="h-2 w-2 flex-none rounded-full"
                      style={{ background: colorOf(r.type) }}
                    />
                    <span className="min-w-0 flex-1 truncate">{r.label}</span>
                    <span className="flex-none text-[10px] uppercase tracking-[0.12em] text-ghost">
                      {r.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {clientId && (
          <Section title="What we remember">
            {memLoading ? (
              <Thinking label="Recalling…" />
            ) : memories && memories.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {memories.map((m, i) => (
                  <li
                    key={i}
                    className="glass-row flex items-start gap-2 rounded-[11px] border border-white/45 bg-white/15 px-3 py-2 text-[12.5px] leading-snug text-ink-soft backdrop-blur-md"
                  >
                    <span
                      className="mt-[3px] h-1.5 w-1.5 flex-none rounded-full"
                      style={{ background: accent }}
                    />
                    {m}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="No long-term memories yet. Add one below." />
            )}
          </Section>
        )}

        {clientId && (
          <Section title="Add a memory">
            <div className="flex flex-col gap-2">
              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                placeholder="e.g. Prefers calls after 5pm…"
                rows={2}
                className="meeting-glass-field w-full resize-none rounded-[12px] border border-white/65 bg-white/25 px-3 py-2 text-[13px] text-[#1F1B15] outline-none backdrop-blur-xl transition placeholder:text-[#8A8170] focus:border-[#34548C]/45 focus:bg-white/40"
              />
              <button
                type="button"
                onClick={onAdd}
                disabled={!memoText.trim() || memoSaving}
                className="glass-row inline-flex items-center justify-center gap-1.5 self-start rounded-[11px] border border-white/55 bg-white/25 px-3.5 py-1.5 text-[12px] font-semibold text-ink-soft backdrop-blur-md disabled:opacity-50"
              >
                {memoSaving ? (
                  <>
                    <Spinner /> Saving…
                  </>
                ) : memoSaved ? (
                  "Saved ✓"
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" /> Add memory
                  </>
                )}
              </button>
            </div>
          </Section>
        )}

        <Section title="Ask AI about this memory">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask();
              }}
              placeholder="e.g. How should I act on this?"
              className="meeting-glass-field w-full rounded-[12px] border border-white/65 bg-white/25 px-3 py-2 text-[13px] text-[#1F1B15] outline-none backdrop-blur-xl transition placeholder:text-[#8A8170] focus:border-[#B5832E]/45 focus:bg-white/40"
            />
            <button
              type="button"
              onClick={ask}
              disabled={!question.trim() || asking}
              className="inline-flex items-center justify-center gap-2 self-start rounded-[11px] border border-[#C9A23A] px-4 py-1.5 text-[12px] font-semibold text-[#3A2C0A] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              style={{
                background:
                  "linear-gradient(135deg,#F4DA80 0%,#E0BB4E 42%,#C2952A 100%)",
              }}
            >
              {asking ? (
                <>
                  <Spinner /> Thinking…
                </>
              ) : (
                "Ask AI"
              )}
            </button>
            {answer && <AnswerBox text={answer} />}
          </div>
        </Section>

        <div className="mt-5 flex items-center justify-between border-t border-white/40 pt-3 text-[11px] text-quiet">
          <span>{node.source ?? "Memory"}</span>
          {node.date && <span>{node.date}</span>}
        </div>
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Shell({ children }: { children: React.ReactNode }) {
  // The outer wrapper owns the absolute positioning. `.glass-card` forces
  // `position: relative` (it loads after Tailwind utilities), so the glass
  // styling lives on the inner element instead of fighting `absolute`.
  return (
    <div className="pointer-events-none absolute right-4 top-4 bottom-4 z-[5] w-[372px] max-w-[calc(100vw-2rem)]">
      <aside className="animate-panel glass-card pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-[22px] border">
        {children}
      </aside>
    </div>
  );
}

function ConfidenceBadge({ conf }: { conf: number }) {
  const pct = Math.round(conf * 100);
  const label = conf >= 0.8 ? "High" : conf >= 0.5 ? "Medium" : "Low";
  const color = conf >= 0.8 ? "#566F4F" : conf >= 0.5 ? "#B5832E" : "#9C3B33";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-white/55 bg-white/25 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md"
      style={{ color }}
      title="AI confidence"
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label} · {pct}%
    </span>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="glass-row rounded-[13px] border border-white/45 bg-white/15 px-3 py-2.5 backdrop-blur-md">
      <div
        className="font-serif text-[22px] font-medium leading-none"
        style={{ color: accent ? "#B5832E" : "#211D16" }}
      >
        {value}
      </div>
      <div className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-dim">
        {label}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-dim">
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-[11px] border border-dashed border-white/55 px-3 py-2.5 text-[12px] leading-snug text-quiet">
      {text}
    </p>
  );
}

function AnswerBox({ text }: { text: string }) {
  return (
    <div className="glass-row animate-fade-up rounded-[12px] border border-white/45 bg-white/15 px-3.5 py-3 text-[13px] leading-relaxed text-ink-soft backdrop-blur-md">
      {text}
    </div>
  );
}

function Thinking({ label = "Thinking…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-quiet">
      <Spinner /> {label}
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}
