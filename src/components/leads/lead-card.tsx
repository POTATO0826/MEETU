import type { Lead } from "@/lib/leads";
import { formatCurrency, formatRelative } from "@/lib/format";
import { StatusPill, Avatar } from "@/components/ui";

export function LeadCard({
  lead,
  onSelect,
}: {
  lead: Lead;
  onSelect: (lead: Lead) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(lead)}
      className="glass-card flex flex-col gap-3.5 rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={lead.name} size={44} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base font-semibold text-ink-soft">
            {lead.name}
          </span>
          <span className="text-[12.5px] text-faint">{lead.occupation}</span>
        </span>
        <StatusPill status={lead.status} />
      </div>

      <div className="flex items-baseline justify-between gap-2.5 pb-1 pt-0.5">
        <span className="font-serif text-[25px] font-medium tabular-nums tracking-[-0.01em] text-[#231F17]">
          {formatCurrency(lead.estimatedPortfolio)}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-dim">
          Est. portfolio
        </span>
      </div>

      <p className="m-0 line-clamp-2 text-[13px] leading-[1.55] text-muted">
        {lead.situationTeaser}
      </p>

      <div className="flex items-center gap-2.5 border-t border-line-soft pt-3 text-[11.5px] text-quiet">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#5C6E86]">
          <span className="h-[5px] w-[5px] rounded-full bg-accent" />
          {lead.serviceInterest}
        </span>
        <span className="text-[#D8D1C2]">·</span>
        <span>{lead.source}</span>
        <span className="flex-1" />
        <span>Added {formatRelative(lead.addedDate)}</span>
      </div>
    </button>
  );
}
