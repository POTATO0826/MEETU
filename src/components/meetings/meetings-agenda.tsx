"use client";

import { useMemo, useState } from "react";
import type { Meeting } from "@/lib/meetings";
import { dayKey, formatDayLabel, formatLongDate } from "@/lib/format";
import { MeetingRow } from "./meeting-row";
import { MeetingDrawer } from "./meeting-drawer";
import { MeetingsCalendar } from "./meetings-calendar";

type Layout = "Agenda" | "Calendar";
type View = "Upcoming" | "Past";

type DayGroup = {
  key: string;
  label: string;
  dateLine: string;
  meetings: Meeting[];
};

export function MeetingsAgenda({ meetings }: { meetings: Meeting[] }) {
  const [selected, setSelected] = useState<Meeting | null>(null);
  const [layout, setLayout] = useState<Layout>("Agenda");
  const [view, setView] = useState<View>("Upcoming");
  // Snapshot "now" once so server and client render the same groupings.
  const [now] = useState(() => new Date());

  const groups = useMemo<DayGroup[]>(() => {
    const nowMs = now.getTime();
    const filtered = meetings
      .filter((m) =>
        view === "Upcoming"
          ? new Date(m.start).getTime() >= nowMs
          : new Date(m.start).getTime() < nowMs
      )
      .sort((a, b) =>
        view === "Upcoming"
          ? new Date(a.start).getTime() - new Date(b.start).getTime()
          : new Date(b.start).getTime() - new Date(a.start).getTime()
      );

    const byDay = new Map<string, DayGroup>();
    for (const m of filtered) {
      const key = dayKey(m.start);
      let group = byDay.get(key);
      if (!group) {
        group = {
          key,
          label: formatDayLabel(m.start, now),
          dateLine: formatLongDate(m.start),
          meetings: [],
        };
        byDay.set(key, group);
      }
      group.meetings.push(m);
    }
    return [...byDay.values()];
  }, [meetings, view, now]);

  const upcomingCount = useMemo(
    () =>
      meetings.filter((m) => new Date(m.start).getTime() >= now.getTime())
        .length,
    [meetings, now]
  );

  // The very first upcoming meeting gets a "next" accent rail.
  const nextId =
    layout === "Agenda" && view === "Upcoming"
      ? groups[0]?.meetings[0]?.id
      : undefined;

  return (
    <section className="mx-auto max-w-[980px] px-14 pb-20 pt-12">
      <header className="relative mb-[30px] flex items-end justify-between gap-6 overflow-hidden border-b border-line pb-[26px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-[90px] h-[200px] w-[280px] opacity-50 blur-[30px]"
          style={{
            background:
              "radial-gradient(55% 70% at 70% 30%, rgba(52,84,140,0.22), transparent 70%), radial-gradient(45% 55% at 40% 60%, rgba(156,59,51,0.14), transparent 72%)",
          }}
        />
        <div className="relative">
          <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-dim">
            Schedule
          </div>
          <h1 className="m-0 font-serif text-[38px] font-medium leading-none tracking-[-0.01em] text-[#231F17]">
            Meetings
          </h1>
          <p className="mt-3 text-[14.5px] text-muted">
            {upcomingCount} upcoming {upcomingCount === 1 ? "meeting" : "meetings"}
          </p>
        </div>

        <div className="relative flex flex-col items-end gap-2.5">
          <Segmented
            value={layout}
            onChange={setLayout}
            options={["Agenda", "Calendar"] as const}
          />
          {layout === "Agenda" && (
            <Segmented
              value={view}
              onChange={setView}
              options={["Upcoming", "Past"] as const}
            />
          )}
        </div>
      </header>

      {layout === "Calendar" ? (
        <MeetingsCalendar
          meetings={meetings}
          now={now}
          onSelect={setSelected}
        />
      ) : groups.length === 0 ? (
        <div className="px-5 py-20 text-center text-quiet">
          <div className="mb-2 font-serif text-[21px] text-muted">
            Nothing on the calendar
          </div>
          <div className="text-sm">No {view.toLowerCase()} meetings to show.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-[26px]">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="mb-3 flex items-baseline gap-3 pl-0.5">
                <h2 className="m-0 font-serif text-[19px] font-medium text-ink-soft">
                  {group.label}
                </h2>
                <span className="text-xs tracking-[0.04em] text-dim">
                  {group.dateLine}
                </span>
              </div>
              <div className="overflow-hidden rounded-[15px] border border-hair bg-panel shadow-[0_1px_2px_rgba(38,34,25,0.03),0_14px_30px_-24px_rgba(38,34,25,0.22)]">
                {group.meetings.map((meeting, i) => (
                  <MeetingRow
                    key={meeting.id}
                    meeting={meeting}
                    first={i === 0}
                    isNext={meeting.id === nextId}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <MeetingDrawer meeting={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

/** A small pill-style segmented control matching the MEETU editorial style. */
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <div className="relative flex rounded-[11px] border border-line bg-tile p-[3px]">
      {options.map((opt) => {
        const on = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="relative rounded-lg px-4 py-[7px] text-[13px] font-semibold transition-colors"
            style={{ color: on ? "#231F17" : "#9B927F" }}
          >
            {on && (
              <span className="absolute inset-0 rounded-lg bg-panel shadow-[0_1px_2px_rgba(38,34,25,0.07)]" />
            )}
            <span className="relative">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
