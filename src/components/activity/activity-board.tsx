"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ClientActivity } from "@/lib/client-activities";
import { Avatar } from "@/components/ui";
import { Chevron } from "@/components/icons";
import { formatDate } from "@/lib/format";

const CATEGORY_TONE: Record<
  ClientActivity["category"],
  { fg: string; bg: string }
> = {
  Travel: { fg: "#34548C", bg: "#E7EBF3" },
  Family: { fg: "#7E4A44", bg: "#F2E4E0" },
  Work: { fg: "#566F4F", bg: "#E8EDE4" },
  Health: { fg: "#9C3B33", bg: "#F2E4E0" },
  Milestone: { fg: "#8A6A3A", bg: "#EBD8B8" },
  Availability: { fg: "#7A7264", bg: "#ECE7DD" },
};

export function ActivityBoard({
  activities,
  isLoading = false,
}: {
  activities: ClientActivity[];
  isLoading?: boolean;
}) {
  const [filter, setFilter] = useState<"All" | "Upcoming">("All");
  const filterBarRef = useRef<HTMLDivElement>(null);
  const filterRefs = useRef<
    Partial<Record<"All" | "Upcoming", HTMLButtonElement | null>>
  >({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const upcoming = activities.filter((item) => item.priority === "Upcoming");
  const visible = useMemo(
    () => (filter === "Upcoming" ? upcoming : activities),
    [activities, filter, upcoming],
  );

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const bar = filterBarRef.current;
      const tab = filterRefs.current[filter];
      if (!bar || !tab) return;

      const barRect = bar.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      setIndicator({
        left: tabRect.left - barRect.left,
        width: tabRect.width,
        ready: true,
      });
    };

    updateIndicator();
    const observer = new ResizeObserver(updateIndicator);
    if (filterBarRef.current) observer.observe(filterBarRef.current);
    return () => observer.disconnect();
  }, [filter]);

  return (
    <section className="mx-auto max-w-[1180px] px-14 pb-20 pt-12">
      <header className="relative mb-[26px] overflow-hidden border-b border-line pb-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-[90px] h-[200px] w-[280px] opacity-50 blur-[30px]"
          style={{
            background:
              "radial-gradient(55% 70% at 70% 30%, rgba(138,106,58,0.20), transparent 70%), radial-gradient(45% 55% at 40% 60%, rgba(52,84,140,0.14), transparent 72%)",
          }}
        />
        <div className="relative flex items-end justify-between gap-6">
          <div>
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-dim">
              Relationship feed
            </div>
            <h1 className="m-0 font-serif text-[38px] font-medium leading-none tracking-[-0.01em] text-[#231F17]">
              Client Activity
            </h1>
            <p className="mt-3 text-[14.5px] text-muted">
              {activities.length} moments · {upcoming.length} upcoming touchpoints
            </p>
          </div>
        </div>
      </header>

      <div
        ref={filterBarRef}
        className="relative mb-[26px] flex flex-wrap items-center gap-7 border-b border-line"
        role="tablist"
        aria-label="Activity view"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 h-0.5 rounded-full bg-accent transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            bottom: 0,
            width: indicator.width,
            opacity: indicator.ready ? 1 : 0,
            transform: `translate3d(${indicator.left}px, 0, 0)`,
          }}
        />
        {[
          { key: "All" as const, label: "All", count: activities.length },
          {
            key: "Upcoming" as const,
            label: "Recommended upcoming",
            count: upcoming.length,
          },
        ].map((tab) => {
          const on = filter === tab.key;
          return (
            <button
              key={tab.key}
              ref={(node) => {
                filterRefs.current[tab.key] = node;
              }}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(tab.key)}
              className={`group relative inline-flex items-center gap-2 pb-3 text-[13px] font-semibold transition-colors duration-300 ease-out ${
                on ? "text-ink" : "text-quiet hover:text-muted"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums transition-colors duration-300 ease-out ${
                  on
                    ? "bg-accent/10 text-accent"
                    : "bg-black/[0.035] text-dim"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <ActivityEmptyState title="Loading activity" />
      ) : visible.length === 0 ? (
        <ActivityEmptyState
          title={
            filter === "Upcoming"
              ? "No upcoming touchpoints"
              : "No client activity yet"
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[18px]">
          {visible.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </section>
  );
}

function ActivityEmptyState({ title }: { title: string }) {
  return (
    <div className="glass-card flex min-h-[220px] items-center justify-center rounded-2xl border px-6 text-center">
      <p className="m-0 text-[14px] font-semibold text-muted">{title}</p>
    </div>
  );
}

function ActivityCard({ activity }: { activity: ClientActivity }) {
  const tone = CATEGORY_TONE[activity.category];

  return (
    <article className="glass-card flex min-h-[260px] flex-col rounded-2xl border p-[22px]">
      <div className="mb-4 flex items-start gap-3.5">
        <Avatar name={activity.clientName} size={46} />
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[16px] font-semibold text-ink-soft">
            {activity.clientName}
          </h2>
          <p className="mt-1 text-[12.5px] text-quiet">
            Mentioned {formatDate(activity.mentionedAt)}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            background: tone.bg,
            color: tone.fg,
            boxShadow: `inset 0 0 0 1px ${tone.fg}1F`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: tone.fg }}
          />
          {activity.category}
        </span>
      </div>

      <div className="mb-4 flex items-baseline justify-between gap-3 border-y border-line-soft py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-dim">
          Timeframe
        </span>
        <span className="text-[13px] font-semibold text-ink-soft">
          {activity.timeframe}
        </span>
      </div>

      <p className="m-0 text-[14px] leading-[1.55] text-body">
        {activity.activity}
      </p>

      <div className="mt-4 rounded-[11px] bg-[#F3EFE6] px-3.5 py-3">
        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-dim">
          Suggested touchpoint
        </div>
        <p className="m-0 text-[13px] leading-[1.5] text-muted">
          {activity.suggestedTouchpoint}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-[12px]">
        <span className="font-semibold text-quiet">{activity.source}</span>
        <Link
          href={`/clients/${activity.clientSlug}`}
          className="inline-flex items-center gap-1 font-semibold text-accent"
        >
          Client profile
          <Chevron className="h-[14px] w-[14px]" />
        </Link>
      </div>
    </article>
  );
}
