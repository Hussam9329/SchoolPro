import { db, ensureDatabase, safeQuery } from "@/lib/db";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrow() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const emptyStats = {
  studentsTotal: 0,
  teachersTotal: 0,
  classesTotal: 0,
  sectionsTotal: 0,
  todayAttendanceRate: 0,
  gradesThisMonth: 0,
  totalPaid: 0,
  insideSchoolNow: 0,
  readinessRate: 0,
};

async function getDashboardStatsSnapshot() {
  const todayStart = startOfToday();
  const tomorrowStart = startOfTomorrow();
  const monthStart = startOfMonth();

  const [
    studentsTotal,
    teachersTotal,
    classesTotal,
    sectionsTotal,
    todayAttendanceTotal,
    todayAttendancePresent,
    gradesThisMonth,
    paidAggregate,
    insideSchoolNow,
    subjectsTotal,
  ] = await Promise.all([
    db.student.count(),
    db.teacher.count(),
    db.schoolClass.count(),
    db.section.count(),
    db.attendanceRecord.count({
      where: { date: { gte: todayStart, lt: tomorrowStart } },
    }),
    db.attendanceRecord.count({
      where: {
        date: { gte: todayStart, lt: tomorrowStart },
        status: { in: ["present", "late", "excused"] },
      },
    }),
    db.grade.count({
      where: { createdAt: { gte: monthStart } },
    }),
    db.payment.aggregate({
      where: { status: { in: ["paid", "partial"] } },
      _sum: { amount: true },
    }),
    db.attendanceRecord.count({
      where: {
        date: { gte: todayStart, lt: tomorrowStart },
        checkInAt: { not: null },
        checkOutAt: null,
      },
    }),
    db.subject.count(),
  ]);

  const setupChecks = [
    subjectsTotal > 0,
    classesTotal > 0,
    sectionsTotal > 0,
    teachersTotal > 0,
    studentsTotal > 0,
  ];

  return {
    studentsTotal,
    teachersTotal,
    classesTotal,
    sectionsTotal,
    todayAttendanceRate:
      todayAttendanceTotal > 0
        ? Math.round((todayAttendancePresent / todayAttendanceTotal) * 100)
        : 0,
    gradesThisMonth,
    totalPaid: paidAggregate._sum.amount ?? 0,
    insideSchoolNow,
    readinessRate: Math.round(
      (setupChecks.filter(Boolean).length / setupChecks.length) * 100,
    ),
  };
}

export async function getDashboardStats() {
  await ensureDatabase();
  return safeQuery(async () => getDashboardStatsSnapshot(), emptyStats);
}
