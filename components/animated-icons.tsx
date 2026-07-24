import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
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
  return (
    <Text
      aria-hidden
      className={cn("inline-flex h-3.5 items-end gap-0.5", className)}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <Stack
          as="span"
          key={i}
          className={cn("h-full w-1 rounded-full bg-current", animate && "eq-bar")}
        />
      ))}
    </Text>
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
