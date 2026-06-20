import type { Meeting } from "@/lib/meetings";
import { formatTime, meetingDisplayStatus } from "@/lib/format";
import { StatusPill } from "@/components/ui";
import { ModeIcon } from "./mode-icon";

export function MeetingRow({
  meeting,
  now,
  first,
  isNext,
  onSelect,
}: {
  meeting: Meeting;
  now: Date;
  first: boolean;
  isNext: boolean;
  onSelect: (meeting: Meeting) => void;
}) {
  const endTime = new Date(
    new Date(meeting.start).getTime() + meeting.durationMinutes * 60_000
  ).toISOString();

  return (
    <button
      type="button"
      onClick={() => onSelect(meeting)}
      className="glass-row relative flex w-full items-center gap-5 px-[22px] py-[18px] text-left"
      style={{ borderTop: first ? "none" : "1px solid #ECE6D9" }}
    >
      {isNext && (
        <span className="absolute inset-y-0 left-0 w-[3px] bg-accent" />
      )}

      <span className="flex w-[118px] flex-none flex-col gap-[3px]">
        <span className="text-[15px] font-semibold tabular-nums text-ink-soft">
          {formatTime(meeting.start)}
        </span>
        <span className="text-[11.5px] font-medium tabular-nums text-dim">
          {formatTime(endTime)}
        </span>
      </span>

      <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-tile text-muted">
        <ModeIcon mode={meeting.mode} className="h-[17px] w-[17px]" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[15px] font-semibold text-ink-soft">
          {meeting.title}
        </span>
        <span className="truncate text-[12.5px] text-faint">
          {meeting.attendee} · {meeting.attendeeRole}
        </span>
      </span>

      <StatusPill status={meetingDisplayStatus(meeting.status, meeting.start, now)} />
    </button>
  );
}
