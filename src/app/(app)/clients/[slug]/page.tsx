"use client";

import Link from "next/link";
import { use } from "react";
import { useMemo } from "react";
import { useQuery } from "convex/react";
import { mapClient } from "@/lib/clients";
import {
  formatCurrency,
  formatCurrencyFull,
  formatDate,
  formatDayLabel,
  statusMeta,
} from "@/lib/format";
import { AllocationBar } from "@/components/clients/allocation-bar";
import { Avatar, StatusPill } from "@/components/ui";
import { ArrowLeft, Mail, Phone } from "@/components/icons";
import { api } from "../../../../../convex/_generated/api";

type ClientProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default function ClientProfilePage(props: ClientProfilePageProps) {
  const { slug } = use(props.params);
  const convexClient = useQuery(api.crm.getClientBySlug, { slug });
  const convexMeetings = useQuery(api.crm.listMeetings, {});
  const client = useMemo(
    () => (convexClient ? mapClient(convexClient) : null),
    [convexClient],
  );

  const clientMeetings = useMemo(() => {
    if (!client) return [];
    return (convexMeetings ?? [])
      .filter((meeting) => meeting.clientId === client.id)
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
  }, [client, convexMeetings]);

  if (convexClient === undefined) {
    return (
      <section className="mx-auto max-w-[1080px] px-14 pb-24 pt-9">
        <Link
          href="/clients"
          className="mb-[22px] inline-flex items-center gap-2 py-1.5 text-[13px] font-semibold text-faint transition-colors hover:text-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
        <div className="px-5 py-20 text-center text-quiet">
          <div className="mb-2 font-serif text-[21px] text-muted">
            Loading client
          </div>
          <div className="text-sm">
            Syncing the latest client profile from Convex.
          </div>
        </div>
      </section>
    );
  }

  if (!client) {
    return (
      <section className="mx-auto max-w-[1080px] px-14 pb-24 pt-9">
        <Link
          href="/clients"
          className="mb-[22px] inline-flex items-center gap-2 py-1.5 text-[13px] font-semibold text-faint transition-colors hover:text-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
        <div className="px-5 py-20 text-center text-quiet">
          <div className="mb-2 font-serif text-[21px] text-muted">
            Client not found
          </div>
          <div className="text-sm">
            This profile is not available in Convex.
          </div>
        </div>
      </section>
    );
  }

  const tel = client.phone.replace(/[^\d+]/g, "");

  return (
    <section className="mx-auto max-w-[1080px] px-14 pb-24 pt-9">
      <Link
        href="/clients"
        className="mb-[22px] inline-flex items-center gap-2 py-1.5 text-[13px] font-semibold text-faint transition-colors hover:text-muted"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to clients
      </Link>

      {/* Header */}
      <header className="relative mb-[30px] flex items-start justify-between gap-[30px] overflow-hidden border-b border-line pb-[30px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[30px] -top-[100px] h-[230px] w-80 opacity-50 blur-[32px]"
          style={{
            background:
              "radial-gradient(55% 70% at 70% 30%, rgba(52,84,140,0.22), transparent 70%), radial-gradient(45% 55% at 38% 62%, rgba(156,59,51,0.14), transparent 72%)",
          }}
        />
        <div className="relative flex items-center gap-[22px]">
          <Avatar name={client.name} size={84} fontSize={28} className="font-serif" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="m-0 font-serif text-[34px] font-medium leading-none tracking-[-0.01em] text-[#231F17]">
                {client.name}
              </h1>
              <StatusPill status={client.status} />
            </div>
            <p className="mt-[11px] text-[14.5px] text-muted">
              {client.occupation} · {client.age} · {client.location}
            </p>
          </div>
        </div>
      </header>

      {/* Headline stats */}
      <div className="mb-[34px] flex gap-6 rounded-2xl border border-hair bg-panel px-[26px] py-[22px]">
        <Stat label="Assets under mgmt" value={formatCurrency(client.aum)} first />
        <Stat label="Net worth" value={formatCurrency(client.netWorth)} />
        <Stat label="Client since" value={formatDate(client.clientSince)} />
      </div>

      <div className="grid grid-cols-[1fr_320px] items-start gap-6">
        {/* Main column */}
        <div className="flex min-w-0 flex-col gap-5">
          <Card title="Situation">
            <p className="m-0 text-[14.5px] leading-[1.65] text-body">
              {client.description}
            </p>
            <p className="mt-3.5 text-sm leading-[1.65] text-muted">
              {client.situation}
            </p>
          </Card>

          <div className="relative rounded-2xl border border-[#E9D9D4] bg-[#F5EEEC] px-[26px] py-6">
            <span className="absolute left-[22px] top-3.5 font-serif text-[46px] leading-none text-[#C99A92]">
              &ldquo;
            </span>
            <div className="mb-2.5 pl-[26px] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A87F77]">
              Why they approached us
            </div>
            <p className="m-0 pl-[26px] font-serif text-[18px] italic leading-snug text-[#6E4B45]">
              {client.whyApproached}
            </p>
          </div>

          <Card title="Goals">
            <div className="flex flex-col gap-[18px]">
              {client.goals.map((goal) => (
                <div key={goal.name}>
                  <div className="mb-[7px] flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-ink-soft">
                      {goal.name}
                    </span>
                    {goal.progress !== undefined && (
                      <span className="text-xs font-semibold tabular-nums text-[#5C6E86]">
                        {goal.progress}%
                      </span>
                    )}
                  </div>
                  {goal.progress !== undefined && (
                    <div className="mb-2 h-[7px] overflow-hidden rounded-[7px] bg-[#EEE8DB]">
                      <div
                        className="h-full rounded-[7px] [background:linear-gradient(90deg,#3F5681,#34548C)]"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  )}
                  <p className="m-0 text-[13px] leading-[1.55] text-muted">
                    {goal.detail}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Portfolio">
            <AllocationBar allocation={client.allocation} />
            <div className="mt-[22px] flex flex-col border-t border-line-soft">
              {client.accounts.map((account) => (
                <div
                  key={`${account.type}-${account.institution}`}
                  className="flex items-center justify-between gap-3.5 border-b border-line-soft py-[13px]"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-ink-soft">
                      {account.type}
                    </span>
                    <span className="text-xs text-quiet">
                      {account.institution}
                    </span>
                  </span>
                  <span className="text-[15px] font-semibold tabular-nums text-ink-soft">
                    {formatCurrencyFull(account.balance)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-[18px]">
          <MiniCard title="Relationship">
            <Row label="Advisor" value={client.advisor} />
            <Row label="Review cadence" value={client.cadence} />
            <Row label="Next review" value={formatDate(client.nextReview)} />
            <Row label="Risk tolerance" value={client.riskTolerance} />
            <Row label="Time horizon" value={client.timeHorizon} />
          </MiniCard>

          <MiniCard title="Household">
            <Row label="Spouse / partner" value={client.spouse ?? "—"} />
            {client.dependents.length > 0 ? (
              client.dependents.map((d) => (
                <Row key={d.name} label={d.relation} value={d.name} />
              ))
            ) : (
              <Row label="Dependents" value="None" />
            )}
          </MiniCard>

          <MiniCard title="Contact">
            <a
              href={`mailto:${client.email}`}
              className="flex items-center gap-2.5 py-2 text-[13px] font-semibold text-accent"
            >
              <Mail className="h-[15px] w-[15px] text-dim" />
              {client.email}
            </a>
            <a
              href={`tel:${tel}`}
              className="flex items-center gap-2.5 py-2 text-[13px] font-semibold text-accent"
            >
              <Phone className="h-[15px] w-[15px] text-dim" />
              {client.phone}
            </a>
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line-soft pt-3">
              {client.serviceTopics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-md bg-[#EAEEF5] px-2.5 py-[3px] text-[11px] font-medium text-[#5C6E86]"
                >
                  {topic}
                </span>
              ))}
            </div>
          </MiniCard>

          <MiniCard title="Recent meetings">
            {clientMeetings.length > 0 ? (
              clientMeetings.slice(0, 4).map((m) => {
                const tone = statusMeta(m.status);
                return (
                  <Link
                    key={m._id}
                    href="/meetings"
                    className="flex items-center gap-[11px] border-t border-line-soft py-[11px] first:border-t-0"
                  >
                    <span
                      className="h-[7px] w-[7px] flex-none rounded-full"
                      style={{ background: tone.fg }}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-ink-soft">
                        {m.title}
                      </span>
                      <span className="text-[11.5px] text-quiet">
                        {formatDayLabel(m.start)} · {m.status}
                      </span>
                    </span>
                  </Link>
                );
              })
            ) : (
              <p className="m-0 text-[13px] text-quiet">
                No recent meetings on file.
              </p>
            )}
          </MiniCard>

          <MiniCard title="Notes">
            <div className="flex flex-col gap-2.5">
              {client.notes.map((note, i) => (
                <div
                  key={i}
                  className="flex gap-[9px] text-[13px] leading-snug text-body"
                >
                  <span className="mt-[7px] h-[5px] w-[5px] flex-none rounded-full bg-[#C7BFAD]" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </MiniCard>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  first,
}: {
  label: string;
  value: string;
  first?: boolean;
}) {
  return (
    <div
      className={`flex flex-1 flex-col gap-1.5 pl-5 ${
        first ? "" : "border-l border-line-soft"
      }`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-dim">
        {label}
      </span>
      <span className="font-serif text-[28px] font-medium tabular-nums tracking-[-0.01em] text-[#231F17]">
        {value}
      </span>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hair bg-panel p-6">
      <h3 className="mb-3.5 mt-0 font-serif text-[18px] font-medium text-ink-soft">
        {title}
      </h3>
      {children}
    </section>
  );
}

function MiniCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hair bg-panel px-[22px] py-5">
      <h3 className="mb-3.5 mt-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-quiet">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line-soft py-2 first:border-t-0">
      <span className="text-[12.5px] text-quiet">{label}</span>
      <span className="text-right text-[13px] font-semibold text-ink-soft">
        {value}
      </span>
    </div>
  );
}
