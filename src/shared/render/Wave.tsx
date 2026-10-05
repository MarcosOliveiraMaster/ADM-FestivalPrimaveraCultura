/** Onda decorativa usada como divisor entre seções. */
export function Wave({ color, flip, animate, className = "" }: { color?: string; flip?: boolean; animate?: boolean; className?: string }) {
  return (
    <div aria-hidden className={`fp-wave ${flip ? "fp-wave-flip" : ""} ${animate ? "fp-wave-anim" : ""} ${className}`} style={{ color: color || "var(--fp-bg)" }}>
      <svg viewBox="0 0 2400 60" preserveAspectRatio="none">
        <path className="fp-wave-back" d="M0 30 Q150 0 300 30 T600 30 T900 30 T1200 30 T1500 30 T1800 30 T2100 30 T2400 30 V60 H0Z" />
        <path className="fp-wave-front" d="M0 38 Q150 12 300 38 T600 38 T900 38 T1200 38 T1500 38 T1800 38 T2100 38 T2400 38 V60 H0Z" />
      </svg>
    </div>
  );
}
