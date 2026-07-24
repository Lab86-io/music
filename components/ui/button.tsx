"use client";

import * as React from "react";
import {
  Button as AstryxButton,
  type ButtonProps as AstryxButtonProps,
} from "@astryxdesign/core/Button";

type LegacyButtonVariant =
  | "default"
  | "outline"
  | "secondary"
  | "ghost"
  | "destructive"
  | "link";
type LegacyButtonSize =
  | "default"
  | "xs"
  | "sm"
  | "lg"
  | "icon"
  | "icon-xs"
  | "icon-sm"
  | "icon-lg";

export interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "disabled" | "size"
  > {
  children?: React.ReactNode;
  disabled?: boolean;
  variant?: LegacyButtonVariant;
  size?: LegacyButtonSize;
}

const variantMap: Record<LegacyButtonVariant, AstryxButtonProps["variant"]> = {
  default: "primary",
  outline: "secondary",
  secondary: "secondary",
  ghost: "ghost",
  destructive: "destructive",
  link: "ghost",
};

const sizeMap: Record<LegacyButtonSize, AstryxButtonProps["size"]> = {
  default: "md",
  xs: "sm",
  sm: "sm",
  lg: "lg",
  icon: "md",
  "icon-xs": "sm",
  "icon-sm": "sm",
  "icon-lg": "lg",
};

function getAccessibleLabel(children: React.ReactNode, ariaLabel?: string) {
  if (ariaLabel) return ariaLabel;
  if (typeof children === "string" || typeof children === "number") return String(children);
  return "Action";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      disabled,
      variant = "default",
      size = "default",
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const isIconOnly = size.startsWith("icon");
    const label = getAccessibleLabel(children, ariaLabel);

    return (
      <AstryxButton
        {...props}
        ref={ref}
        label={label}
        aria-label={ariaLabel}
        variant={variantMap[variant]}
        size={sizeMap[size]}
        isDisabled={disabled}
        isIconOnly={isIconOnly}
        icon={isIconOnly ? children : undefined}
      >
        {isIconOnly ? undefined : children}
      </AstryxButton>
    );
  },
);

Button.displayName = "Button";

export { Button };
