/* ─────────────────────────────────────────────
 *  Report Types & Helpers  (file 50)
 * ───────────────────────────────────────────── */

// ── Period & Date ────────────────────────────

export type ReportPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "semester"
  | "annual"
  | "custom";

export type ReportDateRange = {
  from: Date;
  to: Date;
  label: string;
};

// ── Dashboard Summary ────────────────────────

export type DashboardSummary = {
  students: {
    total: number;
    active: number;
    inactive: number;
    graduated: number;
    transferred: number;
  };
  teachers: {
    total: number;
    active: number;
    inactive: number;
  };
  classes: {
    total: number;
    active: number;
    inactive: number;
    sections: number;
  };
  subjects: {
    total: number;
    active: number;
    inactive: number;
  };
  attendance: {
    totalRecords: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: number;
  };
  grades: {
    totalRecords: number;
    averageScore: number;
    averagePercentage: number;
    passingRate: number;
    excellentCount: number;
    passingCount: number;
    failingCount: number;
  };
  payments: {
    totalFees: number;
    totalPaid: number;
    totalRemaining: number;
    paidCount: number;
    partialCount: number;
    unpaidCount: number;
    collectionRate: number;
  };
};

// ── Report Rows ──────────────────────────────

export type AttendanceReportRow = {
  studentId: string;
  studentName: string;
  studentCode: string | null;
  className: string | null;
  sectionName: string | null;
  subjectName: string | null;
  teacherName: string | null;
  date: Date | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  source: string | null;
  duration: string | null;
  checkedIn: number;
  checkedOut: number;
  missingCheckOut: number;
  lastDate: Date | null;
  lastStatus: string | null;
  lastStatusLabel: string | null;
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
  attendanceRating: string;
};

export type GradeReportRow = {
  studentId: string;
  studentName: string;
  studentCode: string | null;
  className: string | null;
  sectionName: string | null;
  subjectName: string;
  examName: string;
  score: number;
  maxScore: number;
  percentage: number;
  rating: string;
  term: string;
};

export type PaymentReportRow = {
  studentId: string;
  studentName: string;
  studentCode: string | null;
  className: string | null;
  sectionName: string | null;
  feeTitle: string;
  amount: number;
  paidAmount: number;
  originalAmount: number | null;
  discountAmount: number;
  discountPercent: number | null;
  discountReason: string | null;
  finalAmount: number | null;
  remainingAmount: number;
  status: string;
  statusLabel: string;
  dueDate: Date | null;
};

export type ClassReportRow = {
  classId: string;
  className: string;
  level: string | null;
  sectionsCount: number;
  studentsCount: number;
  subjectsCount: number;
  isActive: boolean;
};

export type TeacherReportRow = {
  teacherId: string;
  teacherName: string;
  specialty: string | null;
  subjectsCount: number;
  subjectsNames: string;
  schedulesCount: number;
  gradesCount: number;
  isActive: boolean;
};

// ── Filters ──────────────────────────────────

export type ReportFilter = {
  period: ReportPeriod;
  fromDate?: string;
  toDate?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
  studentId?: string;
  status?: string;
  term?: string;
  source?: string;
  missingCheckOut?: boolean;
};

// ── Charts ───────────────────────────────────

export type ChartPoint = {
  label: string;
  value: number;
  color?: string;
};

export type DashboardCharts = {
  attendanceDistribution: ChartPoint[];
  gradeDistribution: ChartPoint[];
  paymentStatusDistribution: ChartPoint[];
  studentsPerClass: ChartPoint[];
  monthlyAttendance: ChartPoint[];
};

// ── Helper Functions ─────────────────────────

export function parseReportDate(value?: string | Date): Date | undefined {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const date = new Date(trimmed);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function getReportDateRange(period: ReportPeriod): ReportDateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "daily": {
      const from = new Date(today);
      const to = new Date(today);
      to.setDate(to.getDate() + 1);
      return {
        from,
        to,
        label: formatReportDate(from),
      };
    }

    case "weekly": {
      const dayOfWeek = today.getDay();
      const from = new Date(today);
      from.setDate(from.getDate() - dayOfWeek);
      const to = new Date(from);
      to.setDate(to.getDate() + 7);
      return {
        from,
        to,
        label: `الأسبوع من ${formatReportDate(from)}`,
      };
    }

    case "monthly": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return {
        from,
        to,
        label: new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
          year: "numeric",
          month: "long",
        }).format(from),
      };
    }

    case "quarterly": {
      const quarter = Math.floor(today.getMonth() / 3);
      const from = new Date(today.getFullYear(), quarter * 3, 1);
      const to = new Date(today.getFullYear(), (quarter + 1) * 3, 1);
      return {
        from,
        to,
        label: `الربع ${quarter + 1} - ${today.getFullYear()}`,
      };
    }

    case "semester": {
      const month = today.getMonth();
      let from: Date;
      let to: Date;

      if (month >= 8) {
        // First semester: September - January
        from = new Date(today.getFullYear(), 8, 1);
        to = new Date(today.getFullYear() + 1, 1, 1);
      } else {
        // Second semester: February - June
        from = new Date(today.getFullYear(), 1, 1);
        to = new Date(today.getFullYear(), 6, 1);
      }

      return {
        from,
        to,
        label: month >= 8 ? "الفصل الأول" : "الفصل الثاني",
      };
    }

    case "annual": {
      const from = new Date(today.getFullYear(), 0, 1);
      const to = new Date(today.getFullYear() + 1, 0, 1);
      return {
        from,
        to,
        label: `السنة ${today.getFullYear()}`,
      };
    }

    case "custom":
    default: {
      // Default to current month
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      const to = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return {
        from,
        to,
        label: `من ${formatReportDate(from)} إلى ${formatReportDate(to)}`,
      };
    }
  }
}

export function calculateRate(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

export function getReportRating(percentage: number): string {
  if (percentage >= 90) {
    return "ممتاز";
  }

  if (percentage >= 80) {
    return "جيد جدًا";
  }

  if (percentage >= 70) {
    return "جيد";
  }

  if (percentage >= 60) {
    return "متوسط";
  }

  if (percentage >= 50) {
    return "مقبول";
  }

  return "ضعيف";
}

export function formatReportDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatReportNumber(value: number): string {
  return new Intl.NumberFormat("ar-IQ-u-nu-latn").format(value);
}

export function formatReportPercent(value: number): string {
  return new Intl.NumberFormat("ar-IQ-u-nu-latn", {
    maximumFractionDigits: 1,
  }).format(value) + "%";
}

export function formatReportMoney(amount: number): string {
  return new Intl.NumberFormat("ar-IQ-u-nu-latn", {
    style: "currency",
    currency: "IQD",
    maximumFractionDigits: 0,
  }).format(amount);
}
