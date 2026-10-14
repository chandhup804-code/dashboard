export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="VivekFitness logo">
      <rect width="64" height="64" rx="16" fill="#C6FF2E" />
      <path d="M13 17l19 31 19-31" fill="none" stroke="#05080F" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="28" width="46" height="5" rx="2.5" fill="#05080F" />
      <rect x="6" y="22" width="5" height="17" rx="2" fill="#05080F" />
      <rect x="53" y="22" width="5" height="17" rx="2" fill="#05080F" />
    </svg>
  );
}

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const mark = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const text = size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-2xl";
  return (
    <div className="flex items-center gap-3">
      <LogoMark className={mark} />
      <span className={`font-display font-extrabold uppercase leading-none tracking-wide text-white ${text}`}>
        Vivek<span className="text-lime-400">Fitness</span>
      </span>
    </div>
  );
}
