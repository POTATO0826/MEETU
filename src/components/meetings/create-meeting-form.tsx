"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarIcon } from "@/components/icons";
import type { ServiceInterest } from "@/lib/leads";
import { saveCreatedMeeting } from "@/lib/meeting-storage";
import type { Meeting, MeetingMode, MeetingStatus } from "@/lib/meetings";

const topics: ServiceInterest[] = [
  "Retirement Planning",
  "Investment Management",
  "Insurance",
  "Estate Planning",
  "Tax Strategy",
  "College Savings",
];

const modes: MeetingMode[] = ["Video", "Phone", "In-person"];
const statuses: MeetingStatus[] = ["Confirmed", "Tentative"];

const fieldClass =
  "meeting-glass-field w-full rounded-[10px] border border-white/65 bg-white/25 px-3.5 py-[11px] text-sm font-medium text-[#1F1B15] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_8px_20px_-18px_rgba(38,34,25,0.5)] backdrop-blur-xl transition focus:border-accent/45 focus:bg-white/40 focus:ring-4 focus:ring-accent/10 placeholder:font-normal placeholder:text-[#756C5C]";

export function CreateMeetingForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<MeetingMode>("Video");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [timeError, setTimeError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const data = new FormData(event.currentTarget);
    const date = String(data.get("date"));
    const startTime = String(data.get("startTime"));
    const endTime = String(data.get("endTime"));
    const durationMinutes = getDurationMinutes(startTime, endTime);

    if (durationMinutes <= 0) {
      setTimeError("End time must be later than start time.");
      setSaving(false);
      return;
    }

    const agenda = String(data.get("agenda"))
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const meeting: Meeting = {
      id: `mt-admin-${Date.now()}`,
      title: String(data.get("title")).trim(),
      attendee: String(data.get("attendee")).trim(),
      attendeeRole: String(data.get("attendeeRole")).trim(),
      start: new Date(`${date}T${startTime}`).toISOString(),
      durationMinutes,
      mode,
      location: String(data.get("location")).trim(),
      status: String(data.get("status")) as MeetingStatus,
      topic: String(data.get("topic")) as ServiceInterest,
      purpose: String(data.get("purpose")).trim(),
      agenda,
    };

    saveCreatedMeeting(meeting);
    router.push("/meetings");
  }

  return (
    <section className="mx-auto max-w-[880px] px-14 pb-20 pt-10">
      <header className="mb-7">
        <Link
          href="/meetings"
          className="mb-6 inline-flex items-center gap-2 text-[12.5px] font-semibold text-quiet transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Meetings
        </Link>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-accent">
          New schedule
        </div>
        <h1 className="mb-0 mt-2 font-serif text-[36px] font-medium leading-none text-ink">
          Create a meeting
        </h1>
        <p className="mt-3 text-sm text-muted">
          Add the details below. You can update them later from the meeting.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="glass-card overflow-hidden rounded-2xl border"
      >
        <div className="divide-y divide-line-soft">
          <FormSection
            number="01"
            title="Meeting details"
            description="Name the meeting and attendee."
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Meeting title" className="col-span-2">
                <input
                  className={fieldClass}
                  name="title"
                  placeholder="e.g. Quarterly portfolio review"
                  required
                />
              </Field>
              <Field label="Attendee">
                <input
                  className={fieldClass}
                  name="attendee"
                  placeholder="Full name"
                  required
                />
              </Field>
              <Field label="Role or relationship">
                <input
                  className={fieldClass}
                  name="attendeeRole"
                  placeholder="e.g. Existing client"
                  required
                />
              </Field>
              <Field label="Topic" className="col-span-2">
                <select className={fieldClass} name="topic" required>
                  {topics.map((topic) => (
                    <option key={topic}>{topic}</option>
                  ))}
                </select>
              </Field>
            </div>
          </FormSection>

          <FormSection
            number="02"
            title="Date and place"
            description="Set when and how it will happen."
          >
            <div>
              <div className="grid grid-cols-3 gap-3">
                <GlassDateTimeField label="Date">
                  <input
                    className="w-full bg-transparent text-[13px] font-semibold text-[#1F1B15] outline-none"
                    name="date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    required
                  />
                </GlassDateTimeField>
                <GlassDateTimeField label="Start time">
                  <input
                    className="w-full bg-transparent text-[13px] font-semibold tabular-nums text-[#1F1B15] outline-none"
                    name="startTime"
                    type="time"
                    value={startTime}
                    onChange={(event) => {
                      setStartTime(event.target.value);
                      setTimeError("");
                    }}
                    required
                  />
                </GlassDateTimeField>
                <GlassDateTimeField label="End time">
                  <input
                    className="w-full bg-transparent text-[13px] font-semibold tabular-nums text-[#1F1B15] outline-none"
                    name="endTime"
                    type="time"
                    min={startTime || undefined}
                    value={endTime}
                    onChange={(event) => {
                      setEndTime(event.target.value);
                      setTimeError("");
                    }}
                    required
                  />
                </GlassDateTimeField>
              </div>

              {timeError && (
                <p className="mb-0 mt-2 text-[11.5px] font-semibold text-rust">
                  {timeError}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-4">
                <Field label="Status" className="col-span-2">
                  <select className={fieldClass} name="status">
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Meeting format" className="col-span-2">
                  <div className="grid grid-cols-3 gap-2">
                    {modes.map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={mode === option}
                        onClick={() => setMode(option)}
                        className={`rounded-[10px] border px-3 py-[11px] text-[12.5px] font-semibold transition ${
                          mode === option
                            ? "border-accent/35 bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(52,84,140,0.04)]"
                            : "border-white/65 bg-white/20 text-[#50483D] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-xl hover:bg-white/35"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label={locationLabel(mode)} className="col-span-2">
                  <input
                    className={fieldClass}
                    name="location"
                    placeholder={locationPlaceholder(mode)}
                    required
                  />
                </Field>
              </div>

              <ScheduleSummary
                date={date}
                startTime={startTime}
                endTime={endTime}
                mode={mode}
              />
            </div>
          </FormSection>

          <FormSection
            number="03"
            title="Preparation"
            description="Add the outcome and discussion points."
          >
            <div className="flex flex-col gap-4">
              <Field label="Purpose">
                <textarea
                  className={`${fieldClass} min-h-24 resize-y`}
                  name="purpose"
                  placeholder="Briefly explain the intended outcome."
                  required
                />
              </Field>
              <Field label="Agenda items" hint="One item per line">
                <textarea
                  className={`${fieldClass} min-h-32 resize-y`}
                  name="agenda"
                  placeholder={
                    "Review current position\nDiscuss recommendations\nAgree on next steps"
                  }
                  required
                />
              </Field>
            </div>
          </FormSection>
        </div>

        <footer className="flex items-center justify-between border-t border-line bg-white/20 px-6 py-4">
          <span className="text-[12px] text-quiet">
            All fields are required
          </span>
          <div className="flex items-center gap-2.5">
            <Link
              href="/meetings"
              className="rounded-[10px] px-4 py-2.5 text-[13px] font-semibold text-muted transition hover:bg-white/40 hover:text-ink"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[10px] bg-[#231F17] px-5 py-2.5 text-[13px] font-semibold text-[#F8F4EC] shadow-[0_10px_20px_-13px_rgba(35,31,23,0.7)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? "Creating meeting…" : "Create meeting"}
            </button>
          </div>
        </footer>
      </form>
    </section>
  );
}

function FormSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid grid-cols-[170px_1fr] gap-8 px-6 py-7">
      <div>
        <div className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-accent">
          {number}
        </div>
        <h2 className="m-0 text-[14px] font-semibold text-ink">{title}</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-quiet">
          {description}
        </p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">
        {label}
        {hint && (
          <span className="normal-case tracking-normal text-quiet">{hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

function GlassDateTimeField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="rounded-xl border border-white/65 bg-white/25 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_8px_20px_-18px_rgba(38,34,25,0.5)] backdrop-blur-xl transition focus-within:border-accent/40 focus-within:bg-white/40 focus-within:ring-4 focus-within:ring-accent/10">
      <span className="mb-2 block text-[9.5px] font-semibold uppercase tracking-[0.11em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function locationLabel(mode: MeetingMode) {
  if (mode === "Video") return "Video link or platform";
  if (mode === "Phone") return "Phone number";
  return "Location";
}

function locationPlaceholder(mode: MeetingMode) {
  if (mode === "Video") return "e.g. Google Meet";
  if (mode === "Phone") return "e.g. (415) 555-0100";
  return "e.g. Downtown Office · Conference Room A";
}

function ScheduleSummary({
  date,
  startTime,
  endTime,
  mode,
}: {
  date: string;
  startTime: string;
  endTime: string;
  mode: MeetingMode;
}) {
  const selected = parseLocalDate(date);
  const durationMinutes = getDurationMinutes(startTime, endTime);

  return (
    <aside className="mt-5 rounded-xl border border-white/70 bg-white/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_14px_30px_-26px_rgba(38,34,25,0.45)] backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent/10 text-accent">
          <CalendarIcon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-dim">
            Schedule summary
          </div>
          <div className="text-[11px] text-quiet">
            Review the selected time before creating
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-line-soft rounded-[10px] border border-line-soft bg-[#FCFAF5]/45">
        <div className="px-3.5 py-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-dim">
            Date
          </div>
          <div className="mt-1 text-[12px] font-semibold text-ink">
            {selected
              ? selected.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              : "Not selected"}
          </div>
        </div>
        <div className="px-3.5 py-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-dim">
            Time
          </div>
          <div className="mt-1 text-[12px] font-semibold tabular-nums text-ink">
            {startTime && endTime
              ? `${formatClockTime(startTime)}–${formatClockTime(endTime)}`
              : "Not selected"}
          </div>
        </div>
        <div className="px-3.5 py-3">
          <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-dim">
            Format
          </div>
          <div className="mt-1 text-[12px] font-semibold text-ink">
            {mode}
            {durationMinutes > 0 ? ` · ${durationLabel(durationMinutes)}` : ""}
          </div>
        </div>
      </div>
    </aside>
  );
}

function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatClockTime(value: string): string {
  const [hour, minute] = value.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDurationMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
}

function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}
