import Link from "next/link";
import type { Client } from "@/lib/clients";
import { formatCurrency } from "@/lib/format";
import { StatusPill, Avatar } from "@/components/ui";
import { Chevron } from "@/components/icons";

export function ClientCard({ client }: { client: Client }) {
  return (
    <Link
      href={`/clients/${client.slug}`}
      className="glass-card glass-interactive flex flex-col gap-4 rounded-2xl border p-[22px]"
    >
      <div className="flex items-center gap-3.5">
        <Avatar name={client.name} size={50} fontSize={16} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[17px] font-semibold text-ink-soft">
            {client.name}
          </span>
          <span className="truncate text-[12.5px] text-faint">
            {client.occupation} · {client.age} · {client.location}
          </span>
        </span>
        <StatusPill status={client.status} />
      </div>

      <div className="flex flex-col border-y border-line-soft py-3">
        <span className="font-serif text-[26px] font-medium tabular-nums text-[#231F17]">
          {formatCurrency(client.aum)}
        </span>
        <span className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-dim">
          Assets under mgmt
        </span>
      </div>

      <div className="flex items-center justify-between gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          {client.serviceTopics.map((topic) => (
            <span
              key={topic}
              className="rounded-md bg-[#EAEEF5] px-2.5 py-[3px] text-[11px] font-medium text-[#5C6E86]"
            >
              {topic}
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-quiet">
          View
          <Chevron className="h-[15px] w-[15px]" />
        </span>
      </div>
    </Link>
  );
}
