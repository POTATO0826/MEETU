export type ClientActivityCategory =
  | "Travel"
  | "Family"
  | "Work"
  | "Health"
  | "Milestone"
  | "Availability";

export type ClientActivity = {
  id: string;
  clientName: string;
  clientSlug: string;
  category: ClientActivityCategory;
  activity: string;
  timeframe: string;
  mentionedAt: string;
  suggestedTouchpoint: string;
  source: "WhatsApp" | "Facebook" | "Manual" | "Other";
  priority: "Upcoming" | "Recent" | "Watch";
};

export type ClientActivityRecord = Omit<ClientActivity, "id"> & {
  _id: string;
};

export function mapClientActivity(
  activity: ClientActivityRecord,
): ClientActivity {
  return {
    id: activity._id,
    clientName: activity.clientName,
    clientSlug: activity.clientSlug,
    category: activity.category,
    activity: activity.activity,
    timeframe: activity.timeframe,
    mentionedAt: activity.mentionedAt,
    suggestedTouchpoint: activity.suggestedTouchpoint,
    source: activity.source,
    priority: activity.priority,
  };
}
