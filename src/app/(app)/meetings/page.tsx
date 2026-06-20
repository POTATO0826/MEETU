"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { MeetingsAgenda } from "@/components/meetings/meetings-agenda";
import type { Meeting } from "@/lib/meetings";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";

export default function MeetingsPage() {
  const convexMeetings = useQuery(api.crm.listMeetings, {});
  const meetings = useMemo(
    () => (convexMeetings ?? []).map(mapMeeting),
    [convexMeetings],
  );

  return (
    <MeetingsAgenda
      loading={convexMeetings === undefined}
      meetings={meetings}
    />
  );
}

function mapMeeting(meeting: Doc<"meetings">): Meeting {
  return {
    id: meeting._id,
    title: meeting.title,
    attendee: meeting.attendee,
    attendeeRole: meeting.attendeeRole,
    start: meeting.start,
    durationMinutes: meeting.durationMinutes,
    mode: meeting.mode,
    location: meeting.location,
    status: meeting.status,
    topic: meeting.topic,
    purpose: meeting.purpose,
    agenda: meeting.agenda,
  };
}
