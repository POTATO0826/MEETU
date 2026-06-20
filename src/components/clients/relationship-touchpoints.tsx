"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatDate } from "@/lib/format";

const SOURCE_TONE = {
  WhatsApp: "bg-[#E7EBF3] text-[#34548C]",
  Facebook: "bg-[#E6EEF7] text-[#2F5D8C]",
  Manual: "bg-[#ECE7DD] text-[#7A7264]",
  Other: "bg-[#EEE8DB] text-[#6E6251]",
} as const;

export function RelationshipTouchpoints({ clientId }: { clientId: string }) {
  const activities = useQuery(api.social.listClientActivities, {
    clientId: clientId as Id<"clients">,
  });

  const isLoading = activities === undefined;
  const visibleActivities = activities?.slice(0, 4) ?? [];

  if (isLoading) {
    return <p className="m-0 text-[13px] text-quiet">Loading touchpoints...</p>;
  }

  if (visibleActivities.length === 0) {
    return (
      <p className="m-0 text-[13px] text-quiet">
        No relationship touchpoints yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        {visibleActivities.map((activity) => (
          <div
            key={activity._id}
            className="rounded-lg bg-[#F6F1E8] px-3 py-2.5"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <SourceBadge source={activity.source} />
              <span className="text-[10.5px] font-semibold text-dim">
                {formatDate(activity.mentionedAt)}
              </span>
            </div>
            <p className="m-0 text-[12.5px] font-semibold leading-snug text-ink-soft">
              {activity.activity}
            </p>
            <p className="mt-1.5 text-[12px] leading-snug text-muted">
              {activity.suggestedTouchpoint}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: keyof typeof SOURCE_TONE }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${SOURCE_TONE[source]}`}
    >
      {source}
    </span>
  );
}
