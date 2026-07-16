import { cn } from "@/lib/utils";

/**
 * Animated equalizer bars — the app's "music is playing" motif.
 * Inherits color from `currentColor`; disable motion via prefers-reduced-motion.
 */
export function Equalizer({
  className,
  animate = true,
}: {
  className?: string;
  animate?: boolean;
}) {
  const bars = [
    { height: "55%", delay: "-0.9s", duration: "1.1s" },
    { height: "100%", delay: "-0.35s", duration: "0.9s" },
    { height: "70%", delay: "-0.6s", duration: "1.25s" },
    { height: "88%", delay: "-0.1s", duration: "1.05s" },
  ];
  return (
    <span
      aria-hidden
      className={cn("inline-flex h-3.5 items-end gap-[2.5px]", className)}
    >
      {bars.map((bar, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full bg-current", animate && "eq-bar")}
          style={{
            height: bar.height,
            animationDelay: bar.delay,
            animationDuration: bar.duration,
          }}
        />
      ))}
    </span>
  );
}

/**
 * Vinyl record icon; spins while `spinning` — used as the converting state.
 */
export function Vinyl({
  className,
  spinning = false,
}: {
  className?: string;
  spinning?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("shrink-0", spinning && "animate-spin-vinyl", className)}
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <circle cx="12" cy="12" r="7.2" stroke="white" strokeOpacity="0.22" strokeWidth="0.75" />
      <circle cx="12" cy="12" r="5.4" stroke="white" strokeOpacity="0.22" strokeWidth="0.75" />
      <circle cx="12" cy="12" r="3" fill="white" fillOpacity="0.92" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
      {/* light glint so rotation is visible */}
      <path
        d="M12 2 A10 10 0 0 1 20.5 6.8"
        stroke="white"
        strokeOpacity="0.55"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
