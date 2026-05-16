// Compact SVG flags (server-safe, no emoji).
export function Flag({
  code,
  className = "h-4 w-6",
}: {
  code: "az" | "en" | "ru";
  className?: string;
}) {
  if (code === "ru") {
    return (
      <svg viewBox="0 0 9 6" className={className} aria-hidden>
        <rect width="9" height="6" fill="#fff" />
        <rect y="2" width="9" height="4" fill="#0039a6" />
        <rect y="4" width="9" height="2" fill="#d52b1e" />
      </svg>
    );
  }
  if (code === "az") {
    return (
      <svg viewBox="0 0 9 6" className={className} aria-hidden>
        <rect width="9" height="2" fill="#00b9e4" />
        <rect y="2" width="9" height="2" fill="#ef3340" />
        <rect y="4" width="9" height="2" fill="#509e2f" />
        <circle cx="4.4" cy="3" r="0.95" fill="#fff" />
        <circle cx="4.65" cy="3" r="0.8" fill="#ef3340" />
        <path
          d="M5.5 2.45l.18.5.5.02-.4.32.14.5-.42-.3-.42.3.14-.5-.4-.32.5-.02z"
          fill="#fff"
        />
      </svg>
    );
  }
  // en — Union Jack (simplified)
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden>
      <clipPath id="uj">
        <rect width="60" height="30" />
      </clipPath>
      <g clipPath="url(#uj)">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 60,30 M60,0 0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 60,30 M60,0 0,30" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}
