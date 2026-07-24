import * as React from "react";
import {
  Badge as AstryxBadge,
  type BadgeVariant as AstryxBadgeVariant,
} from "@astryxdesign/core/Badge";

type LegacyBadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: LegacyBadgeVariant;
}

const variantMap: Record<LegacyBadgeVariant, AstryxBadgeVariant> = {
  default: "info",
  secondary: "neutral",
  destructive: "error",
  outline: "neutral",
  ghost: "neutral",
  link: "info",
};

function Badge({ children, variant = "default", ...props }: BadgeProps) {
  return <AstryxBadge {...props} variant={variantMap[variant]} label={children} />;
}

export { Badge };
