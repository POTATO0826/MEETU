"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon,
  ClientsIcon,
  UsersIcon,
} from "@/components/icons";

const links = [
  {
    href: "/leads",
    label: "Leads",
    sub: "Pipeline",
    icon: UsersIcon,
    accent: "#34548C",
    tint: "rgba(52,84,140,0.10)",
  },
  {
    href: "/meetings",
    label: "Meetings",
    sub: "Schedule",
    icon: CalendarIcon,
    accent: "#566F4F",
    tint: "rgba(86,111,79,0.12)",
  },
  {
    href: "/clients",
    label: "Client Profiles",
    sub: "Active book",
    icon: ClientsIcon,
    accent: "#9C3B33",
    tint: "rgba(156,59,51,0.10)",
  },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="relative z-[2] flex h-screen w-64 flex-none flex-col overflow-hidden border-r border-line bg-sidebar">
      {/* Editorial corner wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[50px] -top-[60px] h-60 w-[280px] opacity-[0.55] blur-[26px]"
        style={{
          background:
            "radial-gradient(55% 70% at 30% 25%, rgba(52,84,140,0.30), transparent 70%), radial-gradient(50% 60% at 72% 48%, rgba(156,59,51,0.14), transparent 72%), radial-gradient(45% 55% at 45% 75%, rgba(52,84,140,0.16), transparent 70%)",
        }}
      />

      <div className="relative px-[26px] pb-[22px] pt-[30px]">
        <Link href="/" className="flex items-baseline gap-2.5">
          <span className="font-serif text-[25px] font-medium tracking-[0.16em] text-[#231F17]">
            MEETU
          </span>
          <span className="inline-block h-1.5 w-1.5 -translate-y-[3px] rounded-full bg-accent" />
        </Link>
        <div className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-dim">
          Advisor workspace
        </div>
      </div>

      <nav className="relative flex flex-col gap-1.5 px-3.5 py-2.5">
        <div className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-ghost">
          Workspace
        </div>
        {links.map(({ href, label, sub, icon: Icon, accent, tint }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className="group relative flex items-center gap-3 rounded-[13px] border px-[11px] py-2.5 transition-colors"
              style={{
                background: active ? tint : "transparent",
                borderColor: active ? "rgba(0,0,0,0.04)" : "transparent",
              }}
            >
              {active && (
                <span
                  className="absolute -left-3.5 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-[3px]"
                  style={{ background: accent }}
                />
              )}
              <span
                className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border transition-colors"
                style={{
                  background: active ? accent : "#F1ECE1",
                  borderColor: active ? accent : "#E5DFD1",
                  color: active ? "#F4F0E6" : "#8A8170",
                }}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-px">
                <span
                  className="text-sm tracking-[0.005em]"
                  style={{
                    color: active ? "#231F17" : "#5C5446",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {label}
                </span>
                <span
                  className="text-[11px] font-semibold tracking-[0.04em]"
                  style={{ color: active ? accent : "#A8A08D" }}
                >
                  {sub}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="relative m-4 flex items-center gap-[11px] rounded-[13px] border border-hair bg-panel p-3.5">
        <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-[13px] font-semibold tracking-[0.02em] text-[#F4F0E6] [background:linear-gradient(140deg,#3F5681,#717FA3)]">
          FA
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[13px] font-semibold text-ink-soft">
            Financial Advisor
          </span>
          <span className="text-[11.5px] text-quiet">Your workspace</span>
        </span>
      </div>
    </aside>
  );
}
