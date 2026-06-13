import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";
import { buildErrorRedirect } from "@/lib/redirect-message";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  Receipt,
  RefreshCcw,
  Search,
  Tag,
  Wallet,
} from "lucide-react";
import { safeQuery } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SmartAlert } from "@/components/shared/smart-alert";
import {
  createPayment,
  deletePayment,
  getPayments,
  getPaymentsCount,
} from "@/services/payment-service";
import {
  FEE_TYPES,
  PAYMENT_STATUSES,
  resolvePaymentAmounts,
  formatMoney,
  getFeeTypeLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getPaymentStatusBadgeClass,
  isPaymentOverdue,
  getCurrentAcademicYear,
  type PaymentFormInput,
  type PaymentListItem,
} from "@/types/payment";
import { getStudentClassDisplay } from "@/types/student";
import { DeleteConfirmButton } from "@/components/shared/delete-confirm-button";
import { PaymentCreateForm } from "@/components/payments/payment-create-form";
import { getStudentFeePlans } from "@/services/class-fee-service";

export const dynamic = "force-dynamic";



type PaymentsPageProps = {
  searchParams?: Promise<{
    q?: string;
    feeType?: string;
    status?: string;
    overdueOnly?: string;
    saved?: string;
    deleted?: string;
    error?: string;
    reason?: string;
  }>;
};

export default async function PaymentsPage({
  searchParams,
}: PaymentsPageProps) {
  await requireAdmin();
  const resolvedSearchParams = await searchParams;

  const query = resolvedSearchParams?.q?.trim() ?? "";
  const feeType = resolvedSearchParams?.feeType?.trim() ?? "";
  const status = resolvedSearchParams?.status?.trim() ?? "";
  const overdueOnly = resolvedSearchParams?.overdueOnly === "1";

  const [payments, studentFeePlans, counts] = await Promise.all([
    safeQuery(() => getPayments({
      query,
      feeType,
      status,
      overdueOnly,
    }), []),
    safeQuery(() => getStudentFeePlans(getCurrentAcademicYear()), []),
    safeQuery(() => getPaymentsCount(), { total: 0, paid: 0, partial: 0, pending: 0, refunded: 0, overdue: 0, totalPaid: 0, totalPending: 0, totalRefunded: 0 }),
  ]);

  const hasPayments = counts.total > 0;

  return (
    <div className="mx-auto flex w-full max-w-[1350px] flex-col gap-6">
        <PageHeader
          title="المدفوعات"
          description="سجّل المدفوعات والأقساط لكل طالب، وتابع حالة الدفع والمبالغ المعلّقة والمستحقة."
          icon="fees"
          badge="الخطوة الأخيرة"
        />

        <PaymentsFeedback
          saved={resolvedSearchParams?.saved}
          deleted={resolvedSearchParams?.deleted}
          error={resolvedSearchParams?.error}
          reason={resolvedSearchParams?.reason}
        />

        <SmartAlert
          tone="info"
          title="المدفوعات تعتمد على الطلاب"
          description="يجب إضافة الطلاب أولًا حتى تتمكن من تسجيل المدفوعات والأقساط المرتبطة بهم."
          actionLabel="إدارة الطلاب"
          actionHref="/students"
        />

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <PaymentCreateForm students={studentFeePlans} action={createPaymentAction} />

          <div className="flex flex-col gap-6">
            <PaymentsStats
              totalPaid={counts.totalPaid}
              totalPending={counts.totalPending}
              totalRefunded={counts.totalRefunded}
              total={counts.total}
              paid={counts.paid}
              pending={counts.pending}
              overdue={counts.overdue}
            />

            <PaymentSearchForm
              query={query}
              feeType={feeType}
              status={status}
              overdueOnly={overdueOnly}
            />
          </div>
        </section>

        {!hasPayments ? (
          <EmptyState
            icon="fees"
            title="لا توجد مدفوعات بعد"
            description="ابدأ بتسجيل أول دفعة بعد إضافة الطلاب. يمكنك متابعة المدفوعات والمتبقي لكل طالب."
            actionLabel="تسجيل أول دفعة"
            actionHref="#payment-form"
            secondaryLabel="إدارة الطلاب"
            secondaryHref="/students"
          />
        ) : payments.length === 0 ? (
          <EmptyState
            icon="search"
            title="لا توجد نتائج مطابقة"
            description="جرّب البحث بعنوان الرسم أو اسم الطالب، أو غيّر فلتر النوع أو الحالة."
            actionLabel="عرض كل المدفوعات"
            actionHref="/payments"
          />
        ) : (
          <PaymentsList payments={payments} />
        )}
      </div>
  );
}

async function createPaymentAction(formData: FormData) {
  "use server";

  const rawInput: PaymentFormInput = {
    feeTitle: String(formData.get("feeTitle") ?? ""),
    feeType: String(formData.get("feeType") ?? "tuition"),
    amount: String(formData.get("paidAmount") ?? "") || String(formData.get("originalAmount") ?? "0"),
    originalAmount: String(formData.get("originalAmount") ?? ""),
    discountAmount: String(formData.get("discountAmount") ?? "0"),
    discountPercent: String(formData.get("discountPercent") ?? "0"),
    discountReason: String(formData.get("discountReason") ?? "").trim() || undefined,
    finalAmount: "",
    status: String(formData.get("status") ?? "paid"),
    method: String(formData.get("method") ?? "cash"),
    academicYear: String(formData.get("academicYear") ?? ""),
    dueDate: String(formData.get("dueDate") ?? ""),
    paidAt: String(formData.get("paidAt") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    studentId: String(formData.get("studentId") ?? ""),
  };

  const paymentMode = String(formData.get("paymentMode") ?? "full");
  const resolved = resolvePaymentAmounts(rawInput);
  const feeType = rawInput.feeType ?? "tuition";
  const isUniform = feeType === "uniform";
  const isFullTuition = paymentMode === "full" || resolved.paidAmount >= resolved.finalAmount;
  let status = rawInput.status ?? "paid";
  let paidAmount = resolved.paidAmount;

  if (isUniform || isFullTuition) {
    status = "paid";
    paidAmount = resolved.finalAmount;
  } else {
    status = "partial";
    paidAmount = Math.max(0, Math.min(resolved.paidAmount, Math.max(0, resolved.finalAmount - 1)));
  }

  const input: PaymentFormInput = {
    ...rawInput,
    feeTitle: rawInput.feeTitle || (isUniform ? "زي مدرسي" : "رسوم دراسية"),
    feeType,
    amount: String(paidAmount),
    originalAmount: String(resolved.originalAmount),
    discountAmount: String(resolved.discountAmount),
    discountPercent: String(resolved.discountPercent),
    finalAmount: String(resolved.finalAmount),
    status,
  };

  const result = await createPayment(input);

  if (!result.ok) {
    redirect(buildErrorRedirect("/payments", "create", result.message));
  }

  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath("/fees");
  revalidatePath("/reports");
  redirect("/payments?saved=1");
}

async function deletePaymentAction(formData: FormData): Promise<{ ok: boolean; message?: string }> {
  "use server";

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { ok: false, message: "معرّف الدفعة مفقود." };
  }

  let result;
  try {
    result = await deletePayment(id);
  } catch (error) {
    console.error("[deletePaymentAction] Error:", error);
    return { ok: false, message: "حدث خطأ أثناء الحذف. تأكد من عدم وجود بيانات مرتبطة." };
  }

  if (!result.ok) {
    return { ok: false, message: result.message || "حدث خطأ أثناء الحذف." };
  }

  revalidatePath("/");
  revalidatePath("/payments");
  revalidatePath("/fees");
  revalidatePath("/reports");
  redirect("/payments?deleted=1");
}

type PaymentsFeedbackProps = {
  saved?: string;
  deleted?: string;
  error?: string;
  reason?: string;
};

function PaymentsFeedback({ saved, deleted, error, reason }: PaymentsFeedbackProps) {
  if (saved === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تمت إضافة الدفعة بنجاح"
        description="تم حفظ بيانات الدفعة وربطها بالطالب المحدد."
      />
    );
  }

  if (deleted === "1") {
    return (
      <SmartAlert
        tone="success"
        title="تم حذف الدفعة"
        description="تم حذف الدفعة من السجلات بنجاح."
      />
    );
  }

  if (error) {
    let description: string;
    if (reason) {
      description = reason;
    } else if (error === "delete") {
      description = "لا يمكن حذف الدفعة حاليًا. تحقق من البيانات وحاول مرة أخرى.";
    } else if (error === "missing-id") {
      description = "لم يتم تحديد الدفعة المراد حذفها.";
    } else {
      description = "تأكد من إدخال بيانات الدفعة بشكل صحيح، وأن الطالب المحدد موجود.";
    }

    return (
      <SmartAlert
        tone="warning"
        title="لم تكتمل العملية"
        description={description}
      />
    );
  }

  return null;
}

type MoneyCardProps = {
  label: string;
  amount: number;
  icon: React.ElementType;
  iconClass: string;
};

function MoneyCard({ label, amount, icon: Icon, iconClass }: MoneyCardProps) {
  return (
    <div className="app-card app-card-hover p-5">
      <div className="flex items-center gap-4">
        <div
          className={[
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            iconClass,
          ].join(" ")}
        >
          <Icon size={22} />
        </div>

        <div>
          <p className="text-sm font-bold text-[var(--app-text-muted)]">
            {label}
          </p>

          <p className="mt-1 text-2xl font-extrabold text-[var(--app-text)]">
            {formatMoney(amount)}
          </p>
        </div>
      </div>
    </div>
  );
}

type PaymentsStatsProps = {
  totalPaid: number;
  totalPending: number;
  totalRefunded: number;
  total: number;
  paid: number;
  pending: number;
  overdue: number;
};

function PaymentsStats({
  totalPaid,
  totalPending,
  totalRefunded,
  total,
  paid,
  overdue,
}: PaymentsStatsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <MoneyCard
          label="المدفوع"
          amount={totalPaid}
          icon={Banknote}
          iconClass="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700"
        />

        <MoneyCard
          label="المعلّق"
          amount={totalPending}
          icon={Clock}
          iconClass="bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700"
        />

        <MoneyCard
          label="المسترجع"
          amount={totalRefunded}
          icon={RefreshCcw}
          iconClass="bg-sky-100 text-sky-700"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="app-card app-card-hover p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700">
              <Receipt size={22} />
            </div>

            <div>
              <p className="text-sm font-bold text-[var(--app-text-muted)]">
                إجمالي المدفوعات
              </p>

              <p className="mt-1 text-3xl font-extrabold text-[var(--app-text)]">
                {total}
              </p>
            </div>
          </div>
        </div>

        <div className="app-card app-card-hover p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700">
              <CheckCircle2 size={22} />
            </div>

            <div>
              <p className="text-sm font-bold text-[var(--app-text-muted)]">
                مدفوعة
              </p>

              <p className="mt-1 text-3xl font-extrabold text-[var(--app-text)]">
                {paid}
              </p>
            </div>
          </div>
        </div>

        <div className="app-card app-card-hover p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
              <AlertTriangle size={22} />
            </div>

            <div>
              <p className="text-sm font-bold text-[var(--app-text-muted)]">
                متأخرة
              </p>

              <p className="mt-1 text-3xl font-extrabold text-[var(--app-text)]">
                {overdue}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type PaymentSearchFormProps = {
  query: string;
  feeType: string;
  status: string;
  overdueOnly: boolean;
};

function PaymentSearchForm({
  query,
  feeType,
  status,
  overdueOnly,
}: PaymentSearchFormProps) {
  return (
    <form action="/payments" className="app-card p-5">
      <label
        htmlFor="q"
        className="mb-2 block text-sm font-extrabold text-[var(--app-text)]"
      >
        البحث والتصفية
      </label>

      <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_auto]">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--app-text-soft)]"
          />

          <input
            id="q"
            name="q"
            defaultValue={query}
            placeholder="عنوان الرسم، اسم الطالب..."
            className="input pr-11"
          />
        </div>

        <select id="payment-fee-type-filter" name="feeType" defaultValue={feeType} className="input">
          <option value="">كل الأنواع</option>

          {FEE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select id="payment-status-filter" name="status" defaultValue={status} className="input">
          <option value="">كل الحالات</option>

          {PAYMENT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <button type="submit" className="btn btn-secondary">
          بحث
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="checkbox"
          id="overdueOnly"
          name="overdueOnly"
          value="1"
          defaultChecked={overdueOnly}
          className="h-4 w-4 rounded border-[var(--app-border)] text-blue-600 focus:ring-blue-500"
        />

        <label
          htmlFor="overdueOnly"
          className="text-sm font-bold text-[var(--app-text-muted)]"
        >
          عرض المتأخرة فقط
        </label>
      </div>
    </form>
  );
}

type PaymentsListProps = {
  payments: PaymentListItem[];
};

function PaymentsList({ payments }: PaymentsListProps) {
  return (
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-[var(--app-border-soft)] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-[var(--app-text)]">
            قائمة المدفوعات
          </h3>

          <p className="mt-1 text-sm leading-6 text-[var(--app-text-muted)]">
            تابع المدفوعات وحالاتها والمبالغ المرتبطة بكل طالب.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="badge badge-info">
            {payments.length} دفعة
          </span>
        </div>
      </div>

      <div className="divide-y divide-[var(--app-border-soft)]">
        {payments.map((payment) => (
          <PaymentRow key={payment.id} payment={payment} />
        ))}
      </div>
    </section>
  );
}

type PaymentRowProps = {
  payment: PaymentListItem;
};

function PaymentRow({ payment }: PaymentRowProps) {
  const statusClass = getPaymentStatusBadgeClass(payment.status);

  const overdue = isPaymentOverdue({
    status: payment.status,
    dueDate: payment.dueDate,
  });

  return (
    <article className="grid gap-4 p-5 transition hover:bg-indigo-50/40 xl:grid-cols-[1fr_auto] xl:items-center">
      <div className="flex min-w-0 gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700">
          <Wallet size={25} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-extrabold text-[var(--app-text)]">
              {payment.feeTitle}
            </h4>

            <span className={["badge", statusClass].join(" ")}>
              {getPaymentStatusLabel(payment.status)}
            </span>

            {overdue && (
              <span className="badge bg-red-100 text-red-700">
                متأخرة
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-sm text-[var(--app-text-muted)]">
            {payment.originalAmount != null && payment.originalAmount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 font-bold text-blue-800">
                <Banknote size={14} />
                أصل المبلغ: {payment.formattedOriginalAmount}
              </span>
            )}

            {payment.discountAmount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-800">
                <Tag size={14} />
                خصم: {payment.formattedDiscountAmount}
                {payment.discountPercent != null && payment.discountPercent > 0 && (
                  <> ({payment.discountPercent}٪)</>
                )}
              </span>
            )}

            {payment.finalAmount != null && payment.finalAmount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800">
                <Banknote size={14} />
                المبلغ النهائي: {payment.formattedFinalAmount}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800">
                <Banknote size={14} />
                {payment.formattedAmount}
              </span>
            )}

            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              {getFeeTypeLabel(payment.feeType)}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold">
              {getPaymentMethodLabel(payment.method)}
            </span>

            <span className={payment.isUniformPaid ? "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-800" : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-bold text-slate-700"}>
              الزي المدرسي: {payment.isUniformPaid ? "صح" : "غلط"}
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 font-bold text-purple-800">
              المتبقي: {payment.formattedRemainingAmount}
            </span>
          </div>

          <div className="mt-3 grid gap-2 text-sm leading-6 text-[var(--app-text-muted)] md:grid-cols-2">
            <p>
              الطالب:{" "}
              <span className="font-bold text-[var(--app-text)]">
                {payment.studentName}
              </span>
            </p>

            <p>
              الصف:{" "}
              <span className="font-bold text-[var(--app-text)]">
                {getStudentClassDisplay({
                  className: payment.className,
                  classLevel: payment.classLevel,
                  sectionName: payment.sectionName,
                }) || "غير محدد"}
              </span>
            </p>

            <p>
              طريقة الدفع:{" "}
              <span className="font-bold text-[var(--app-text)]">
                {getPaymentMethodLabel(payment.method)}
              </span>
            </p>

            {payment.discountReason && (
              <p>
                سبب الخصم:{" "}
                <span className="font-bold text-amber-700">
                  {payment.discountReason}
                </span>
              </p>
            )}

            {payment.dueDate && (
              <p>
                الاستحقاق:{" "}
                <span className={overdue ? "font-bold text-red-600" : "font-bold text-[var(--app-text)]"}>
                  {new Date(payment.dueDate).toLocaleDateString("ar-IQ-u-nu-latn")}
                </span>
              </p>
            )}

            {payment.paidAt && (
              <p>
                تاريخ الدفع:{" "}
                <span className="font-bold text-[var(--app-text)]">
                  {new Date(payment.paidAt).toLocaleDateString("ar-IQ-u-nu-latn")}
                </span>
              </p>
            )}

            {payment.academicYear && (
              <p>
                السنة الدراسية:{" "}
                <span className="font-bold text-[var(--app-text)]">
                  {payment.academicYear}
                </span>
              </p>
            )}
          </div>

          {payment.notes && (
            <p className="mt-2 text-sm leading-6 text-[var(--app-text-muted)]">
              ملاحظات: {payment.notes}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-1 xl:w-[170px]">
        <a
          href={`/api/payments/${payment.id}/receipt`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary justify-center"
        >
          <Receipt size={16} />
          طباعة الوصل
        </a>

        <DeleteConfirmButton
          action={deletePaymentAction}
          itemId={payment.id}
          entityName="الدفعة"
          associations={[]}
        />
      </div>
    </article>
  );
}
