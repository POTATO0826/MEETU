"use client";

import { useMemo, useState } from "react";
import type { Meeting } from "@/lib/meetings";
import { dayKey, formatTime, statusMeta } from "@/lib/format";
import { ArrowLeft, ArrowRight } from "@/components/icons";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Max meeting chips shown per day before collapsing into a "+N more". */
const MAX_CHIPS = 3;

type Cell = {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
  meetings: Meeting[];
};

export function MeetingsCalendar({
  meetings,
  now,
  onSelect,
}: {
  meetings: Meeting[];
  now: Date;
  onSelect: (meeting: Meeting) => void;
}) {
  // The month the grid is currently showing (always the 1st of that month).
  const [cursor, setCursor] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1)
  );

  const todayKey = useMemo(() => dayKey(now.toISOString()), [now]);

  // Group meetings by calendar day, sorted by start time within each day.
  const byDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings) {
      const k = dayKey(m.start);
      const list = map.get(k);
      if (list) list.push(m);
      else map.set(k, [m]);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
    }
    return map;
  }, [meetings]);

  // A fixed 6-row (42 cell) grid starting on the Sunday on/before the 1st.
  const cells = useMemo<Cell[]>(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const start = new Date(year, month, 1 - new Date(year, month, 1).getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + i
      );
      const key = dayKey(date.toISOString());
      return {
        date,
        key,
        inMonth: date.getMonth() === month,
        isToday: key === todayKey,
        meetings: byDay.get(key) ?? [],
      };
    });
  }, [cursor, byDay, todayKey]);

  const monthLabel = cursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const goToday = () =>
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="m-0 font-serif text-[22px] font-medium text-ink-soft">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-tile text-muted transition-colors hover:bg-panel"
          >
            <ArrowLeft className="h-[17px] w-[17px]" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-[9px] border border-line bg-tile px-3 py-[7px] text-[13px] font-semibold text-muted transition-colors hover:bg-panel"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-line bg-tile text-muted transition-colors hover:bg-panel"
          >
            <ArrowRight className="h-[17px] w-[17px]" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[15px] border border-hair bg-panel shadow-[0_1px_2px_rgba(38,34,25,0.03),0_14px_30px_-24px_rgba(38,34,25,0.22)]">
        <div className="grid grid-cols-7 border-b border-line-soft">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-3 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-dim"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell, i) => (
            <DayCell
              key={cell.key}
              cell={cell}
              noRight={(i + 1) % 7 === 0}
              noBottom={i >= 35}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayCell({
  cell,
  noRight,
  noBottom,
  onSelect,
}: {
  cell: Cell;
  noRight: boolean;
  noBottom: boolean;
  onSelect: (meeting: Meeting) => void;
}) {
  const shown = cell.meetings.slice(0, MAX_CHIPS);
  const extra = cell.meetings.length - shown.length;

  return (
    <div
      className="flex min-h-[106px] flex-col p-1.5"
      style={{
        borderRight: noRight ? "none" : "1px solid #ECE6D9",
        borderBottom: noBottom ? "none" : "1px solid #ECE6D9",
        background: cell.inMonth ? "transparent" : "rgba(38,34,25,0.015)",
      }}
    >
      <div className="mb-1 flex justify-end px-0.5">
        <span
          className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[12px] font-semibold tabular-nums"
          style={
            cell.isToday
              ? { background: "#34548C", color: "#F4F0E6" }
              : { color: cell.inMonth ? "#6B6354" : "#BDB4A1" }
          }
        >
          {cell.date.getDate()}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {shown.map((m) => {
          const tone = statusMeta(m.status);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              title={`${formatTime(m.start)} · ${m.title}`}
              className="flex w-full items-center gap-1.5 rounded-[7px] px-1.5 py-1 text-left transition-opacity hover:opacity-80"
              style={{ background: tone.bg }}
            >
              <span
                className="h-1.5 w-1.5 flex-none rounded-full"
                style={{ background: tone.fg }}
              />
              <span
                className="truncate text-[11px] font-medium"
                style={{ color: tone.fg }}
              >
                <span className="tabular-nums">{formatTime(m.start)}</span>
                <span className="ml-1">{m.title}</span>
              </span>
            </button>
          );
        })}
        {extra > 0 && (
          <span className="px-1.5 text-[11px] font-medium text-quiet">
            +{extra} more
          </span>
        )}
      </div>
    </div>
  );
}
