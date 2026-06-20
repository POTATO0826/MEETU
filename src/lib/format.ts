/** Format a USD amount compactly, e.g. 850000 -> "$850K", 2400000 -> "$2.4M". */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/** Format a USD amount in full, e.g. 850000 -> "$850,000". */
export function formatCurrencyFull(amount: number): string {
  return "$" + Math.round(amount).toLocaleString("en-US");
}

/** Show unknown lead portfolio sizes as text instead of "$0". */
export function formatLeadPortfolio(amount: number): string {
  return amount > 0 ? formatCurrency(amount) : "Not known";
}

/** Show unknown lead portfolio sizes as text instead of "$0". */
export function formatLeadPortfolioFull(amount: number): string {
  return amount > 0 ? formatCurrencyFull(amount) : "Not known";
}

/** Format an ISO date as e.g. "Jun 16, 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format a time as e.g. "9:00 AM". */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Calendar-day key (YYYY-MM-DD in local time) for grouping. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Day header label like "Today", "Tomorrow", "Yesterday", or "Monday". */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(d) - startOf(now)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

/** Long date like "Monday, June 23". */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Relative time like "Today", "Yesterday", "3 days ago", "2 weeks ago". */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const days = Math.round(
    (now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  const months = Math.round(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

/** Initials from a name, e.g. "Marcus Chen" -> "MC". */
export function initials(name: string): string {
  return name
    .replace(/&/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/* ----------------------------------------------------------------------------
 * Status tones — a soft colored dot + label on a tinted pill, per the MEETU
 * editorial palette. One helper maps every lead / meeting / client status.
 * ------------------------------------------------------------------------- */

export type StatusMeta = {
  /** Foreground: dot + label color. */
  fg: string;
  /** Pill background tint. */
  bg: string;
  /** Display label. */
  label: string;
};

const TONES = {
  blue: { fg: "#34548C", bg: "#E7EBF3" },
  green: { fg: "#566F4F", bg: "#E8EDE4" },
  clay: { fg: "#3F2505", bg: "#EBD8B8" },
  rust: { fg: "#9C3B33", bg: "#F2E4E0" },
  grey: { fg: "#7A7264", bg: "#ECE7DD" },
} as const;

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  // Leads
  New: "grey",
  Contacted: "blue",
  Qualified: "green",
  Proposal: "clay",
  // Meetings
  Confirmed: "green",
  Tentative: "clay",
  Completed: "grey",
  Canceled: "rust",
  // Clients
  Active: "green",
  Onboarding: "blue",
  "Review due": "rust",
};

export function statusMeta(value: string): StatusMeta {
  const tone = TONES[STATUS_TONE[value] ?? "grey"];
  return { fg: tone.fg, bg: tone.bg, label: value };
}

/** Treat confirmed meetings whose start time has passed as completed. */
export function meetingDisplayStatus(
  status: string,
  start: string,
  now: Date
): string {
  return status === "Confirmed" && new Date(start).getTime() < now.getTime()
    ? "Completed"
    : status;
}

/** Deterministic avatar gradient (CSS) based on the name. */
export function avatarGradient(name: string): string {
  const palettes = [
    ["#3F5681", "#717FA3"],
    ["#7E4A44", "#A6746C"],
    ["#566F4F", "#83967A"],
    ["#8A6A3A", "#B29772"],
    ["#48586A", "#7C8A98"],
    ["#6A5278", "#937DA1"],
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const [a, b] = palettes[hash % palettes.length];
  return `linear-gradient(140deg, ${a}, ${b})`;
}

/** Color for an allocation slice (bar + legend). */
export function allocColor(label: string): string {
  const map: Record<string, string> = {
    Stocks: "#34548C",
    Bonds: "#5E7359",
    Cash: "#B5AC9B",
    Alternatives: "#A8763C",
    "Real Estate": "#9C3B33",
  };
  return map[label] ?? "#9B927F";
}
