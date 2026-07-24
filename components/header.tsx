"use client";

import Image from "next/image";
import Link from "next/link";
import { HStack, Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Minimal floating brand strip — the app is a single tool, so there is no
 * navigation. Just the wordmark (home link) and the theme toggle.
 */
export function Header() {
  return (
    <HStack
      as="header"
      justify="between"
      align="center"
      className="bg-body px-4 py-3 sm:px-6"
    >
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-bg"
      >
        <Image
          src="/logo.png"
          alt=""
          width={28}
          height={28}
          className="rounded-sm"
        />
        <Text weight="semibold" className="font-display text-lg">
          Music
        </Text>
      </Link>
      <Stack>
        <ThemeToggle />
      </Stack>
    </HStack>
  );
}
