import { avatarGradient, initials, statusMeta } from "@/lib/format";

/** A soft status pill: tinted background, colored dot + label. */
export function StatusPill({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const s = statusMeta(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5 ${className}`}
      style={{
        background: s.bg,
        boxShadow: `inset 0 0 0 1px ${s.fg}1F`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: s.fg }}
      />
      <span className="text-[11px] font-semibold" style={{ color: s.fg }}>
        {s.label}
      </span>
    </span>
  );
}

/** A gradient initials avatar. */
export function Avatar({
  name,
  size = 44,
  fontSize,
  className = "",
}: {
  name: string;
  size?: number;
  fontSize?: number;
  className?: string;
}) {
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full font-semibold text-[#F4F0E6] ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: fontSize ?? Math.round(size * 0.32),
        background: avatarGradient(name),
      }}
    >
      {initials(name)}
    </span>
  );
}
