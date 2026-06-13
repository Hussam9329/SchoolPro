"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, UsersRound } from "lucide-react";

type AbsentStudent = {
  studentName: string;
  studentCode: string | null;
  className: string | null;
  sectionName: string | null;
  isComputedAbsence?: boolean;
};

type AbsentNamesToggleProps = {
  students: AbsentStudent[];
};

export function AbsentNamesToggle({ students }: AbsentNamesToggleProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (students.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-600 px-4 py-2 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-sm"
      >
        {isOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        {isOpen ? "إخفاء الأسماء" : "عرض أسماء الغائبين"}
        <UsersRound size={17} />
      </button>

      {isOpen && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student, index) => (
              <div
                key={`${student.studentName}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/50 px-3 py-2"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-extrabold text-red-700">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-red-800">
                    {student.studentName}
                  </p>
                  <p className="truncate text-xs text-red-500">
                    {student.className ?? "—"}
                    {student.sectionName ? ` / ${student.sectionName}` : ""}
                    {student.isComputedAbsence ? " • غياب محسوب" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
