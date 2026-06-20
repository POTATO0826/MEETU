import Link from "next/link";
import { NeuralNetwork } from "@/components/backdrop/neural-network";
import { ArrowRight } from "@/components/icons";

const pillars = [
  { label: "Leads", dot: "#34548C" },
  { label: "Meetings", dot: "#566F4F" },
  { label: "Client Profiles", dot: "#9C3B33" },
  { label: "News Radar", dot: "#B5832E", tag: "New" },
];

export default function LandingPage() {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-paper-2">
      <NeuralNetwork />

      {/* Soft cream vignette so the headline reads over the network */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[53%] z-[1] h-[600px] w-[860px] max-w-[96vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[6px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(240,235,225,0.9), rgba(240,235,225,0.6) 46%, rgba(240,235,225,0) 78%)",
        }}
      />

      <header className="relative z-[2] flex flex-none items-center justify-between px-11 py-6">
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif text-[23px] font-medium tracking-[0.16em] text-[#231F17]">
            MEETU
          </span>
          <span className="inline-block h-1.5 w-1.5 -translate-y-[3px] rounded-full bg-accent" />
        </div>
        <Link
          href="/meetings"
          className="inline-flex items-center gap-2 px-1.5 py-2 text-[13px] font-semibold text-muted transition-colors hover:text-ink"
        >
          Enter workspace
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <main className="relative z-[2] flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        <div className="animate-fade-in mb-7 flex items-center gap-2.5">
          <span className="h-[7px] w-[7px] rounded-full bg-[#1C1A16] shadow-[0_0_0_5px_rgba(28,26,22,0.10)]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-faint">
            A living network of relationships
          </span>
        </div>

        <div className="animate-fade-up mb-4 text-[11px] font-semibold uppercase tracking-[0.26em] text-dim [animation-delay:0.15s]">
          Independent advisory, distilled
        </div>

        <h1 className="animate-fade-up m-0 max-w-[760px] font-serif text-[52px] font-medium leading-[1.06] tracking-[-0.015em] text-[#1C1913] [animation-delay:0.28s]">
          Your book of business,
          <br />
          in one calm place.
        </h1>

        <p className="animate-fade-up mt-[22px] max-w-[520px] text-[15.5px] leading-[1.6] text-muted [animation-delay:0.42s]">
          Leads, meetings, and client profiles — held together with quiet
          precision. Now with AI that turns today&rsquo;s news into ready-to-use
          conversation starters for every client.
        </p>

        <div className="animate-fade-up mt-[30px] flex items-center gap-4 [animation-delay:0.56s]">
          <Link
            href="/meetings"
            className="inline-flex items-center gap-2.5 rounded-xl border border-[#1C1A16] bg-[#1C1A16] px-6 py-[13px] text-sm font-semibold text-[#F4F0E6] shadow-[0_14px_30px_-16px_rgba(28,26,22,0.55)] transition-transform hover:-translate-y-0.5"
          >
            Open workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="animate-fade-up mt-[38px] flex items-center gap-5 [animation-delay:0.7s]">
          {pillars.map((p) => (
            <span
              key={p.label}
              className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-faint"
            >
              <span
                className="h-[5px] w-[5px] rounded-full"
                style={{ background: p.dot }}
              />
              {p.label}
              {"tag" in p && p.tag && (
                <span
                  className="rounded-full border border-[#D6BE7E] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
                  style={{ color: "#9A7322", background: "rgba(181,131,46,0.10)" }}
                >
                  {p.tag}
                </span>
              )}
            </span>
          ))}
        </div>
      </main>

      <footer className="relative z-[2] flex flex-none items-center justify-center p-[22px] text-[11.5px] tracking-[0.04em] text-ghost">
        A workspace for the independent financial advisor
      </footer>
    </div>
  );
}
