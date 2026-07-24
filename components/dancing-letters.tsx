"use client";

// Chamaac UI "Dancing Letters" (chamaac.com/components/text-animations/dancing-letters),
// adapted: letters inherit the surrounding heading's font/size/color, and the
// whole effect is skipped for prefers-reduced-motion users.

import { m, LazyMotion, domAnimation, useReducedMotion } from "motion/react";
import { useState, useCallback, useEffect } from "react";
import { Text } from "@astryxdesign/core/Text";
import { cn } from "@/lib/utils";

interface DancingLettersProps {
  text: string;
  className?: string;
  letterClassName?: string;
}

// Sleek, physics-based animations (cycled per letter index)
const letterAnimations = [
  // 1. Rubber Band (Snap)
  {
    active: {
      scaleX: [1, 1.25, 0.75, 1.15, 0.95, 1.05, 1],
      scaleY: [1, 0.75, 1.25, 0.85, 1.05, 0.95, 1],
    },
    transition: { duration: 0.8, ease: "easeInOut" },
  },
  // 2. The Hinge (falling effect)
  {
    active: {
      rotate: [0, 80, 60, 80, 60, 0],
      y: [0, 10, -5, 5, -2, 0],
    },
    transition: { duration: 1.2, ease: [0.175, 0.885, 0.32, 1.275] },
  },
  // 3. Squash and Jump
  {
    active: {
      scaleY: [1, 0.6, 1.2, 1],
      y: [0, 20, -40, 0],
    },
    transition: { duration: 0.6, ease: "easeOut" },
  },
  // 4. Backflip
  {
    active: {
      rotateX: [0, 240, 150, 200, 175, 180, 180, 0],
      scale: [1, 1.1, 1],
    },
    transition: {
      duration: 2,
      ease: "easeOut",
      times: [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.85, 1],
    },
  },
  // 5. Elastic Slide
  {
    active: {
      x: [0, -20, 15, -10, 5, 0],
    },
    transition: { duration: 0.8, ease: "easeInOut" },
  },
  // 6. Impact Shake
  {
    active: {
      x: [0, -5, 5, -5, 5, -2, 2, 0],
      y: [0, -2, 2, -1, 1, 0],
      rotate: [0, -1, 1, -0.5, 0.5, 0],
    },
    transition: { duration: 0.5, ease: "linear" },
  },
  // 7. Pop (Scale)
  {
    active: {
      scale: [1, 1.4, 1],
    },
    transition: { duration: 0.5, ease: "easeInOut" },
  },
  // 8. Levitate
  {
    active: {
      y: [0, -30, 0],
      scale: [1, 1.1, 1],
    },
    transition: { duration: 1.2, ease: "easeInOut" },
  },
] as const;

const letterOrigins = [
  "origin-center",
  "origin-bottom-left",
  "origin-bottom",
  "origin-bottom",
  "origin-center",
  "origin-center",
  "origin-center",
  "origin-center",
] as const;

export function DancingLetters({ text, className, letterClassName }: DancingLettersProps) {
  const reducedMotion = useReducedMotion();
  const [activeIndices, setActiveIndices] = useState<Set<number>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  const letters = text.split("");

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = useCallback((index: number) => {
    setActiveIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      }
      // Small timeout to allow state clear if double clicking rapidly
      setTimeout(() => {
        setActiveIndices((current) => {
          const again = new Set(current);
          again.add(index);
          return again;
        });
      }, 10);
      return next;
    });
  }, []);

  const handleAnimationComplete = useCallback((index: number) => {
    setActiveIndices((prev) => {
      if (!prev.has(index)) return prev;
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  if (reducedMotion) {
    return <Text className={className}>{text}</Text>;
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.span
        className={cn("inline-flex select-none perspective-distant", className)}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: { staggerChildren: 0.05 },
          },
        }}
      >
        {letters.map((letter, id) => {
          const anim = letterAnimations[id % letterAnimations.length];
          const isActive = activeIndices.has(id);

          return (
            <m.span
              key={`${letter}-${id}`}
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.8 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  y: 0,
                  rotate: 0,
                  rotateX: 0,
                  rotateY: 0,
                  scaleX: 1,
                  scaleY: 1,
                  transition: { type: "spring", stiffness: 300, damping: 20 },
                },
                active: {
                  ...anim.active,
                  opacity: 1,
                  // @ts-expect-error transition tuple ease vs typed ease
                  transition: anim.transition,
                },
              }}
              animate={isActive ? "active" : isLoaded ? "visible" : undefined}
              onHoverStart={() => {
                if (!isActive) handleClick(id);
              }}
              onClick={() => handleClick(id)}
              onAnimationComplete={(definition) => {
                if (definition === "active") handleAnimationComplete(id);
              }}
              className={cn(
                "relative inline-block cursor-pointer transform-3d",
                letterOrigins[id % letterOrigins.length],
                letterClassName,
                isActive ? "z-10" : "z-0"
              )}
            >
              {letter === " " ? " " : letter}
            </m.span>
          );
        })}
      </m.span>
    </LazyMotion>
  );
}
