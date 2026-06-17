export function generatePaymentReceiptHtml(
  payment: {
    receiptNumber?: string;
    feeTitle: string;
    amount: number;
    originalAmount?: number | null;
    discountAmount: number;
    discountPercent?: number | null;
    discountReason?: string | null;
    finalAmount?: number | null;
    method: string;
    paidAt?: Date | null;
    notes?: string | null;
    academicYear?: string | null;
    createdAt: Date;
  },
  student: {
    fullName: string;
    studentCode?: string | null;
    sectionName?: string | null;
    className?: string | null;
  },
  schoolInfo: { name: string; logo?: string },
) {
  const formatMoney = (n: number) =>
    new Intl.NumberFormat("ar-IQ-u-nu-latn").format(n);
  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(d));
  const remaining =
    (payment.originalAmount ?? payment.amount) -
    payment.discountAmount -
    payment.amount;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<title>فاتورة قسط</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Tajawal', sans-serif; background: #f5f8f7; padding: 20px; direction: rtl; }
  .receipt { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 24px; box-shadow: 0 18px 56px rgba(15,118,110,0.12); overflow: hidden; }
  .header { background: linear-gradient(135deg, #0f766e, #0284c7); color: #fff; padding: 24px 32px; display: flex; align-items: center; gap: 16px; }
  .header h1 { font-size: 22px; font-weight: 800; }
  .header p { font-size: 14px; opacity: 0.9; }
  .body { padding: 24px 32px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
  .row:last-child { border: none; }
  .label { color: #64748b; font-weight: 700; font-size: 14px; }
  .value { color: #0f172a; font-weight: 800; font-size: 14px; }
  .total-row { background: #ccfbf1; margin: 16px -32px; padding: 16px 32px; }
  .total-row .label, .total-row .value { font-size: 18px; color: #0f766e; }
  .signatures { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 24px; }
  .signature { border: 1px dashed #cbd5e1; border-radius: 16px; min-height: 92px; padding: 12px; color: #475569; font-weight: 800; font-size: 13px; display: flex; flex-direction: column; justify-content: space-between; }
  .signature-line { border-top: 1px solid #cbd5e1; padding-top: 8px; color: #94a3b8; font-size: 12px; }
  .footer { text-align: center; padding: 16px; color: #94a3b8; font-size: 12px; }
  .print-btn { display: block; margin: 20px auto; padding: 12px 32px; background: #0f766e; color: #fff; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Tajawal', sans-serif; }
  @media print { .print-btn { display: none; } body { background: #fff; padding: 0; } .receipt { box-shadow: none; } }
</style>
</head>
<body>
<div class="receipt">
  <div class="header">
    <div>
      <h1>${schoolInfo.name}</h1>
      <p>فاتورة قسط دراسي</p>
    </div>
  </div>
  <div class="body">
    ${payment.receiptNumber ? `<div class="row"><span class="label">رقم الفاتورة</span><span class="value">${payment.receiptNumber}</span></div>` : ""}
    <div class="row"><span class="label">اسم الطالب</span><span class="value">${student.fullName}</span></div>
    ${student.studentCode ? `<div class="row"><span class="label">الرقم التعريفي</span><span class="value">${student.studentCode}</span></div>` : ""}
    ${student.className ? `<div class="row"><span class="label">الصف</span><span class="value">${student.className}${student.sectionName ? " / " + student.sectionName : ""}</span></div>` : ""}
    ${payment.academicYear ? `<div class="row"><span class="label">السنة الدراسية</span><span class="value">${payment.academicYear}</span></div>` : ""}
    <div class="row"><span class="label">القسط</span><span class="value">${payment.feeTitle}</span></div>
    <div class="row"><span class="label">القسط الكامل</span><span class="value">${formatMoney(payment.originalAmount ?? payment.amount)} د.ع</span></div>
    ${payment.discountAmount > 0 ? `<div class="row"><span class="label">الخصم (${payment.discountPercent ? payment.discountPercent + "%" : ""})</span><span class="value">${formatMoney(payment.discountAmount)} د.ع</span></div>` : ""}
    ${payment.discountReason ? `<div class="row"><span class="label">سبب الخصم</span><span class="value">${payment.discountReason}</span></div>` : ""}
    <div class="total-row row"><span class="label">المبلغ المدفوع</span><span class="value">${formatMoney(payment.amount)} د.ع</span></div>
    <div class="row"><span class="label">المتبقي</span><span class="value">${formatMoney(Math.max(0, remaining))} د.ع</span></div>
    <div class="row"><span class="label">طريقة الدفع</span><span class="value">${payment.method === "cash" ? "نقدًا" : payment.method === "zain_cash" ? "زين كاش" : payment.method === "bank_transfer" ? "تحويل مصرفي" : payment.method}</span></div>
    <div class="row"><span class="label">تاريخ الدفع</span><span class="value">${payment.paidAt ? formatDate(payment.paidAt) : formatDate(payment.createdAt)}</span></div>
    ${payment.notes ? `<div class="row"><span class="label">ملاحظات</span><span class="value">${payment.notes}</span></div>` : ""}
    <div class="signatures">
      <div class="signature"><span>توقيع ولي الأمر</span><span class="signature-line">الاسم والتوقيع</span></div>
      <div class="signature"><span>توقيع المحاسب</span><span class="signature-line">الاسم والتوقيع</span></div>
      <div class="signature"><span>توقيع المعاون / المدير</span><span class="signature-line">الاسم والتوقيع</span></div>
      <div class="signature"><span>ختم المدرسة</span><span class="signature-line">الختم الرسمي</span></div>
    </div>
  </div>
  <div class="footer">ثانوية SchoolPro — تم إنشاء هذه الفاتورة إلكترونيًا</div>
</div>
<button class="print-btn" onclick="window.print()">طباعة الفاتورة</button>
</body>
</html>`;
}
