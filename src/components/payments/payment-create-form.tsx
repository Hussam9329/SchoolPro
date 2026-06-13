"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Search, Shirt, WalletCards } from "lucide-react";
import type { StudentFeePlan } from "@/services/class-fee-service";
import { PAYMENT_METHODS, formatMoney, getCurrentAcademicYear } from "@/types/payment";
import { getStudentClassDisplay } from "@/types/student";

type PaymentCreateFormProps = {
  students: StudentFeePlan[];
  action: (formData: FormData) => void;
};

export function PaymentCreateForm({ students, action }: PaymentCreateFormProps) {
  const academicYear = getCurrentAcademicYear();
  const [query, setQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [feeType, setFeeType] = useState<"tuition" | "uniform">("tuition");
  const [paymentMode, setPaymentMode] = useState<"full" | "installment">("full");
  const [installmentAmount, setInstallmentAmount] = useState("");

  const selectedStudent = useMemo(
    () => students.find((student) => student.studentId === studentId) ?? null,
    [studentId, students],
  );

  const filteredStudents = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return students.slice(0, 8);
    return students
      .filter((student) => student.studentName.toLowerCase().includes(value))
      .slice(0, 10);
  }, [query, students]);

  const targetAmount = selectedStudent
    ? feeType === "uniform"
      ? selectedStudent.uniformAmount
      : selectedStudent.tuitionRemaining || selectedStudent.tuitionAmount
    : 0;

  const paidAmount = feeType === "uniform"
    ? targetAmount
    : paymentMode === "full"
      ? targetAmount
      : Number(installmentAmount || 0);

  const status = feeType === "uniform" || paymentMode === "full" || paidAmount >= targetAmount
    ? "paid"
    : "partial";

  const feeTitle = selectedStudent
    ? feeType === "uniform"
      ? `زي مدرسي - ${selectedStudent.studentName}`
      : `رسوم دراسية - ${selectedStudent.studentName}`
    : "";

  function pickStudent(student: StudentFeePlan) {
    setStudentId(student.studentId);
    setQuery(student.studentName);
  }

  function handleFeeTypeChange(value: "tuition" | "uniform") {
    setFeeType(value);
    if (value === "uniform") {
      setPaymentMode("full");
      setInstallmentAmount("");
    }
  }

  return (
    <form id="payment-form" action={action} className="app-card overflow-hidden">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="feeTitle" value={feeTitle} />
      <input type="hidden" name="originalAmount" value={targetAmount} />
      <input type="hidden" name="paidAmount" value={paidAmount} />
      <input type="hidden" name="discountAmount" value="0" />
      <input type="hidden" name="discountPercent" value="0" />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="paymentMode" value={paymentMode} />

      <div className="border-b border-[var(--app-border-soft)] bg-gradient-to-l to-indigo-50/40 to-amber-50/20 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700">
            <CreditCard size={24} />
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-[var(--app-text)]">تسجيل قسط أو زي</h3>
            <p className="mt-1 text-sm leading-7 text-[var(--app-text-muted)]">
              ابحث باسم الطالب فقط، ثم اختر نوع الرسوم وسيتم جلب المبلغ حسب صفه تلقائيًا.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6">
        <div className="relative">
          <label htmlFor="studentSearch" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">
            البحث باسم الطالب <span className="text-red-600">*</span>
          </label>
          <Search size={18} className="pointer-events-none absolute right-4 top-[46px] text-[var(--app-text-soft)]" />
          <input
            id="studentSearch"
            name="studentSearch"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setStudentId("");
            }}
            placeholder="اكتب اسم الطالب..."
            className="input pr-11"
            autoComplete="off"
            required={!studentId}
          />

          {query && !studentId && filteredStudents.length > 0 && (
            <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-[var(--app-border-soft)] bg-white p-2 shadow-xl">
              {filteredStudents.map((student) => (
                <button
                  key={student.studentId}
                  type="button"
                  onClick={() => pickStudent(student)}
                  className="block w-full rounded-xl px-4 py-3 text-right text-sm font-extrabold text-[var(--app-text)] transition hover:bg-indigo-50"
                >
                  {student.studentName}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedStudent && (
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5 text-sm leading-8 text-emerald-900">
            <p>
              الطالب <span className="font-extrabold">{selectedStudent.studentName}</span> في الصف <span className="font-extrabold">{getStudentClassDisplay({ className: selectedStudent.className, classLevel: selectedStudent.classLevel, sectionName: selectedStudent.sectionName })}</span>.
            </p>
            <p>
              الرسوم الدراسية الكاملة: <span className="font-extrabold">{formatMoney(selectedStudent.tuitionAmount)}</span> — المدفوع: <span className="font-extrabold">{formatMoney(selectedStudent.tuitionPaid)}</span> — المتبقي: <span className="font-extrabold">{formatMoney(selectedStudent.tuitionRemaining)}</span>.
            </p>
            <p>
              الزي المدرسي: <span className="font-extrabold">{formatMoney(selectedStudent.uniformAmount)}</span> — الحالة: <span className="font-extrabold">{selectedStudent.uniformPaid ? "مدفوع" : "غير مدفوع"}</span>.
            </p>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="feeType" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">نوع الرسوم</label>
            <select id="feeType" name="feeType" value={feeType} onChange={(event) => handleFeeTypeChange(event.target.value as "tuition" | "uniform")} className="input">
              <option value="tuition">رسوم دراسية</option>
              <option value="uniform">زي مدرسي</option>
            </select>
          </div>

          <div>
            <label htmlFor="method" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">طريقة الدفع</label>
            <select id="method" name="method" className="input" defaultValue="cash">
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>
        </div>

        {feeType === "tuition" && (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="paymentMode" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">آلية دفع الرسوم الدراسية</label>
              <select id="paymentMode" name="paymentMode" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as "full" | "installment")} className="input">
                <option value="full">دفع كامل</option>
                <option value="installment">دفعات</option>
              </select>
            </div>

            {paymentMode === "installment" && (
              <div>
                <label htmlFor="installmentAmount" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">مبلغ الدفعة</label>
                <input id="installmentAmount" name="installmentAmount" value={installmentAmount} onChange={(event) => setInstallmentAmount(event.target.value)} type="number" min={1} max={targetAmount || undefined} className="input" placeholder="مثال: 250000" required />
                <p className="mt-1.5 text-xs leading-5 text-[var(--app-text-muted)]">
                  إذا كان مبلغ الدفعة مساويًا للمتبقي فسيتم تسجيلها كرسوم كاملة تلقائيًا.
                </p>
              </div>
            )}
          </div>
        )}

        {feeType === "uniform" && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-7 text-amber-900">
            <div className="flex items-start gap-2">
              <Shirt size={18} className="mt-1 shrink-0" />
              <p>سيتم تسجيل مبلغ الزي المحدد للصف مباشرة وربطه بالطالب في سجل الدفعات.</p>
            </div>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label htmlFor="academicYear" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">السنة الدراسية</label>
            <input id="academicYear" name="academicYear" maxLength={20} className="input" defaultValue={academicYear} />
          </div>

          <div>
            <label htmlFor="dueDate" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">تاريخ الاستحقاق</label>
            <input id="dueDate" name="dueDate" type="date" className="input" />
          </div>

          <div>
            <label htmlFor="paidAt" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">تاريخ الدفع</label>
            <input id="paidAt" name="paidAt" type="date" className="input" />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="mb-2 block text-sm font-extrabold text-[var(--app-text)]">ملاحظات</label>
          <textarea id="notes" name="notes" rows={3} maxLength={500} placeholder="أي ملاحظات إضافية حول الدفعة..." className="input min-h-[95px] resize-y leading-7" />
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-[var(--app-text-muted)]">
          <WalletCards size={18} className="ml-2 inline" />
          المبلغ الذي سيتم تسجيله الآن: <span className="text-[var(--app-text)]">{formatMoney(Number.isFinite(paidAmount) ? paidAmount : 0)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--app-border-soft)] bg-gradient-to-l to-indigo-50/30 to-amber-50/20 p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-[var(--app-text-muted)]">لا تُعرض رموز الطلاب أو التفاصيل الزائدة في قائمة الاختيار؛ التفاصيل تظهر بعد اختيار الطالب فقط.</p>
        <button type="submit" className="btn btn-primary" disabled={!selectedStudent || targetAmount <= 0 || (feeType === "tuition" && paymentMode === "installment" && Number(installmentAmount || 0) <= 0)}>
          <CheckCircle2 size={18} />
          حفظ الدفعة
        </button>
      </div>
    </form>
  );
}
