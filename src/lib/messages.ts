export type MessageTone = "info" | "success" | "warning" | "danger";

export type SmartMessage = {
  title: string;
  description: string;
  tone: MessageTone;
  actionLabel?: string;
  actionHref?: string;
};

export const appMessages = {
  welcome: {
    title: "أهلًا بك في SchoolPro",
    description:
      "ابدأ بتجهيز النظام خطوة خطوة. أضف المواد الدراسية، ثم الصفوف، ثم المدرسين والطلاب.",
    tone: "info",
  } satisfies SmartMessage,

  noLoginMode: {
    title: "تم تسجيل الدخول بنجاح",
    description:
      "أنت الآن في لوحة تحكم ثانوية SchoolPro.",
    tone: "success",
  } satisfies SmartMessage,

  setupOrder: {
    title: "اتبع ترتيب التأسيس الصحيح",
    description:
      "ابدأ بالمواد الدراسية، ثم الصفوف والشُعب، بعدها أضف المدرسين والطلاب. هذا الترتيب يمنع الأخطاء لاحقًا.",
    tone: "info",
    actionLabel: "ابدأ بإضافة مادة",
    actionHref: "/subjects",
  } satisfies SmartMessage,

  subjectsFirst: {
    title: "أضف المواد الدراسية أولًا",
    description:
      "المواد الدراسية ضرورية قبل ربط المدرسين، إنشاء الجداول، وإدخال الدرجات.",
    tone: "warning",
    actionLabel: "إضافة مادة",
    actionHref: "/subjects",
  } satisfies SmartMessage,

  classesBeforeStudents: {
    title: "لا تضف الطلاب قبل إنشاء الصفوف",
    description:
      "كل طالب يحتاج صفًا وشعبة. أنشئ الصفوف أولًا حتى تكون بيانات الطلاب منظمة من البداية.",
    tone: "warning",
    actionLabel: "إنشاء صف",
    actionHref: "/classes",
  } satisfies SmartMessage,

  teachersNeedSubjects: {
    title: "المدرس يحتاج مادة دراسية",
    description:
      "قبل إضافة المدرسين، تأكد من وجود المواد الدراسية حتى يمكن ربط كل مدرس بالمادة المناسبة.",
    tone: "info",
    actionLabel: "إدارة المواد",
    actionHref: "/subjects",
  } satisfies SmartMessage,

  attendanceNeedsStudents: {
    title: "الحضور يحتاج طلاب داخل الصفوف",
    description:
      "حتى تسجل الحضور، يجب أن تكون لديك صفوف وشُعب وطلاب مسجلين داخلها.",
    tone: "warning",
    actionLabel: "إدارة الطلاب",
    actionHref: "/students",
  } satisfies SmartMessage,

  gradesNeedSubjectsAndStudents: {
    title: "الدرجات تحتاج مواد وطلاب",
    description:
      "لإدخال الدرجات بشكل صحيح، تأكد من إضافة المواد الدراسية والطلاب وربطهم بالصفوف.",
    tone: "warning",
    actionLabel: "إدارة الدرجات",
    actionHref: "/grades",
  } satisfies SmartMessage,

  feesNeedStudents: {
    title: "الأقساط تبدأ بعد إضافة الطلاب",
    description:
      "بعد تسجيل الطلاب داخل النظام، يمكنك إنشاء الأقساط وتسجيل الدفعات لكل طالب.",
    tone: "info",
    actionLabel: "إدارة الأقساط",
    actionHref: "/fees",
  } satisfies SmartMessage,
};

export const emptyStateMessages = {
  school: {
    title: "لم تتم إضافة بيانات المدرسة بعد",
    description:
      "أضف اسم المدرسة وشعارها ومعلومات الاتصال حتى تظهر في التقارير والواجهات.",
    actionLabel: "إضافة بيانات المدرسة",
  },

  subjects: {
    title: "لا توجد مواد دراسية بعد",
    description:
      "ابدأ بإضافة المواد مثل الرياضيات، اللغة العربية، العلوم وغيرها. المواد هي أساس الجدول والدرجات.",
    actionLabel: "إضافة أول مادة",
  },

  classes: {
    title: "لا توجد صفوف أو شُعب بعد",
    description:
      "أنشئ الصفوف والشُعب حتى تتمكن من إضافة الطلاب وتنظيم الحضور والدرجات.",
    actionLabel: "إنشاء أول صف",
  },

  teachers: {
    title: "لا يوجد مدرسين بعد",
    description:
      "أضف المدرسين واربطهم بالمواد الدراسية حتى يصبح توزيع المحاضرات أسهل.",
    actionLabel: "إضافة أول مدرس",
  },

  students: {
    title: "لا يوجد طلاب بعد",
    description:
      "بعد إنشاء الصفوف، أضف الطلاب واربط كل طالب بصفه وشعبتها.",
    actionLabel: "إضافة أول طالب",
  },

  schedule: {
    title: "لم يتم إنشاء جدول دراسي بعد",
    description:
      "بعد إضافة المواد والصفوف والمدرسين، يمكنك بناء جدول دراسي واضح ومنظم.",
    actionLabel: "إنشاء جدول",
  },

  attendance: {
    title: "لا توجد سجلات حضور بعد",
    description:
      "اختر الصف والتاريخ، ثم سجل حالة كل طالب: حاضر، غائب، متأخر، أو مجاز.",
    actionLabel: "تسجيل حضور اليوم",
  },

  grades: {
    title: "لا توجد درجات بعد",
    description:
      "اختر الصف والمادة والامتحان، ثم أدخل درجات الطلاب بطريقة سهلة وسريعة.",
    actionLabel: "إدخال درجات",
  },

  fees: {
    title: "لا توجد أقساط بعد",
    description:
      "بعد إضافة الطلاب، يمكنك إنشاء الأقساط وتسجيل الدفعات والمتبقي.",
    actionLabel: "إضافة قسط",
  },

  reports: {
    title: "لا توجد تقارير جاهزة بعد",
    description:
      "عند توفر بيانات الطلاب والحضور والدرجات والأقساط، ستتمكن من استخراج تقارير منظمة.",
    actionLabel: "عرض التقارير",
  },
};

export const toastMessages = {
  saved: {
    title: "تم الحفظ بنجاح",
    description: "رائع، تم تسجيل البيانات داخل النظام.",
    tone: "success",
  } satisfies SmartMessage,

  updated: {
    title: "تم التحديث بنجاح",
    description: "تم حفظ التعديلات الجديدة بدون مشاكل.",
    tone: "success",
  } satisfies SmartMessage,

  deleted: {
    title: "تم الحذف",
    description: "تم حذف العنصر من القائمة بنجاح.",
    tone: "success",
  } satisfies SmartMessage,

  error: {
    title: "حدث خطأ غير متوقع",
    description:
      "لم تكتمل العملية. تأكد من البيانات وحاول مرة أخرى.",
    tone: "danger",
  } satisfies SmartMessage,

  requiredFields: {
    title: "توجد بيانات ناقصة",
    description:
      "يرجى تعبئة الحقول المطلوبة قبل الحفظ.",
    tone: "warning",
  } satisfies SmartMessage,

  duplicateName: {
    title: "هذا الاسم موجود مسبقًا",
    description:
      "استخدم اسمًا مختلفًا أو تحقق من العنصر الموجود في القائمة.",
    tone: "warning",
  } satisfies SmartMessage,
};

export const confirmationMessages = {
  delete: {
    title: "هل أنت متأكد من الحذف؟",
    description:
      "لن يظهر هذا العنصر في القوائم بعد الحذف. تأكد قبل المتابعة.",
    confirmLabel: "نعم، احذف",
    cancelLabel: "تراجع",
  },

  reset: {
    title: "هل تريد إعادة التعيين؟",
    description:
      "سيتم إرجاع هذه البيانات إلى حالتها الأولى. تأكد قبل تنفيذ العملية.",
    confirmLabel: "نعم، أعد التعيين",
    cancelLabel: "إلغاء",
  },

  leavePage: {
    title: "لديك تغييرات غير محفوظة",
    description:
      "إذا غادرت الصفحة الآن، قد تفقد التعديلات التي لم تحفظها.",
    confirmLabel: "مغادرة",
    cancelLabel: "البقاء هنا",
  },
};

export function getSetupMessage(counts: {
  subjects?: number;
  classes?: number;
  teachers?: number;
  students?: number;
}): SmartMessage {
  const subjects = counts.subjects ?? 0;
  const classes = counts.classes ?? 0;
  const teachers = counts.teachers ?? 0;
  const students = counts.students ?? 0;

  if (subjects === 0) {
    return appMessages.subjectsFirst;
  }

  if (classes === 0) {
    return appMessages.classesBeforeStudents;
  }

  if (teachers === 0) {
    return {
      title: "أضف المدرسين بعد تجهيز الصفوف",
      description:
        "الآن أصبح لديك مواد وصفوف. الخطوة التالية هي إضافة المدرسين وربطهم بالمواد المناسبة.",
      tone: "info",
      actionLabel: "إضافة مدرس",
      actionHref: "/teachers",
    };
  }

  if (students === 0) {
    return {
      title: "الآن أضف الطلاب",
      description:
        "بعد تجهيز المواد والصفوف والمدرسين، يمكنك إضافة الطلاب وتنظيمهم داخل الشعب.",
      tone: "info",
      actionLabel: "إضافة طالب",
      actionHref: "/students",
    };
  }

  return {
    title: "النظام جاهز للتشغيل اليومي",
    description:
      "يمكنك الآن تسجيل الحضور، إدخال الدرجات، متابعة الأقساط، واستخراج التقارير.",
    tone: "success",
    actionLabel: "بدء تسجيل الحضور",
    actionHref: "/attendance",
  };
}

export function getSaveSuccessMessage(entityName: string): SmartMessage {
  return {
    title: "تم الحفظ بنجاح",
    description: `تم حفظ ${entityName} داخل النظام بنجاح.`,
    tone: "success",
  };
}

export function getUpdateSuccessMessage(entityName: string): SmartMessage {
  return {
    title: "تم التحديث بنجاح",
    description: `تم تحديث بيانات ${entityName} بنجاح.`,
    tone: "success",
  };
}

export function getDeleteSuccessMessage(entityName: string): SmartMessage {
  return {
    title: "تم الحذف بنجاح",
    description: `تم حذف ${entityName} من النظام.`,
    tone: "success",
  };
}

export function getRequiredFieldMessage(fieldName: string): SmartMessage {
  return {
    title: "حقل مطلوب",
    description: `يرجى تعبئة حقل ${fieldName} قبل المتابعة.`,
    tone: "warning",
  };
}

export const APP_MESSAGES = {
  phoneRule: "رقم الهاتف يجب أن يتكون من 11 رقم ويبدأ بـ 07.",
  fullNameRule: "الاسم لا يجب أن يحتوي على أرقام.",
  saveSuccess: "تم الحفظ بنجاح.",
  saveError: "تعذر الحفظ، تحقق من البيانات وحاول مرة أخرى.",
  deleteWarning: "لا يمكن التراجع عن عملية الحذف.",
  relationWarning: "هذه البيانات مرتبطة بسجلات أخرى، تحقق قبل الحذف.",
  gradesWarning: "راجع الدرجات المنخفضة قبل اعتماد النتائج.",
  paymentWarning: "راجع مبلغ الخصم والمبلغ النهائي قبل حفظ الدفعة.",
  discountCalculated: "تم احتساب الخصم تلقائيًا، راجع المبلغ النهائي قبل الحفظ.",
  discountTooLarge: "تحذير: قيمة الخصم أكبر من القسط.",
  discountSuggestion: "اقتراح ذكي: هذا الطالب قد يكون مؤهل لخصم.",
  finalAmountAfterDiscount: "المبلغ النهائي بعد الخصم",
  classSeedInfo: "تم تجهيز الصفوف الأساسية من الأول إلى السادس، ويمكنك إضافة شعب إضافية عند الحاجة.",
  selectSectionFirst: "اختر الشعبة أولًا حتى تظهر قائمة الطلاب.",
  selectSubjectFirst: "اختر المادة حتى تظهر المدرسين المرتبطين بها.",
  gradeExceedsMax: "لا يمكن حفظ درجة أكبر من الدرجة الكلية.",
  gradesSaved: "تم حفظ الدرجات بنجاح.",
  reviewLowGrades: "راجع الدرجات المنخفضة قبل اعتمادها.",
  studentsWithoutGrades: "يوجد طلاب لم يتم إدخال درجاتهم.",
};

export const deleteMessages = {
  subject: {
    blocked: "لا يمكن حذف هذه المادة لأنها مرتبطة بدرجات أو جدول دراسي.",
    confirm: "سيتم حذف المادة فقط إذا لم تكن مرتبطة بأي بيانات أخرى.",
  },
  class: {
    blocked: "لا يمكن حذف الصف لأنه يحتوي على طلاب أو شُعب أو محاضرات.",
    confirm: "سيتم حذف الصف فقط إذا لم يكن مرتبطًا بأي بيانات.",
  },
  section: {
    blocked: "لا يمكن حذف الشعبة لأنها تحتوي على طلاب.",
    confirm: "سيتم حذف الشعبة فقط إذا كانت فارغة.",
  },
  teacher: {
    blocked: "لا يمكن حذف المدرس لأنه مرتبط بمحاضرات أو درجات.",
    confirm: "الأفضل تعطيل المدرس بدل حذفه إذا كان لديه بيانات قديمة.",
  },
  student: {
    blocked: "لا يمكن حذف الطالب لأنه مرتبط بدرجات أو أقساط أو حضور.",
    confirm: "حذف الطالب قد يؤثر على حضوره ودرجاته وأقساطه. الأفضل تغيير حالته إلى متوقف أو منقول.",
  },
  payment: {
    blocked: "لا يمكن حذف الدفعة بعد إصدار فاتورة لها. يمكن إضافة دفعة تصحيحية بدل الحذف.",
    confirm: "سيتم حذف الدفعة من سجل الأقساط.",
  },
  attendance: {
    blocked: "لا يمكن حذف سجل حضور قديم بعد إغلاق اليوم.",
    confirm: "سيتم حذف سجل الحضور لهذا اليوم فقط.",
  },
};

export function getNextStepMessage(entity: string): SmartMessage {
  switch (entity) {
    case "subject":
      return { title: "تم حفظ المادة", description: "الخطوة التالية: أضف الصفوف والشُعب.", tone: "success" };
    case "class":
      return { title: "تم حفظ الصف", description: "الآن أضف شعبة لهذا الصف.", tone: "success" };
    case "section":
      return { title: "تم حفظ الشعبة", description: "يمكنك الآن إضافة الطلاب إليها.", tone: "success" };
    case "teacher":
      return { title: "تم حفظ المدرس", description: "يمكنك الآن ربطه بالمحاضرات أو الدرجات.", tone: "success" };
    case "student":
      return { title: "تم حفظ الطالب", description: "يمكنك الآن تسجيل حضوره أو إضافة قسط له.", tone: "success" };
    case "payment":
      return { title: "تم حفظ الدفعة", description: "يمكنك الآن طباعة الفاتورة.", tone: "success" };
    case "exam":
      return { title: "تم حفظ الامتحان", description: "أدخل الآن درجات الطلاب.", tone: "success" };
    default:
      return { title: "تم الحفظ بنجاح", description: "تم حفظ البيانات بنجاح.", tone: "success" };
  }
}

export const STUDENT_STATUS_HELP: Record<string, string> = {
  active: "مستمر: الطالب يدرس حاليًا.",
  inactive: "متوقف: الطالب لم يعد يداوم مؤقتًا أو نهائيًا.",
  graduated: "متخرج: أكمل الدراسة.",
  transferred: "منقول: انتقل إلى مدرسة أخرى.",
};

export const TEACHER_STATUS_HELP: Record<string, string> = {
  active: "فعّال: المدرس يدرّس حاليًا ويمكن ربطه بالمحاضرات.",
  inactive: "متوقف: المدرس غير متاح حاليًا ولا يظهر في الاختيارات الجديدة.",
};
