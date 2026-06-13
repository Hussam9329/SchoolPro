/**
 * Prisma type compatibility shim.
 * Provides type definitions that match Prisma's generated types,
 * so existing service code using `Prisma.XxxWhereInput`, `Prisma.XxxGetPayload`, etc.
 * continues to work without the actual @prisma/client import.
 *
 * Since our external data API client uses the same data shapes,
 * these types serve as documentation and TypeScript compatibility.
 */

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Prisma {
  // Base where input types - these are just Record<string, any> under the hood
  // but we define them for TypeScript compatibility
  export type StudentWhereInput = Record<string, any>;
  export type TeacherWhereInput = Record<string, any>;
  export type SchoolClassWhereInput = Record<string, any>;
  export type SectionWhereInput = Record<string, any>;
  export type SubjectWhereInput = Record<string, any>;
  export type ScheduleWhereInput = Record<string, any>;
  export type AttendanceRecordWhereInput = Record<string, any>;
  export type GradeWhereInput = Record<string, any>;
  export type ExamWhereInput = Record<string, any>;
  export type PaymentWhereInput = Record<string, any>;
  export type ClassFeeSettingWhereInput = Record<string, any>;
  export type SchoolSettingWhereInput = Record<string, any>;

  // Include types
  export type StudentInclude = Record<string, any>;
  export type TeacherInclude = Record<string, any>;
  export type ScheduleInclude = Record<string, any>;
  export type AttendanceRecordInclude = Record<string, any>;
  export type GradeInclude = Record<string, any>;
  export type PaymentInclude = Record<string, any>;

  // GetPayload utility type - just returns the type as-is since our data shapes match
  export type XxxGetPayload<T> = Record<string, any>;

  // For specific GetPayload types, we use a generic approach
  export type StudentGetPayload<T> = Record<string, any>;
  export type TeacherGetPayload<T> = Record<string, any>;
  export type ScheduleGetPayload<T> = Record<string, any>;
  export type AttendanceRecordGetPayload<T> = Record<string, any>;
  export type GradeGetPayload<T> = Record<string, any>;
  export type PaymentGetPayload<T> = Record<string, any>;
  export type ExamGetPayload<T> = Record<string, any>;

  // DateTime filter
  export type DateTimeFilter = {
    equals?: Date | string;
    gt?: Date | string;
    gte?: Date | string;
    lt?: Date | string;
    lte?: Date | string;
    not?: Date | string | DateTimeFilter;
  };

  // Prisma error class compatibility
  export class PrismaClientKnownRequestError extends Error {
    code: string;
    meta?: Record<string, any>;
    clientVersion: string;

    constructor(message: string, args: { code: string; meta?: Record<string, any>; clientVersion: string }) {
      super(message);
      this.code = args.code;
      this.meta = args.meta;
      this.clientVersion = args.clientVersion;
      this.name = "PrismaClientKnownRequestError";
    }
  }
}
