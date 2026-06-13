"use client";

/* ─────────────────────────────────────────────
 *  Print Button Component  (file 53)
 * ───────────────────────────────────────────── */

import { Printer } from "lucide-react";

type PrintButtonProps = {
  className?: string;
  label?: string;
};

export function PrintButton({
  className,
  label = "طباعة التقرير",
}: PrintButtonProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={`btn btn-secondary gap-2 print:hidden ${className ?? ""}`}
    >
      <Printer className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
