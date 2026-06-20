"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import type { Lead } from "@/lib/leads";
import { formatDate, formatLeadPortfolioFull } from "@/lib/format";
import { Drawer, CloseButton, DrawerLabel } from "@/components/drawer";
import { StatusPill, Avatar } from "@/components/ui";
import { Mail, Phone } from "@/components/icons";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function LeadDrawer({
  lead,
  onClose,
}: {
  lead: Lead | null;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={lead !== null}
      onClose={onClose}
      width={480}
      label={lead ? `${lead.name} details` : "Lead details"}
    >
      {lead && <Inner lead={lead} onClose={onClose} />}
    </Drawer>
  );
}

function Inner({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const convertLeadToClient = useMutation(api.crm.convertLeadToClient);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const tel = lead.phone.replace(/[^\d+]/g, "");
  const timeline = [...lead.timeline].reverse();

  const handleConvert = async () => {
    setIsConverting(true);
    setConversionError(null);
    try {
      await convertLeadToClient({ leadId: lead.id as Id<"leads"> });
      onClose();
    } catch (error) {
      setConversionError(
        error instanceof Error ? error.message : "Conversion failed",
      );
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden border-b border-line px-7 pb-[22px] pt-[26px]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-[30px] -top-20 h-[180px] w-60 opacity-50 blur-[28px]"
          style={{
            background:
              "radial-gradient(55% 70% at 70% 30%, rgba(52,84,140,0.22), transparent 70%), radial-gradient(45% 55% at 40% 60%, rgba(156,59,51,0.14), transparent 72%)",
          }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <Avatar name={lead.name} size={54} fontSize={18} />
            <div>
              <h2 className="m-0 font-serif text-2xl font-medium text-[#231F17]">
                {lead.name}
              </h2>
              <p className="mt-[5px] text-[13px] text-faint">
                {lead.age} · {lead.occupation} · {lead.location}
              </p>
            </div>
          </div>
          <CloseButton onClose={onClose} />
        </div>
        <div className="relative mt-4 flex items-center gap-2.5">
          <StatusPill status={lead.status} />
          <span className="rounded-md bg-[#EAEEF5] px-2.5 py-1 text-xs font-semibold text-[#5C6E86]">
            {lead.serviceInterest}
          </span>
          <span className="text-xs text-quiet">via {lead.source}</span>
        </div>
        {lead.status !== "Converted" && (
          <div className="relative mt-5">
            <button
              type="button"
              onClick={handleConvert}
              disabled={isConverting}
              className="inline-flex w-full items-center justify-center rounded-[10px] border border-[#C9C0AC] bg-[#2F405F] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#263650] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConverting ? "Converting..." : "Convert to Client"}
            </button>
            {conversionError && (
              <p className="mb-0 mt-2 text-xs font-semibold text-[#A65045]">
                {conversionError}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 px-7 py-6">
        <div className="flex gap-5 rounded-[13px] border border-hair bg-panel px-[18px] py-4">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-dim">
              Est. portfolio
            </span>
            <span className="font-serif text-[26px] font-medium tabular-nums text-[#231F17]">
              {formatLeadPortfolioFull(lead.estimatedPortfolio)}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-0.5 border-l border-line-soft pl-[18px]">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-dim">
              Last contact
            </span>
            <span className="mt-1.5 text-[15px] font-semibold text-ink-soft">
              {formatDate(lead.lastContact)}
            </span>
          </div>
        </div>

        <div>
          <DrawerLabel>Situation</DrawerLabel>
          <p className="m-0 text-sm leading-relaxed text-body">{lead.situation}</p>
        </div>

        <div className="rounded-[13px] border border-[#E9D9D4] bg-[#F5EEEC] px-[18px] py-4">
          <h4 className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#A87F77]">
            Why they approached us
          </h4>
          <p className="m-0 font-serif text-[15px] italic leading-snug text-[#6E4B45]">
            {lead.whyApproached}
          </p>
        </div>

        <div>
          <DrawerLabel>Contact</DrawerLabel>
          <a
            href={`mailto:${lead.email}`}
            className="flex items-center gap-2.5 py-[7px] text-[13.5px] font-semibold text-accent"
          >
            <Mail className="h-[15px] w-[15px] text-dim" />
            {lead.email}
          </a>
          <a
            href={`tel:${tel}`}
            className="flex items-center gap-2.5 py-[7px] text-[13.5px] font-semibold text-accent"
          >
            <Phone className="h-[15px] w-[15px] text-dim" />
            {lead.phone}
          </a>
        </div>

        {lead.notes.length > 0 && (
          <div>
            <DrawerLabel>Notes</DrawerLabel>
            <div className="flex flex-col gap-[9px]">
              {lead.notes.map((note, i) => (
                <div
                  key={i}
                  className="flex gap-[9px] text-[13.5px] leading-snug text-body"
                >
                  <span className="mt-[7px] h-[5px] w-[5px] flex-none rounded-full bg-[#C7BFAD]" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <DrawerLabel>Activity</DrawerLabel>
          <div className="flex flex-col">
            {timeline.map((event, i) => {
              const last = i === timeline.length - 1;
              return (
                <div key={i} className="flex gap-3.5">
                  <div className="flex flex-none flex-col items-center">
                    <span className="h-[9px] w-[9px] rounded-full border-2 border-sidebar bg-accent shadow-[0_0_0_1px_#34548C]" />
                    {!last && <span className="w-[1.5px] flex-1 bg-line" />}
                  </div>
                  <div className="pb-[18px]">
                    <div className="mb-[3px] text-[11px] font-semibold uppercase tracking-[0.06em] text-dim">
                      {formatDate(event.date)}
                    </div>
                    <div className="text-[13.5px] leading-snug text-body">
                      {event.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
