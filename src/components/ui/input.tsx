import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return <input className={["input pr-4", className].filter(Boolean).join(" ")} {...props} />;
}
