"use client";

import { useCallback } from "react";
import { Copy, IdCard, QrCode } from "lucide-react";

type CopyCodeButtonProps = {
  studentCode: string;
};

export function CopyCodeButton({ studentCode }: CopyCodeButtonProps) {
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(studentCode);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = studentCode;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }, [studentCode]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[var(--app-text-muted)] transition hover:bg-indigo-100 hover:text-indigo-700"
      title="نسخ الرمز"
    >
      <Copy size={12} />
      نسخ
    </button>
  );
}

type QrToggleButtonProps = {
  onToggle: () => void;
  isShowing: boolean;
};

export function QrToggleButton({ onToggle, isShowing }: QrToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[var(--app-text-muted)] transition hover:bg-indigo-100 hover:text-indigo-700"
      title={isShowing ? "إخفاء الرمز" : "عرض رمز QR"}
    >
      <QrCode size={12} />
      {isShowing ? "إخفاء" : "QR"}
    </button>
  );
}

type GenerateBadgeButtonProps = {
  fullName: string;
  studentCode: string;
};

export function GenerateBadgeButton({
  fullName,
  studentCode,
}: GenerateBadgeButtonProps) {
  const href = `/student-badge.html?name=${encodeURIComponent(fullName)}&code=${encodeURIComponent(studentCode)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[var(--app-text-muted)] transition hover:bg-indigo-100 hover:text-indigo-700"
      title="توليد الباج"
    >
      <IdCard size={12} />
      توليد الباج
    </a>
  );
}
