"use client";

import * as React from "react";
import { TextInput } from "@astryxdesign/core/TextInput";

export interface InputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "defaultValue" | "disabled" | "onChange" | "size" | "type" | "value"
  > {
  disabled?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  type?: React.HTMLInputTypeAttribute;
  value?: string | number | readonly string[];
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      "aria-label": ariaLabel,
      disabled,
      id,
      name,
      onChange,
      placeholder,
      required,
      type,
      value,
      ...props
    },
    ref,
  ) => (
    <TextInput
      {...props}
      ref={ref}
      label={ariaLabel || placeholder || name || id || "Text input"}
      isLabelHidden
      isDisabled={disabled}
      isRequired={required}
      htmlName={name}
      placeholder={placeholder}
      type={type === "password" ? "password" : type === "email" ? "email" : "text"}
      value={Array.isArray(value) ? value.join(",") : String(value ?? "")}
      onChange={(_, event) => onChange?.(event)}
      width="100%"
    />
  ),
);

Input.displayName = "Input";

export { Input };
