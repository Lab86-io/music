"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { TopNav, TopNavHeading, TopNavItem } from "@astryxdesign/core/TopNav";
import { HStack } from "@astryxdesign/core/Stack";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  const pathname = usePathname();

  return (
    <TopNav
      label="Music navigation"
      heading={
        <TopNavHeading
          heading="Music"
          headingHref="/"
          logo={
          <Image
            src="/logo.png"
                alt=""
            width={28}
            height={28}
                className="rounded-sm"
          />
          }
        />
      }
      startContent={
        <HStack gap={1}>
          <TopNavItem label="Convert" href="/convert" isSelected={pathname === "/convert"} />
          <TopNavItem
            label="Playlists"
            href="/dashboard"
            isSelected={pathname.startsWith("/dashboard")}
          />
        </HStack>
      }
      endContent={
          <ThemeToggle />
      }
    />
  );
}
