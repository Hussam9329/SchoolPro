/**
 * SchoolPro stores application data only in the configured PostgreSQL DATABASE_URL.
 * These helpers keep service-level validation messages consistent.
 */

export const DATABASE_UNAVAILABLE_MESSAGE =
  "قاعدة البيانات غير مهيأة. تحقق من DATABASE_URL في إعدادات Vercel ثم أعد التشغيل.";

export function isDatabaseStorageEnabled(): boolean {
  return true;
}

export function getDatabaseUnavailableMessage(): string {
  return DATABASE_UNAVAILABLE_MESSAGE;
}
