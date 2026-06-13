"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";

type StudentQrImageProps = {
  studentId: string;
  studentCode: string;
};

export function StudentQrImage({ studentId, studentCode }: StudentQrImageProps) {
  const [showQr, setShowQr] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShowQr(!showQr)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[var(--app-text-muted)] transition hover:bg-indigo-100 hover:text-indigo-700"
        title={showQr ? "إخفاء الرمز" : "عرض رمز QR"}
      >
        <QrCode size={12} />
        {showQr ? "إخفاء" : "QR"}
      </button>

      {showQr ? (
        <img
          src={`/api/students/${studentId}/qr`}
          alt={`رمز QR لـ ${studentCode}`}
          className="h-16 w-16 rounded-lg border border-[var(--app-border-soft)]"
        />
      ) : null}
    </div>
  );
}
