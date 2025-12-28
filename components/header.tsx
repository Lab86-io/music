"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { MusicNote } from "@/components/icons";

interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MusicNote className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg">Playlist Converter</span>
        </div>
        <div className="flex items-center gap-3">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

