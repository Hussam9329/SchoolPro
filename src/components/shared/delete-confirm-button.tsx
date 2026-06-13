"use client";

import { useState, useTransition, useCallback } from "react";
import { Trash2, AlertTriangle, XCircle, ShieldAlert } from "lucide-react";
import type { DeleteAssociation } from "@/types/student";

type DeleteResult = {
  ok: boolean;
  message?: string;
};

type DeleteConfirmButtonProps = {
  /** The server action to call on confirm. Can return a result object or void. */
  action?: (formData: FormData) => Promise<DeleteResult | void>;
  /** Alternative: async callback that returns a result. Used when not using server actions. */
  onConfirm?: () => Promise<DeleteResult | void>;
  /** The ID of the item to delete (used with action prop) */
  itemId?: string;
  /** Confirmation dialog title */
  confirmTitle?: string;
  /** Confirmation dialog description */
  confirmDescription?: string;
  /** Entity name for display (e.g. "الطالب", "المدرس", "المادة") */
  entityName?: string;
  /** List of associations that will be cascade-deleted */
  associations?: DeleteAssociation[];
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Button label (default: "حذف") */
  buttonLabel?: string;
  /** Additional CSS class for the trigger button */
  className?: string;
  /** Whether the trigger button is disabled */
  disabled?: boolean;
};

export function DeleteConfirmButton({
  action,
  onConfirm,
  itemId,
  confirmTitle,
  confirmDescription,
  entityName = "هذا العنصر",
  associations = [],
  confirmLabel = "نعم، احذف",
  cancelLabel = "تراجع",
  buttonLabel = "حذف",
  className,
  disabled = false,
}: DeleteConfirmButtonProps) {
  const hasAssociations = associations.length > 0;
  const totalAssociated = associations.reduce((sum, a) => sum + a.count, 0);

  // If no associations, single-step dialog. If associations, 2-step dialog.
  const [showDialog, setShowDialog] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typedConfirm, setTypedConfirm] = useState("");

  const CONFIRM_WORD = "حذف";

  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorMessage(null);
    setTypedConfirm("");
    setStep(1);
    setShowDialog(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (isPending) return;
    setShowDialog(false);
    setErrorMessage(null);
    setTypedConfirm("");
    setStep(1);
  }, [isPending]);

  const handleNextStep = useCallback(() => {
    setErrorMessage(null);
    setStep(2);
    setTypedConfirm("");
  }, []);

  const handleConfirm = useCallback(() => {
    // If there are associations, require typing the confirm word
    if (hasAssociations && typedConfirm !== CONFIRM_WORD) return;
    setErrorMessage(null);

    startTransition(async () => {
      try {
        let result: DeleteResult | void;

        if (onConfirm) {
          result = await onConfirm();
        } else if (action && itemId) {
          const formData = new FormData();
          formData.set("id", itemId);
          result = await action(formData);
        } else {
          setErrorMessage("لم يتم تحديد إجراء الحذف.");
          return;
        }

        if (result && typeof result === "object" && "ok" in result) {
          if (!result.ok) {
            setErrorMessage(result.message || "حدث خطأ أثناء الحذف.");
            return;
          }
        }

        setShowDialog(false);
        setStep(1);
        setTypedConfirm("");
      } catch (error: unknown) {
        if (error && typeof error === "object" && "digest" in error && typeof (error as { digest: unknown }).digest === "string" && (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")) {
          setShowDialog(false);
          return;
        }

        setErrorMessage("حدث خطأ غير متوقع أثناء الحذف. حاول مرة أخرى.");
      }
    });
  }, [action, onConfirm, itemId, typedConfirm, hasAssociations]);

  // Build dynamic description
  const dynamicDescription = confirmDescription ?? (
    hasAssociations
      ? `${entityName} مرتبط ببيانات أخرى سيتم حذفها جميعًا معه. هذا الإجراء لا يمكن التراجع عنه.`
      : `سيتم حذف ${entityName} نهائيًا. هذا الإجراء لا يمكن التراجع عنه.`
  );

  const dynamicTitle = confirmTitle ?? (
    hasAssociations
      ? `هل تريد حذف ${entityName} وجميع البيانات المرتبطة؟`
      : `هل أنت متأكد من حذف ${entityName}؟`
  );

  return (
    <>
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || isPending}
        className={
          className ??
          "btn w-full border-red-100 bg-gradient-to-r from-red-50 to-indigo-50 text-red-700 hover:from-red-100 hover:to-indigo-100"
        }
      >
        <Trash2 size={17} />
        {isPending ? "جارٍ الحذف..." : buttonLabel}
      </button>

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={isPending ? undefined : handleCancel}
        >
          <div
            className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Step indicator (only when associations exist) */}
            {hasAssociations && (
              <div className="mb-4 flex items-center gap-2">
                <div
                  className={[
                    "h-2 flex-1 rounded-full transition",
                    step >= 1 ? "bg-red-500" : "bg-gray-200",
                  ].join(" ")}
                />
                <div
                  className={[
                    "h-2 flex-1 rounded-full transition",
                    step >= 2 ? "bg-red-500" : "bg-gray-200",
                  ].join(" ")}
                />
              </div>
            )}

            {/* Step 1: Initial warning with associations list */}
            {step === 1 && (
              <>
                <div className="flex items-start gap-4">
                  <div className={[
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                    hasAssociations
                      ? "bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600"
                      : "bg-gradient-to-br from-red-100 to-orange-100 text-red-600",
                  ].join(" ")}>
                    <AlertTriangle size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-red-900">
                      {dynamicTitle}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {dynamicDescription}
                    </p>
                  </div>
                </div>

                {/* Associations list */}
                {hasAssociations && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="mb-3 text-sm font-bold text-amber-800">
                      البيانات التي سيتم حذفها نهائيًا:
                    </p>
                    <ul className="space-y-2">
                      {associations.map((assoc) => (
                        <li key={assoc.label} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                          <span className="text-gray-700">{assoc.label}</span>
                          <span className="font-extrabold text-red-700">{assoc.count}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm border border-red-200">
                      <span className="font-bold text-red-800">إجمالي البيانات المرتبطة</span>
                      <span className="font-extrabold text-red-700">{totalAssociated}</span>
                    </div>
                  </div>
                )}

                {hasAssociations && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-sm leading-6 text-red-800">
                      <strong>تحذير:</strong> حذف {entityName} سيؤدي إلى حذف جميع البيانات المذكورة أعلاه نهائيًا. لا يمكن التراجع عن هذا الإجراء.
                    </p>
                  </div>
                )}

                {/* Error message */}
                {errorMessage && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <XCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
                    <div>
                      <p className="text-sm font-bold text-red-800">لا يمكن الحذف</p>
                      <p className="mt-1 text-sm leading-6 text-red-700">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    {cancelLabel}
                  </button>
                  {hasAssociations ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={isPending}
                      className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-amber-700 hover:to-orange-700 disabled:opacity-50"
                    >
                      نعم، أريد الحذف
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={isPending}
                      className="rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-red-700 hover:to-red-800 disabled:opacity-50"
                    >
                      {isPending ? "جارٍ الحذف..." : confirmLabel}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Step 2: Final confirmation - type to confirm (only when associations exist) */}
            {step === 2 && hasAssociations && (
              <>
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-200 to-red-100 text-red-700">
                    <ShieldAlert size={28} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-red-900">
                      تأكيد نهائي: اكتب كلمة التأكيد
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-gray-600">
                      أنت على وشك حذف {entityName} و<span className="font-extrabold text-red-700">{totalAssociated}</span> بيانات مرتبطة نهائيًا.
                      اكتب <span className="rounded bg-red-100 px-2 py-0.5 font-extrabold text-red-700">{CONFIRM_WORD}</span> لتأكيد الحذف.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <input
                    id="delete-confirm-input"
                    name="deleteConfirmInput"
                    type="text"
                    value={typedConfirm}
                    onChange={(e) => setTypedConfirm(e.target.value)}
                    placeholder={`اكتب "${CONFIRM_WORD}" هنا`}
                    className="input border-red-200 text-center text-lg font-bold focus:border-red-500 focus:ring-red-500"
                    dir="rtl"
                    autoComplete="off"
                    disabled={isPending}
                  />
                </div>

                {/* Error message */}
                {errorMessage && (
                  <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                    <XCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
                    <div>
                      <p className="text-sm font-bold text-red-800">لا يمكن الحذف</p>
                      <p className="mt-1 text-sm leading-6 text-red-700">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    تراجع
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={typedConfirm !== CONFIRM_WORD || isPending}
                    className="rounded-xl bg-gradient-to-r from-red-700 to-red-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-red-800 hover:to-red-900 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isPending ? "جارٍ الحذف..." : "حذف نهائي"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
