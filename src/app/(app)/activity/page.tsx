"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ActivityBoard } from "@/components/activity/activity-board";
import { mapClientActivity } from "@/lib/client-activities";

export default function ActivityPage() {
  const convexActivities = useQuery(api.crm.listClientActivities, {});
  const activities = useMemo(
    () => (convexActivities ?? []).map(mapClientActivity),
    [convexActivities],
  );

  return (
    <ActivityBoard
      activities={activities}
      isLoading={convexActivities === undefined}
    />
  );
}
