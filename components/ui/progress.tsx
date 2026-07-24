"use client";

import { ProgressBar } from "@astryxdesign/core/ProgressBar";

interface ProgressProps {
  className?: string;
  value?: number | null;
}

function Progress({ className, value }: ProgressProps) {
  return (
    <ProgressBar
      className={className}
      label="Playlist conversion progress"
      value={value ?? 0}
      isLabelHidden
    />
  );
}

export { Progress };
