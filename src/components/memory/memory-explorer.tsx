"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { MemoryGraph } from "./memory-graph";
import { MemoryPanel, colorOf, type GraphStats } from "./memory-panel";
import type { MemoryNode } from "../../../convex/memory";

const PANEL_WIDTH = 372;

export function MemoryExplorer() {
  const data = useQuery(api.memory.graph, {});
  const stageRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<MemoryGraph | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!data || !el) return;
    const g = new MemoryGraph(el, {
      nodes: data.nodes,
      edges: data.edges,
      colorOf,
      onSelect: (id) => setSelectedId(id),
      panelWidth: PANEL_WIDTH + 16,
      topPad: 150,
    });
    graphRef.current = g;
    g.start();
    return () => {
      g.destroy();
      graphRef.current = null;
    };
  }, [data]);

  const nodeMap = useMemo(
    () => new Map((data?.nodes ?? []).map((n) => [n.id, n] as const)),
    [data],
  );

  const adjacency = useMemo(() => {
    const map = new Map<string, string[]>();
    const link = (from: string, to: string) => {
      const list = map.get(from);
      if (list) list.push(to);
      else map.set(from, [to]);
    };
    for (const [a, b] of data?.edges ?? []) {
      link(a, b);
      link(b, a);
    }
    return map;
  }, [data]);

  const stats: GraphStats = useMemo(() => {
    const all = (data?.nodes ?? []).filter((n) => n.type !== "advisor");
    const counts = new Map<string, number>();
    let confSum = 0;
    let confN = 0;
    for (const n of all) {
      counts.set(n.type, (counts.get(n.type) ?? 0) + 1);
      if (typeof n.conf === "number") {
        confSum += n.conf;
        confN += 1;
      }
    }
    return {
      total: all.length,
      people: all.filter((n) => n.type === "person").length,
      byType: [...counts.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      avgConf: confN > 0 ? confSum / confN : 0,
    };
  }, [data]);

  const selected = selectedId ? nodeMap.get(selectedId) ?? null : null;

  const related: MemoryNode[] = useMemo(() => {
    if (!selected) return [];
    const ids = adjacency.get(selected.id) ?? [];
    return ids
      .map((id) => nodeMap.get(id))
      .filter((n): n is MemoryNode => n !== undefined && n.type !== "advisor")
      .slice(0, 8);
  }, [selected, adjacency, nodeMap]);

  return (
    <section className="absolute inset-0 overflow-hidden">
      {/* Full-bleed stage. `absolute inset-0` fills the section deterministically
          (the parent <main> is relative), regardless of percentage-height
          chains. The engine now leaves non-static positions alone. */}
      <div ref={stageRef} className="absolute inset-0" />

      {/* Header overlay */}
      <div className="pointer-events-none absolute left-7 top-6 z-[4] max-w-[400px]">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-dim">
          AI brain
        </div>
        <h1 className="m-0 font-serif text-[34px] font-medium leading-none tracking-[-0.01em] text-[#231F17]">
          Memory
        </h1>
        <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
          Your knowledge as one connected globe. Click a topic to bloom its
          memories outward, drag to rotate, and open any node for AI insight.
        </p>
      </div>

      {/* Loading */}
      {!data && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden
            />
            Building your memory…
          </div>
        </div>
      )}

      {/* Side panel (overview or detail) */}
      {data && (
        <MemoryPanel
          node={selected}
          related={related}
          stats={stats}
          onSelectRelated={(id) => graphRef.current?.selectExternal(id)}
          onClose={() => graphRef.current?.setSelected(null)}
        />
      )}
    </section>
  );
}
