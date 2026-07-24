"use client";

import * as React from "react";
import { Button } from "@astryxdesign/core/Button";
import { Tooltip as AstryxTooltip } from "@astryxdesign/core/Tooltip";

interface TooltipTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  render?: React.ReactElement;
}

interface TooltipContentProps {
  children: React.ReactNode;
}

function TooltipTrigger({
  render,
  children,
  disabled,
  "aria-label": ariaLabel,
  ...props
}: TooltipTriggerProps) {
  if (render) {
    return React.cloneElement(render, props, children);
  }
  const label =
    ariaLabel ||
    (typeof children === "string" || typeof children === "number"
      ? String(children)
      : "Action");
  return (
    <Button
      {...props}
      label={label}
      variant="ghost"
      isDisabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  );
}

function TooltipContent({ children }: TooltipContentProps) {
  return <>{children}</>;
}

function Tooltip({ children }: { children: React.ReactNode }) {
  let trigger: React.ReactElement | null = null;
  let content: React.ReactNode = null;

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === TooltipTrigger) {
      const props = child.props as TooltipTriggerProps;
      trigger = <TooltipTrigger {...props} />;
    }
    if (child.type === TooltipContent) {
      content = (child.props as TooltipContentProps).children;
    }
  });

  if (!trigger) return null;
  return <AstryxTooltip content={content}>{trigger}</AstryxTooltip>;
}

function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
