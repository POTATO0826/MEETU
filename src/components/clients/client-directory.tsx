"use client";

import { useMemo, useState } from "react";
import type { Client } from "@/lib/clients";
import { formatCurrency } from "@/lib/format";
import { Search } from "@/components/icons";
import { ClientCard } from "./client-card";

export function ClientDirectory({
  clients,
  isLoading = false,
}: {
  clients: Client[];
  isLoading?: boolean;
}) {
  const [query, setQuery] = useState("");

  const totalAum = useMemo(
    () => clients.reduce((sum, c) => sum + c.aum, 0),
    [clients]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.occupation.toLowerCase().includes(q) ||
        c.serviceTopics.some((t) => t.toLowerCase().includes(q))
    );
  }, [clients, query]);

  return (
    <section className="mx-auto max-w-[1180px] px-14 pb-20 pt-12">
      <header className="relative mb-[26px] overflow-hidden border-b border-line pb-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-[90px] h-[200px] w-[280px] opacity-50 blur-[30px]"
          style={{
            background:
              "radial-gradient(55% 70% at 70% 30%, rgba(52,84,140,0.20), transparent 70%), radial-gradient(45% 55% at 40% 60%, rgba(156,59,51,0.14), transparent 72%)",
          }}
        />
        <div className="relative flex items-end justify-between gap-6">
          <div>
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-dim">
              Active clients
            </div>
            <h1 className="m-0 font-serif text-[38px] font-medium leading-none tracking-[-0.01em] text-[#231F17]">
              Client Profiles
            </h1>
          </div>
          <div className="flex items-end gap-[34px]">
            <div className="flex flex-col items-start">
              <span className="font-serif text-[30px] font-medium tabular-nums text-[#231F17]">
                {clients.length}
              </span>
              <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-dim">
                Clients
              </span>
            </div>
            <div className="h-[42px] w-px bg-line" />
            <div className="flex flex-col items-start">
              <span className="font-serif text-[30px] font-medium tabular-nums text-[#231F17]">
                {formatCurrency(totalAum)}
              </span>
              <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-dim">
                Total AUM
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative max-w-[420px] flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim">
            <Search className="h-[17px] w-[17px]" />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, occupation, or service…"
            aria-label="Search clients"
            className="w-full rounded-[11px] border border-line bg-panel py-[11px] pl-10 pr-3.5 text-sm text-ink-soft outline-none placeholder:text-dim focus:border-[#C9C0AC]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="px-5 py-20 text-center text-quiet">
          <div className="mb-2 font-serif text-[21px] text-muted">
            Loading clients
          </div>
          <div className="text-sm">
            Syncing the latest client profiles from Convex.
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="px-5 py-20 text-center text-quiet">
          <div className="mb-2 font-serif text-[21px] text-muted">
            No matching clients
          </div>
          <div className="text-sm">
            Nothing matches “{query}”. Try a different search.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-[18px]">
          {visible.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </section>
  );
}
