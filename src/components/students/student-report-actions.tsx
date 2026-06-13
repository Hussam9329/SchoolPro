"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckSquare, MessageCircle, Printer, Square } from "lucide-react";

const REPORT_SECTIONS = [
  { key: "summary", label: "الملخص العام" },
  { key: "basic", label: "البيانات الأساسية" },
  { key: "academic", label: "الدرجات" },
  { key: "attendance", label: "الحضور" },
  { key: "financial", label: "التقرير المالي" },
  { key: "notes", label: "الملاحظات والتوصيات" },
] as const;

type ReportSectionKey = (typeof REPORT_SECTIONS)[number]["key"];

function getWhatsappUrl(phone?: string | null, message?: string) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("964")
    ? digits
    : digits.startsWith("0")
      ? `964${digits.slice(1)}`
      : digits;
  return `https://wa.me/${normalized}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

type StudentReportActionsProps = {
  studentName: string;
  guardianPhone?: string | null;
  classDisplay: string;
  averageLabel: string;
  attendanceSummary: string;
  financialSummary: string;
};

export function StudentReportActions({
  studentName,
  guardianPhone,
  classDisplay,
  averageLabel,
  attendanceSummary,
  financialSummary,
}: StudentReportActionsProps) {
  const [selectedSections, setSelectedSections] = useState<ReportSectionKey[]>(
    REPORT_SECTIONS.map((section) => section.key),
  );

  useEffect(() => {
    for (const section of REPORT_SECTIONS) {
      document.documentElement.dataset[`print${section.key}`] = selectedSections.includes(section.key) ? "1" : "0";
    }
  }, [selectedSections]);

  const whatsappMessage = useMemo(() => {
    return [
      `تقرير الطالب: ${studentName}`,
      `الصف: ${classDisplay}`,
      `المعدل: ${averageLabel}`,
      `الحضور: ${attendanceSummary}`,
      `الجانب المالي: ${financialSummary}`,
      "يمكن حفظ التقرير PDF من زر طباعة / حفظ PDF داخل ملف الطالب في النظام.",
    ].join("\n");
  }, [attendanceSummary, averageLabel, classDisplay, financialSummary, studentName]);

  const whatsappUrl = getWhatsappUrl(guardianPhone, whatsappMessage);

  function toggleSection(section: ReportSectionKey) {
    setSelectedSections((current) => {
      if (current.includes(section)) {
        return current.filter((item) => item !== section);
      }
      return [...current, section];
    });
  }

  function selectAll() {
    setSelectedSections(REPORT_SECTIONS.map((section) => section.key));
  }

  function printReport() {
    window.print();
  }

  return (
    <section className="app-card p-5 print:hidden">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-[var(--app-text)]">خيارات التقرير والطباعة</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--app-text-muted)]">
            اختر الأجزاء التي تريد ظهورها عند الطباعة أو الحفظ PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={selectAll} className="btn btn-secondary">
            <CheckSquare size={18} />
            تحديد الكل
          </button>
          <button type="button" onClick={printReport} className="btn btn-primary">
            <Printer size={18} />
            طباعة / حفظ PDF
          </button>
          <a
            href={whatsappUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            className={["btn btn-secondary", !whatsappUrl ? "pointer-events-none opacity-60" : ""].join(" ")}
            title={!whatsappUrl ? "لا يوجد رقم ولي أمر صالح" : undefined}
          >
            <MessageCircle size={18} />
            إرسال ملخص لولي الأمر عبر واتساب
          </a>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_SECTIONS.map((section) => {
          const checked = selectedSections.includes(section.key);
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => toggleSection(section.key)}
              className="flex items-center justify-between rounded-2xl border border-[var(--app-border-soft)] bg-white px-4 py-3 text-sm font-extrabold text-[var(--app-text)] transition hover:border-[var(--app-primary)] hover:bg-indigo-50"
            >
              <span>{section.label}</span>
              {checked ? <CheckSquare size={18} className="text-[var(--app-primary)]" /> : <Square size={18} className="text-[var(--app-text-muted)]" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
