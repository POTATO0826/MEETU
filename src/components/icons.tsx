/**
 * Shared line icons (Feather-style, 1.6–1.8 stroke) used across MEETU.
 */

type IconProps = { className?: string };

function base(className?: string) {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function ArrowRight({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={1.8}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowLeft({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={1.8}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function Chevron({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={1.9}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function Close({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={1.8}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function Search({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={1.7}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function Mail({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={1.6}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function Phone({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={1.6}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function Check({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={2.4}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={1.6}>
      <path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 19v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={1.6}>
      <rect x="3" y="4" width="18" height="18" rx="2.2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function AgendaIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={1.7}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ClientsIcon({ className }: IconProps) {
  return (
    <svg {...base(className)} strokeWidth={1.6}>
      <rect x="3" y="5" width="18" height="14" rx="2.2" />
      <circle cx="9" cy="11" r="2.3" />
      <path d="M14 10h4M14 14h4M5.6 16a3 3 0 0 1 6.8 0" />
    </svg>
  );
}
