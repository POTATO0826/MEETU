"use client";

import type { Meeting } from "@/lib/meetings";
import {
  formatLongDate,
  formatTime,
  meetingDisplayStatus,
} from "@/lib/format";
import { Drawer, CloseButton, DrawerLabel } from "@/components/drawer";
import { StatusPill, Avatar } from "@/components/ui";
import { Check } from "@/components/icons";
import { ModeIcon } from "./mode-icon";

function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} hr` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}

export function MeetingDrawer({
  meeting,
  now,
  onClose,
}: {
  meeting: Meeting | null;
  now: Date;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={meeting !== null}
      onClose={onClose}
      width={460}
      label={meeting ? `${meeting.title} details` : "Meeting details"}
    >
      {meeting && (
        <Inner meeting={meeting} now={now} onClose={onClose} />
      )}
    </Drawer>
  );
}

function Inner({
  meeting,
  now,
  onClose,
}: {
  meeting: Meeting;
  now: Date;
  onClose: () => void;
}) {
  const endTime = new Date(
    new Date(meeting.start).getTime() + meeting.durationMinutes * 60_000
  ).toISOString();
  const locationLabel =
    meeting.mode === "Video"
      ? "Video link"
      : meeting.mode === "Phone"
      ? "Phone"
      : "Location";

  return (
    <>
      <div className="relative overflow-hidden border-b border-line px-7 pb-[22px] pt-[26px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[30px] -top-20 h-[180px] w-60 opacity-50 blur-[28px]"
          style={{
            background:
              "radial-gradient(55% 70% at 70% 30%, rgba(52,84,140,0.22), transparent 70%), radial-gradient(45% 55% at 40% 60%, rgba(156,59,51,0.14), transparent 72%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-quiet">
              {meeting.topic}
            </div>
            <h2 className="m-0 font-serif text-2xl font-medium leading-tight text-[#231F17]">
              {meeting.title}
            </h2>
          </div>
          <CloseButton onClose={onClose} />
        </div>
        <div className="relative mt-[15px] flex items-center gap-2.5">
          <StatusPill
            status={meetingDisplayStatus(meeting.status, meeting.start, now)}
          />
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
            <ModeIcon mode={meeting.mode} className="h-4 w-4 text-faint" />
            {meeting.mode}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-[22px] px-7 py-6">
        <div className="flex flex-col gap-3 rounded-[13px] border border-hair bg-panel p-[18px]">
          <div className="flex items-center gap-3">
            <Avatar name={meeting.attendee} size={34} fontSize={12} />
            <span className="flex flex-col gap-px">
              <span className="text-sm font-semibold text-ink-soft">
                {meeting.attendee}
              </span>
              <span className="text-xs text-quiet">{meeting.attendeeRole}</span>
            </span>
          </div>
          <div className="flex flex-col gap-0.5 border-t border-line-soft pt-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-dim">
              When
            </span>
            <span className="text-[13.5px] font-semibold text-ink-soft">
              {formatLongDate(meeting.start)}
            </span>
            <span className="text-[12.5px] tabular-nums text-muted">
              {formatTime(meeting.start)} – {formatTime(endTime)} ·{" "}
              {durationLabel(meeting.durationMinutes)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 border-t border-line-soft pt-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-dim">
              {locationLabel}
            </span>
            <span className="text-[13.5px] font-semibold text-accent">
              {meeting.location}
            </span>
          </div>
        </div>

        <div>
          <DrawerLabel>Purpose</DrawerLabel>
          <p className="m-0 text-sm leading-relaxed text-body">
            {meeting.purpose}
          </p>
        </div>

        <div>
          <DrawerLabel>Agenda &amp; prep</DrawerLabel>
          <div className="flex flex-col gap-[11px]">
            {meeting.agenda.map((item, i) => (
              <div key={i} className="flex items-start gap-[11px]">
                <span className="mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[5px] bg-[#EAEEF5] text-accent">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-[13.5px] leading-snug text-body">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
