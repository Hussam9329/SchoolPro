export const IRAQI_PHONE_REGEX = /^07\d{9}$/;

export function validateIraqiPhone(phone: string): boolean {
  return IRAQI_PHONE_REGEX.test(phone);
}

export function validateFullName(name: string): boolean {
  // لا يقبل الأرقام فقط - يسمح بأي اسم طالما لا يحتوي على أرقام
  return !/\d/.test(name.trim());
}

// Keep backward compatibility alias
export const validateQuadrupleName = validateFullName;

export function getPhoneErrorMessage(): string {
  return "رقم الهاتف يجب أن يتكون من 11 رقم ويبدأ بـ 07.";
}

export function getQuadrupleNameErrorMessage(): string {
  return "الاسم لا يجب أن يحتوي على أرقام.";
}
