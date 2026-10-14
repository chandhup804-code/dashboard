/** Simple equipment illustrations (SVG). Drop a real photo at public/images/login-hero.jpg to layer it behind. */
export function Dumbbell({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 80" className={className} fill="none" aria-hidden="true">
      <rect x="60" y="35" width="80" height="10" rx="5" fill="#22304F" />
      <rect x="44" y="14" width="16" height="52" rx="5" fill="#C6FF2E" />
      <rect x="28" y="22" width="14" height="36" rx="5" fill="#8FC400" />
      <rect x="14" y="33" width="12" height="14" rx="4" fill="#22304F" />
      <rect x="140" y="14" width="16" height="52" rx="5" fill="#C6FF2E" />
      <rect x="158" y="22" width="14" height="36" rx="5" fill="#8FC400" />
      <rect x="174" y="33" width="12" height="14" rx="4" fill="#22304F" />
    </svg>
  );
}
export function Kettlebell({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 130" className={className} fill="none" aria-hidden="true">
      <path d="M38 52c-6-30 8-42 22-42s28 12 22 42" stroke="#22304F" strokeWidth="11" strokeLinecap="round" />
      <circle cx="60" cy="82" r="38" fill="#0F182C" stroke="#C6FF2E" strokeWidth="4" />
      <circle cx="60" cy="82" r="14" fill="#C6FF2E" opacity=".15" />
      <path d="M44 74a22 22 0 0 1 32 0" stroke="#C6FF2E" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}
export function Plate({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="#0F182C" stroke="#22304F" strokeWidth="4" />
      <circle cx="60" cy="60" r="42" stroke="#C6FF2E" strokeWidth="3" opacity=".8" />
      <circle cx="60" cy="60" r="10" fill="#05080F" stroke="#C6FF2E" strokeWidth="3" />
      <path d="M60 18v14M60 88v14M18 60h14M88 60h14" stroke="#22304F" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function HeroArt({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-ink-900 ${className}`}>
      <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: "url(/images/login-hero.jpg)" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
      <Plate className="absolute -right-10 -top-10 h-56 w-56 opacity-60" />
      <Kettlebell className="absolute bottom-6 left-6 h-36 w-36 opacity-90 sm:h-44 sm:w-44" />
      <Dumbbell className="absolute bottom-10 right-4 h-24 w-56 -rotate-12 sm:h-28 sm:w-64" />
    </div>
  );
}
