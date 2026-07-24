"use client";

import { useTheme } from "./theme-provider";
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <DropdownMenu
      button={{
        label: `Theme: ${theme}`,
        icon: resolvedTheme === "dark" ? <IconMoon size={18} /> : <IconSun size={18} />,
        isIconOnly: true,
        variant: "ghost",
      }}
      hasChevron={false}
      items={[
        { label: "Light", icon: <IconSun size={16} />, onClick: () => setTheme("light") },
        { label: "Dark", icon: <IconMoon size={16} />, onClick: () => setTheme("dark") },
        {
          label: "System",
          icon: <IconDeviceDesktop size={16} />,
          onClick: () => setTheme("system"),
        },
      ]}
    />
  );
}
