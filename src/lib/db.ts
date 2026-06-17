import { cache as reactCache } from "react";
import bcrypt from "bcryptjs";
import { postgresDB, hasDatabaseConfig, getDatabaseConfigErrorMessage, closePostgresPool } from "@/lib/postgres-client";

export const db = postgresDB;

const globalForMigration = globalThis as unknown as {
  schoolProDbInitialized?: boolean;
  schoolProDbInitPromise?: Promise<void> | null;
};

const schemaStatements = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
  `CREATE TABLE IF NOT EXISTS "admins" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "username" text NOT NULL UNIQUE,
    "passwordHash" text NOT NULL,
    "isRoot" boolean NOT NULL DEFAULT false,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "admin_sessions" (
    "id" text PRIMARY KEY,
    "adminId" text NOT NULL REFERENCES "admins"("id") ON DELETE CASCADE,
    "jti" text NOT NULL UNIQUE,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "expiresAt" timestamptz NOT NULL,
    "revokedAt" timestamptz NULL,
    "userAgent" text NULL,
    "ip" text NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "subjects" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" text NOT NULL,
    "subjectBaseName" text NULL,
    "schoolStage" text NULL,
    "gradeLevel" text NULL,
    "studyTrack" text NULL,
    "description" text NULL,
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "subjectBaseName" text NULL`,
  `ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "schoolStage" text NULL`,
  `ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "gradeLevel" text NULL`,
  `ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "studyTrack" text NULL`,
  `CREATE TABLE IF NOT EXISTS "school_classes" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" text NOT NULL,
    "level" text NULL,
    "description" text NULL,
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("name", "level")
  )`,
  `CREATE TABLE IF NOT EXISTS "sections" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" text NOT NULL,
    "capacity" integer NULL,
    "description" text NULL,
    "isActive" boolean NOT NULL DEFAULT true,
    "classId" text NOT NULL REFERENCES "school_classes"("id") ON DELETE CASCADE,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("classId", "name")
  )`,
  `CREATE TABLE IF NOT EXISTS "teachers" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "fullName" text NOT NULL,
    "phone" text NULL UNIQUE,
    "email" text NULL,
    "address" text NULL,
    "specialty" text NULL,
    "salary" numeric NULL,
    "notes" text NULL,
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "teacher_subjects" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "teacherId" text NOT NULL REFERENCES "teachers"("id") ON DELETE CASCADE,
    "subjectId" text NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("teacherId", "subjectId")
  )`,
  `CREATE TABLE IF NOT EXISTS "teacher_sections" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "teacherId" text NOT NULL REFERENCES "teachers"("id") ON DELETE CASCADE,
    "sectionId" text NOT NULL REFERENCES "sections"("id") ON DELETE CASCADE,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("teacherId", "sectionId")
  )`,
  `CREATE TABLE IF NOT EXISTS "class_subjects" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "classId" text NOT NULL REFERENCES "school_classes"("id") ON DELETE CASCADE,
    "subjectId" text NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("classId", "subjectId")
  )`,
  `CREATE TABLE IF NOT EXISTS "students" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "fullName" text NOT NULL,
    "studentCode" text NULL UNIQUE,
    "gender" text NULL,
    "birthDate" timestamptz NULL,
    "phone" text NULL,
    "guardianName" text NULL,
    "guardianPhone" text NULL,
    "address" text NULL,
    "enrollmentDate" timestamptz NOT NULL DEFAULT now(),
    "status" text NOT NULL DEFAULT 'active',
    "notes" text NULL,
    "sectionId" text NULL REFERENCES "sections"("id") ON DELETE SET NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "schedules" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "dayOfWeek" text NOT NULL,
    "startTime" text NOT NULL,
    "endTime" text NOT NULL,
    "room" text NULL,
    "notes" text NULL,
    "isActive" boolean NOT NULL DEFAULT true,
    "sectionId" text NOT NULL REFERENCES "sections"("id") ON DELETE CASCADE,
    "subjectId" text NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "teacherId" text NOT NULL REFERENCES "teachers"("id") ON DELETE CASCADE,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "attendance_records" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "date" timestamptz NOT NULL DEFAULT now(),
    "mode" text NOT NULL DEFAULT 'manual',
    "status" text NOT NULL DEFAULT 'present',
    "notes" text NULL,
    "checkInAt" timestamptz NULL,
    "checkOutAt" timestamptz NULL,
    "source" text NULL,
    "studentId" text NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "scheduleId" text NULL REFERENCES "schedules"("id") ON DELETE SET NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "exams" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" text NOT NULL,
    "type" text NOT NULL,
    "date" timestamptz NOT NULL DEFAULT now(),
    "maxScore" numeric NOT NULL DEFAULT 100,
    "passScore" numeric NOT NULL DEFAULT 50,
    "failScore" numeric NULL,
    "notes" text NULL,
    "subjectId" text NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "sectionId" text NOT NULL REFERENCES "sections"("id") ON DELETE CASCADE,
    "teacherId" text NULL REFERENCES "teachers"("id") ON DELETE SET NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "grades" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "title" text NOT NULL,
    "score" numeric NOT NULL,
    "maxScore" numeric NOT NULL DEFAULT 100,
    "examType" text NOT NULL DEFAULT 'monthly',
    "term" text NOT NULL DEFAULT 'first',
    "date" timestamptz NOT NULL DEFAULT now(),
    "notes" text NULL,
    "studentId" text NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "subjectId" text NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "teacherId" text NULL REFERENCES "teachers"("id") ON DELETE SET NULL,
    "examId" text NULL REFERENCES "exams"("id") ON DELETE SET NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "class_fee_settings" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "classId" text NOT NULL REFERENCES "school_classes"("id") ON DELETE CASCADE,
    "tuitionAmount" numeric NOT NULL DEFAULT 0,
    "uniformAmount" numeric NOT NULL DEFAULT 0,
    "academicYear" text NOT NULL,
    "notes" text NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now(),
    UNIQUE ("classId", "academicYear")
  )`,
  `CREATE TABLE IF NOT EXISTS "payments" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "feeTitle" text NOT NULL,
    "feeType" text NOT NULL DEFAULT 'tuition',
    "amount" numeric NOT NULL DEFAULT 0,
    "originalAmount" numeric NULL,
    "discountAmount" numeric NOT NULL DEFAULT 0,
    "discountPercent" numeric NULL,
    "discountReason" text NULL,
    "finalAmount" numeric NULL,
    "status" text NOT NULL DEFAULT 'pending',
    "method" text NOT NULL DEFAULT 'cash',
    "academicYear" text NULL,
    "dueDate" timestamptz NULL,
    "paidAt" timestamptz NULL,
    "notes" text NULL,
    "studentId" text NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS "school_settings" (
    "id" text PRIMARY KEY DEFAULT 'main',
    "weekendDays" jsonb NOT NULL DEFAULT '["friday", "saturday"]'::jsonb,
    "customHolidayDates" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "checkoutWarningTime" text NOT NULL DEFAULT '12:00',
    "notes" text NULL,
    "createdAt" timestamptz NOT NULL DEFAULT now(),
    "updatedAt" timestamptz NOT NULL DEFAULT now()
  )`,
  `INSERT INTO "school_settings" ("id", "weekendDays", "customHolidayDates", "checkoutWarningTime", "notes", "createdAt", "updatedAt") VALUES ('main', '["friday", "saturday"]'::jsonb, '[]'::jsonb, '12:00', NULL, now(), now()) ON CONFLICT ("id") DO NOTHING`,
  `CREATE INDEX IF NOT EXISTS "idx_admin_sessions_admin_id" ON "admin_sessions"("adminId")`,
  `CREATE INDEX IF NOT EXISTS "idx_admin_sessions_jti" ON "admin_sessions"("jti")`,
  `CREATE INDEX IF NOT EXISTS "idx_students_section" ON "students"("sectionId")`,
  `CREATE INDEX IF NOT EXISTS "idx_attendance_student_date" ON "attendance_records"("studentId", "date")`,
  `CREATE INDEX IF NOT EXISTS "idx_attendance_inside_school" ON "attendance_records"("date", "checkInAt", "checkOutAt")`,
  `CREATE INDEX IF NOT EXISTS "idx_grades_exam_student" ON "grades"("examId", "studentId")`,
  `CREATE INDEX IF NOT EXISTS "idx_payments_student_year_type" ON "payments"("studentId", "academicYear", "feeType")`,
];

async function runSchemaMigration() {
  for (const statement of schemaStatements) {
    await db.$executeRawUnsafe(statement);
  }
}

async function seedInitialAdmin() {
  try {
    const count = await db.admin.count();
    if (count > 0) return;

    const username = process.env.INITIAL_ADMIN_USERNAME || "admin";
    const password = process.env.INITIAL_ADMIN_PASSWORD || "admin1234";
    const passwordHash = await bcrypt.hash(password, 12);

    await db.admin.create({
      data: {
        username,
        passwordHash,
        isRoot: true,
      },
    });
    console.log("[seedInitialAdmin] Created initial admin user:", username);
  } catch (error) {
    console.error("[seedInitialAdmin] Failed to seed admin:", error);
    // Don't throw — the app can still work, just without a pre-seeded admin
  }
}

export const ensureDatabase = reactCache(async () => {
  if (!hasDatabaseConfig()) return;
  if (globalForMigration.schoolProDbInitialized) {
    // Even if already initialized, ensure admin exists (handles partial init from previous deployments)
    await seedInitialAdmin();
    return;
  }
  if (globalForMigration.schoolProDbInitPromise) {
    await globalForMigration.schoolProDbInitPromise;
    return;
  }

  globalForMigration.schoolProDbInitPromise = (async () => {
    await db.$connect();
    await runSchemaMigration();
    await seedInitialAdmin();
    globalForMigration.schoolProDbInitialized = true;
  })();

  try {
    await globalForMigration.schoolProDbInitPromise;
  } catch (error) {
    globalForMigration.schoolProDbInitPromise = null;
    console.error("[ensureDatabase] PostgreSQL initialization failed:", error);
    throw error;
  }
});

export const safeQuery = reactCache(async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!hasDatabaseConfig()) return fallback;
  try {
    await ensureDatabase();
    return await fn();
  } catch (error) {
    console.error("[safeQuery] Query failed:", error);
    return fallback;
  }
});

export async function checkDatabaseConnection() {
  if (!hasDatabaseConfig()) {
    return { ok: false, message: getDatabaseConfigErrorMessage() };
  }
  try {
    await ensureDatabase();
    return { ok: true, message: "قاعدة البيانات PostgreSQL متصلة بنجاح" };
  } catch {
    return { ok: false, message: "تعذر الاتصال بقاعدة البيانات PostgreSQL" };
  }
}

export async function disconnectDatabase() {
  await closePostgresPool();
}
