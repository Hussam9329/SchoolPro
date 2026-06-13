import * as React from "react";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", children, ...props }: SelectProps) {
  return (
    <select className={["input pr-4", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </select>
  );
}
