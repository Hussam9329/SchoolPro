import { Pool, type QueryResult } from "pg";

const globalForPg = globalThis as unknown as { schoolProPool?: Pool };

type QueryExecutor = (text: string, values?: any[]) => Promise<QueryResult<any>>;

type RelationInfo = {
  table: string;
  foreignKey: string;
  thisKey: string;
  isMany: boolean;
};

const MODEL_TO_TABLE: Record<string, string> = {
  admin: "admins",
  adminSession: "admin_sessions",
  subject: "subjects",
  schoolClass: "school_classes",
  section: "sections",
  teacher: "teachers",
  teacherSubject: "teacher_subjects",
  teacherSection: "teacher_sections",
  classSubject: "class_subjects",
  student: "students",
  schedule: "schedules",
  attendanceRecord: "attendance_records",
  exam: "exams",
  grade: "grades",
  classFeeSetting: "class_fee_settings",
  payment: "payments",
  schoolSetting: "school_settings",
};

const RELATION_MAP: Record<string, Record<string, RelationInfo>> = {
  admin: {
    sessions: { table: "admin_sessions", foreignKey: "adminId", thisKey: "id", isMany: true },
  },
  adminSession: {
    admin: { table: "admins", foreignKey: "id", thisKey: "adminId", isMany: false },
  },
  student: {
    section: { table: "sections", foreignKey: "id", thisKey: "sectionId", isMany: false },
    grades: { table: "grades", foreignKey: "studentId", thisKey: "id", isMany: true },
    attendanceRecords: { table: "attendance_records", foreignKey: "studentId", thisKey: "id", isMany: true },
    payments: { table: "payments", foreignKey: "studentId", thisKey: "id", isMany: true },
  },
  section: {
    class: { table: "school_classes", foreignKey: "id", thisKey: "classId", isMany: false },
    students: { table: "students", foreignKey: "sectionId", thisKey: "id", isMany: true },
    schedules: { table: "schedules", foreignKey: "sectionId", thisKey: "id", isMany: true },
    teacherSections: { table: "teacher_sections", foreignKey: "sectionId", thisKey: "id", isMany: true },
    exams: { table: "exams", foreignKey: "sectionId", thisKey: "id", isMany: true },
  },
  schoolClass: {
    sections: { table: "sections", foreignKey: "classId", thisKey: "id", isMany: true },
    classSubjects: { table: "class_subjects", foreignKey: "classId", thisKey: "id", isMany: true },
    feeSettings: { table: "class_fee_settings", foreignKey: "classId", thisKey: "id", isMany: true },
  },
  teacher: {
    teacherSubjects: { table: "teacher_subjects", foreignKey: "teacherId", thisKey: "id", isMany: true },
    teacherSections: { table: "teacher_sections", foreignKey: "teacherId", thisKey: "id", isMany: true },
    schedules: { table: "schedules", foreignKey: "teacherId", thisKey: "id", isMany: true },
    exams: { table: "exams", foreignKey: "teacherId", thisKey: "id", isMany: true },
    grades: { table: "grades", foreignKey: "teacherId", thisKey: "id", isMany: true },
  },
  teacherSubject: {
    teacher: { table: "teachers", foreignKey: "id", thisKey: "teacherId", isMany: false },
    subject: { table: "subjects", foreignKey: "id", thisKey: "subjectId", isMany: false },
  },
  teacherSection: {
    teacher: { table: "teachers", foreignKey: "id", thisKey: "teacherId", isMany: false },
    section: { table: "sections", foreignKey: "id", thisKey: "sectionId", isMany: false },
  },
  classSubject: {
    class: { table: "school_classes", foreignKey: "id", thisKey: "classId", isMany: false },
    subject: { table: "subjects", foreignKey: "id", thisKey: "subjectId", isMany: false },
  },
  schedule: {
    section: { table: "sections", foreignKey: "id", thisKey: "sectionId", isMany: false },
    subject: { table: "subjects", foreignKey: "id", thisKey: "subjectId", isMany: false },
    teacher: { table: "teachers", foreignKey: "id", thisKey: "teacherId", isMany: false },
    attendanceRecords: { table: "attendance_records", foreignKey: "scheduleId", thisKey: "id", isMany: true },
  },
  attendanceRecord: {
    student: { table: "students", foreignKey: "id", thisKey: "studentId", isMany: false },
    schedule: { table: "schedules", foreignKey: "id", thisKey: "scheduleId", isMany: false },
  },
  subject: {
    teacherSubjects: { table: "teacher_subjects", foreignKey: "subjectId", thisKey: "id", isMany: true },
    classSubjects: { table: "class_subjects", foreignKey: "subjectId", thisKey: "id", isMany: true },
    grades: { table: "grades", foreignKey: "subjectId", thisKey: "id", isMany: true },
    schedules: { table: "schedules", foreignKey: "subjectId", thisKey: "id", isMany: true },
    exams: { table: "exams", foreignKey: "subjectId", thisKey: "id", isMany: true },
  },
  exam: {
    subject: { table: "subjects", foreignKey: "id", thisKey: "subjectId", isMany: false },
    section: { table: "sections", foreignKey: "id", thisKey: "sectionId", isMany: false },
    teacher: { table: "teachers", foreignKey: "id", thisKey: "teacherId", isMany: false },
    grades: { table: "grades", foreignKey: "examId", thisKey: "id", isMany: true },
  },
  grade: {
    student: { table: "students", foreignKey: "id", thisKey: "studentId", isMany: false },
    subject: { table: "subjects", foreignKey: "id", thisKey: "subjectId", isMany: false },
    teacher: { table: "teachers", foreignKey: "id", thisKey: "teacherId", isMany: false },
    exam: { table: "exams", foreignKey: "id", thisKey: "examId", isMany: false },
  },
  classFeeSetting: {
    class: { table: "school_classes", foreignKey: "id", thisKey: "classId", isMany: false },
  },
  payment: {
    student: { table: "students", foreignKey: "id", thisKey: "studentId", isMany: false },
  },
  schoolSetting: {},
};

const JSON_COLUMNS = new Set(["weekendDays", "customHolidayDates"]);

const NUMERIC_COLUMNS = new Set([
  "capacity",
  "salary",
  "score",
  "maxScore",
  "passScore",
  "failScore",
  "amount",
  "originalAmount",
  "discountAmount",
  "discountPercent",
  "finalAmount",
  "tuitionAmount",
  "uniformAmount",
]);

function getTableModelName(tableName: string): string {
  for (const [model, table] of Object.entries(MODEL_TO_TABLE)) {
    if (table === tableName) return model;
  }
  return tableName.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function qid(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function qtable(table: string): string {
  return qid(table);
}

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `cl${timestamp}${random}`;
}

function normalizeRow(row: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = { ...row };
  for (const [key, value] of Object.entries(normalized)) {
    if (value === null || value === undefined) continue;
    if (NUMERIC_COLUMNS.has(key)) normalized[key] = Number(value);
    if (Array.isArray(value)) normalized[key] = value.map((item) =>
      typeof item === "object" && item !== null ? normalizeRow(item) : item,
    );
    if (typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) {
      normalized[key] = normalizeRow(value);
    }
  }
  return normalized;
}

function getTruthySelectKeys(select?: Record<string, any>): string[] {
  if (!select) return [];
  return Object.entries(select)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key);
}

class SqlBuilder {
  values: any[] = [];

  param(value: any): string {
    this.values.push(value instanceof Date ? value : value);
    return `$${this.values.length}`;
  }

  params(values: any[]): string {
    return values.map((value) => this.param(value)).join(", ");
  }
}

function isPlainObject(value: any): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function buildWhereSql(model: string, where: Record<string, any> | undefined, builder: SqlBuilder): string {
  if (!where || Object.keys(where).length === 0) return "";
  const parts: string[] = [];
  const relations = RELATION_MAP[model] || {};

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    if (key === "AND" && Array.isArray(value)) {
      const nested = value.map((item) => buildWhereSql(model, item, builder)).filter(Boolean);
      if (nested.length > 0) parts.push(`(${nested.join(" AND ")})`);
      continue;
    }

    if (key === "OR" && Array.isArray(value)) {
      const nested = value.map((item) => buildWhereSql(model, item, builder)).filter(Boolean);
      if (nested.length > 0) parts.push(`(${nested.join(" OR ")})`);
      continue;
    }

    const relation = relations[key];
    if (relation && isPlainObject(value)) {
      const relationModel = getTableModelName(relation.table);

      if (relation.isMany && ("some" in value || "none" in value)) {
        if (value.some !== undefined) {
          const childWhere = buildWhereSql(relationModel, value.some, builder);
          parts.push(
            `${qid(relation.thisKey)} IN (SELECT ${qid(relation.foreignKey)} FROM ${qtable(relation.table)}${childWhere ? ` WHERE ${childWhere}` : ""})`,
          );
        }

        if (value.none !== undefined) {
          const childWhere = buildWhereSql(relationModel, value.none, builder);
          parts.push(
            `${qid(relation.thisKey)} NOT IN (SELECT ${qid(relation.foreignKey)} FROM ${qtable(relation.table)}${childWhere ? ` WHERE ${childWhere}` : ""})`,
          );
        }

        continue;
      }

      const childWhere = buildWhereSql(relationModel, value, builder);
      if (childWhere) {
        if (relation.isMany) {
          parts.push(`${qid(relation.thisKey)} IN (SELECT ${qid(relation.foreignKey)} FROM ${qtable(relation.table)} WHERE ${childWhere})`);
        } else {
          parts.push(`${qid(relation.thisKey)} IN (SELECT ${qid(relation.foreignKey)} FROM ${qtable(relation.table)} WHERE ${childWhere})`);
        }
      }
      continue;
    }

    if (value === null) {
      parts.push(`${qid(key)} IS NULL`);
      continue;
    }

    if (isPlainObject(value)) {
      const sub: string[] = [];
      if (value.equals !== undefined) sub.push(`${qid(key)} = ${builder.param(value.equals)}`);
      if (value.eq !== undefined) sub.push(`${qid(key)} = ${builder.param(value.eq)}`);
      if (value.ne !== undefined) sub.push(`${qid(key)} <> ${builder.param(value.ne)}`);
      if (value.gt !== undefined) sub.push(`${qid(key)} > ${builder.param(value.gt)}`);
      if (value.gte !== undefined) sub.push(`${qid(key)} >= ${builder.param(value.gte)}`);
      if (value.lt !== undefined) sub.push(`${qid(key)} < ${builder.param(value.lt)}`);
      if (value.lte !== undefined) sub.push(`${qid(key)} <= ${builder.param(value.lte)}`);
      if (value.contains !== undefined) sub.push(`${qid(key)} ILIKE ${builder.param(`%${value.contains}%`)}`);
      if (value.startsWith !== undefined) sub.push(`${qid(key)} ILIKE ${builder.param(`${value.startsWith}%`)}`);
      if (value.in !== undefined) {
        const list = Array.isArray(value.in) ? value.in.filter((item) => item !== undefined) : [value.in];
        sub.push(list.length === 0 ? "FALSE" : `${qid(key)} IN (${builder.params(list)})`);
      }
      if (value.not !== undefined) {
        if (value.not === null) sub.push(`${qid(key)} IS NOT NULL`);
        else sub.push(`${qid(key)} <> ${builder.param(value.not)}`);
      }
      if (sub.length > 0) parts.push(`(${sub.join(" AND ")})`);
      continue;
    }

    parts.push(`${qid(key)} = ${builder.param(value)}`);
  }

  return parts.join(" AND ");
}

function buildOrderSql(orderBy: any): string {
  if (!orderBy) return "";
  const entries = Array.isArray(orderBy)
    ? orderBy.flatMap((item) => Object.entries(item))
    : Object.entries(orderBy);

  const parts = entries
    .filter(([key, direction]) => typeof key === "string" && (direction === "asc" || direction === "desc"))
    .map(([key, direction]) => `${qid(key)} ${direction === "desc" ? "DESC" : "ASC"} NULLS LAST`);

  return parts.length ? ` ORDER BY ${parts.join(", ")}` : "";
}

function prepareWriteData(data: Record<string, any>, table: string): Record<string, any> {
  const prepared: Record<string, any> = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (value === undefined) continue;
    if (isPlainObject(value) && (value.create || value.connect || value.set)) continue;
    prepared[key] = JSON_COLUMNS.has(key) && Array.isArray(value) ? JSON.stringify(value) : value;
  }

  if (!prepared.id && table !== "school_settings") prepared.id = generateId();
  const now = new Date();
  if (!prepared.createdAt && table !== "admin_sessions") prepared.createdAt = now;
  if (!prepared.updatedAt && table !== "admin_sessions") prepared.updatedAt = now;
  return prepared;
}

function splitNestedWrites(model: string, data: Record<string, any>) {
  const scalarData: Record<string, any> = {};
  const nestedCreates: Array<{ relationName: string; relation: RelationInfo; rows: Record<string, any>[] }> = [];
  const relations = RELATION_MAP[model] || {};

  for (const [key, value] of Object.entries(data || {})) {
    const relation = relations[key];
    if (relation && isPlainObject(value) && value.create !== undefined) {
      const rows = Array.isArray(value.create) ? value.create : [value.create];
      nestedCreates.push({ relationName: key, relation, rows: rows.filter(Boolean) });
      continue;
    }
    scalarData[key] = value;
  }

  return { scalarData, nestedCreates };
}

function toPrismaLikeError(error: any): Error & { code?: string; meta?: Record<string, any> } {
  const prismaError: Error & { code?: string; meta?: Record<string, any> } = new Error(error?.message || "Database operation failed");
  if (error?.code === "23505") {
    prismaError.code = "P2002";
    prismaError.meta = { target: error?.constraint ? [error.constraint] : [] };
  }
  return prismaError;
}

class PostgresModelHandler {
  constructor(
    private readonly model: string,
    private readonly table: string,
    private readonly exec: QueryExecutor,
  ) {}

  private handlerForModel(model: string) {
    return new PostgresModelHandler(model, MODEL_TO_TABLE[model], this.exec);
  }

  async findMany(args: Record<string, any> = {}): Promise<any[]> {
    const builder = new SqlBuilder();
    const selectedKeys = getTruthySelectKeys(args.select);
    const columns = selectedKeys.length > 0 ? selectedKeys.map(qid).join(", ") : "*";
    const whereSql = buildWhereSql(this.model, args.where, builder);
    const orderSql = buildOrderSql(args.orderBy);
    const limitSql = Number.isFinite(Number(args.take)) ? ` LIMIT ${Math.max(0, Number(args.take))}` : "";
    const offsetSql = Number.isFinite(Number(args.skip)) ? ` OFFSET ${Math.max(0, Number(args.skip))}` : "";
    const sql = `SELECT ${columns} FROM ${qtable(this.table)}${whereSql ? ` WHERE ${whereSql}` : ""}${orderSql}${limitSql}${offsetSql}`;

    const result = await this.exec(sql, builder.values);
    const rows = result.rows.map(normalizeRow);
    const withRelations = await this.processResults(rows, args.include);
    return args.select ? withRelations.map((row) => this.applySelect(row, args.select)) : withRelations;
  }

  async findFirst(args: Record<string, any> = {}): Promise<any | null> {
    const rows = await this.findMany({ ...args, take: 1 });
    return rows[0] ?? null;
  }

  async findUnique(args: Record<string, any>): Promise<any | null> {
    return this.findFirst(args);
  }

  async count(args: Record<string, any> = {}): Promise<number> {
    const builder = new SqlBuilder();
    const whereSql = buildWhereSql(this.model, args.where, builder);
    const sql = `SELECT COUNT(*)::int AS count FROM ${qtable(this.table)}${whereSql ? ` WHERE ${whereSql}` : ""}`;
    const result = await this.exec(sql, builder.values);
    return Number(result.rows[0]?.count ?? 0);
  }

  async aggregate(args: Record<string, any> = {}): Promise<any> {
    const rows = await this.findMany({ where: args.where, select: this.getAggregateSelect(args) });
    const result: Record<string, any> = {};

    if (args._sum) {
      result._sum = {};
      for (const key of Object.keys(args._sum)) {
        result._sum[key] = rows.reduce((sum: number, row: any) => sum + (Number(row[key]) || 0), 0);
      }
    }

    if (args._avg) {
      result._avg = {};
      for (const key of Object.keys(args._avg)) {
        const values = rows.map((row: any) => Number(row[key])).filter((value: number) => Number.isFinite(value));
        result._avg[key] = values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null;
      }
    }

    if (args._count) {
      if (typeof args._count === "object") {
        result._count = {};
        for (const key of Object.keys(args._count)) {
          result._count[key] = rows.filter((row: any) => row[key] !== null && row[key] !== undefined).length;
        }
      } else {
        result._count = rows.length;
      }
    }

    if (args._min) {
      result._min = {};
      for (const key of Object.keys(args._min)) {
        const values = rows.map((row: any) => row[key]).filter((value: any) => value !== null && value !== undefined);
        result._min[key] = values.length ? values.sort()[0] : null;
      }
    }

    if (args._max) {
      result._max = {};
      for (const key of Object.keys(args._max)) {
        const values = rows.map((row: any) => row[key]).filter((value: any) => value !== null && value !== undefined);
        result._max[key] = values.length ? values.sort().reverse()[0] : null;
      }
    }

    return result;
  }

  private getAggregateSelect(args: Record<string, any>) {
    const select: Record<string, boolean> = { id: true };
    for (const group of [args._sum, args._avg, args._min, args._max]) {
      if (group) Object.keys(group).forEach((key) => { select[key] = true; });
    }
    if (typeof args._count === "object") {
      Object.keys(args._count).forEach((key) => { select[key] = true; });
    }
    return select;
  }

  async create(args: { data: Record<string, any>; include?: Record<string, any> }): Promise<any> {
    const { scalarData, nestedCreates } = splitNestedWrites(this.model, args.data);
    const data = prepareWriteData(scalarData, this.table);
    const keys = Object.keys(data);
    const builder = new SqlBuilder();
    const sql = `INSERT INTO ${qtable(this.table)} (${keys.map(qid).join(", ")}) VALUES (${keys.map((key) => builder.param(data[key])).join(", ")}) RETURNING *`;

    try {
      const result = await this.exec(sql, builder.values);
      const created = normalizeRow(result.rows[0]);
      await this.createNestedRows(created, nestedCreates);
      return this.processResult(created, args.include);
    } catch (error) {
      throw toPrismaLikeError(error);
    }
  }

  async createMany(args: { data: Record<string, any>[] }): Promise<{ count: number }> {
    if (!args.data || args.data.length === 0) return { count: 0 };
    let count = 0;
    for (const item of args.data) {
      await this.create({ data: item });
      count += 1;
    }
    return { count };
  }

  async update(args: { where: Record<string, any>; data: Record<string, any>; include?: Record<string, any> }): Promise<any> {
    const existing = await this.findFirst({ where: args.where, select: { id: true } });
    if (!existing) return null;

    const { scalarData, nestedCreates } = splitNestedWrites(this.model, args.data);
    const data = prepareWriteData(this.table === "admin_sessions" ? scalarData : { ...scalarData, updatedAt: new Date() }, this.table);
    delete data.id;
    delete data.createdAt;

    const keys = Object.keys(data);
    if (keys.length > 0) {
      const builder = new SqlBuilder();
      const setSql = keys.map((key) => `${qid(key)} = ${builder.param(data[key])}`).join(", ");
      const whereSql = buildWhereSql(this.model, { id: existing.id }, builder);
      const sql = `UPDATE ${qtable(this.table)} SET ${setSql} WHERE ${whereSql}`;
      try {
        await this.exec(sql, builder.values);
      } catch (error) {
        throw toPrismaLikeError(error);
      }
    }

    const updated = await this.findUnique({ where: { id: existing.id } });
    if (updated) await this.createNestedRows(updated, nestedCreates);
    return this.processResult(updated, args.include);
  }

  async updateMany(args: { where?: Record<string, any>; data: Record<string, any> }): Promise<{ count: number }> {
    const data = prepareWriteData(this.table === "admin_sessions" ? args.data : { ...args.data, updatedAt: new Date() }, this.table);
    delete data.id;
    delete data.createdAt;
    const keys = Object.keys(data);
    if (keys.length === 0) return { count: 0 };
    const builder = new SqlBuilder();
    const setSql = keys.map((key) => `${qid(key)} = ${builder.param(data[key])}`).join(", ");
    const whereSql = buildWhereSql(this.model, args.where, builder);
    const sql = `UPDATE ${qtable(this.table)} SET ${setSql}${whereSql ? ` WHERE ${whereSql}` : ""}`;
    const result = await this.exec(sql, builder.values);
    return { count: result.rowCount ?? 0 };
  }

  async delete(args: { where: Record<string, any> }): Promise<any> {
    const builder = new SqlBuilder();
    const whereSql = buildWhereSql(this.model, args.where, builder);
    const sql = `DELETE FROM ${qtable(this.table)}${whereSql ? ` WHERE ${whereSql}` : ""} RETURNING *`;
    const result = await this.exec(sql, builder.values);
    return result.rows[0] ? normalizeRow(result.rows[0]) : null;
  }

  async deleteMany(args: { where?: Record<string, any> } = {}): Promise<{ count: number }> {
    const builder = new SqlBuilder();
    const whereSql = buildWhereSql(this.model, args.where, builder);
    const sql = `DELETE FROM ${qtable(this.table)}${whereSql ? ` WHERE ${whereSql}` : ""}`;
    const result = await this.exec(sql, builder.values);
    return { count: result.rowCount ?? 0 };
  }

  private async createNestedRows(
    parent: Record<string, any>,
    nestedCreates: Array<{ relationName: string; relation: RelationInfo; rows: Record<string, any>[] }>,
  ) {
    for (const nested of nestedCreates) {
      if (!nested.relation.isMany || nested.rows.length === 0) continue;
      const parentKeyValue = parent[nested.relation.thisKey] ?? parent.id;
      if (!parentKeyValue) continue;
      const childModel = getTableModelName(nested.relation.table);
      const child = this.handlerForModel(childModel);
      for (const row of nested.rows) {
        await child.create({
          data: {
            ...row,
            [nested.relation.foreignKey]: parentKeyValue,
          },
        });
      }
    }
  }

  private async processResult(row: any, include?: Record<string, any>) {
    if (!row) return null;
    const [result] = await this.processResults([row], include);
    return result ?? null;
  }

  private async processResults(rows: Record<string, any>[], include?: Record<string, any>): Promise<any[]> {
    const results = rows.map((row) => normalizeRow(row));
    if (!include || results.length === 0) return results;

    const relations = RELATION_MAP[this.model] || {};

    if (include._count) {
      const countSelect = include._count.select || {};
      for (const [relationName, enabled] of Object.entries(countSelect)) {
        if (!enabled) continue;
        const relation = relations[relationName];
        if (!relation) continue;
        const parentValues = Array.from(new Set(results.map((row) => row[relation.thisKey]).filter(Boolean)));
        const counts = new Map<string, number>();
        if (parentValues.length > 0) {
          const builder = new SqlBuilder();
          const sql = `SELECT ${qid(relation.foreignKey)} AS key, COUNT(*)::int AS count FROM ${qtable(relation.table)} WHERE ${qid(relation.foreignKey)} IN (${builder.params(parentValues)}) GROUP BY ${qid(relation.foreignKey)}`;
          const result = await this.exec(sql, builder.values);
          for (const row of result.rows) counts.set(String(row.key), Number(row.count));
        }
        for (const row of results) {
          row._count = row._count || {};
          row._count[relationName] = counts.get(String(row[relation.thisKey])) || 0;
        }
      }
    }

    for (const [relationName, value] of Object.entries(include)) {
      if (relationName === "_count" || !value) continue;
      const relation = relations[relationName];
      if (!relation) continue;
      const childModel = getTableModelName(relation.table);
      const child = this.handlerForModel(childModel);
      const includeArgs = isPlainObject(value) ? value : {};

      if (relation.isMany) {
        const parentValues = Array.from(new Set(results.map((row) => row[relation.thisKey]).filter(Boolean)));
        const childRows = parentValues.length
          ? await child.findMany({
              where: {
                ...(includeArgs.where || {}),
                [relation.foreignKey]: { in: parentValues },
              },
              include: includeArgs.include,
              select: includeArgs.select ? { ...includeArgs.select, [relation.foreignKey]: true } : undefined,
              orderBy: includeArgs.orderBy,
              take: includeArgs.take,
            })
          : [];
        const map = new Map<string, any[]>();
        for (const childRow of childRows) {
          const key = String(childRow[relation.foreignKey]);
          const list = map.get(key) || [];
          list.push(childRow);
          map.set(key, list);
        }
        for (const row of results) {
          row[relationName] = map.get(String(row[relation.thisKey])) || [];
        }
      } else {
        const parentValues = Array.from(new Set(results.map((row) => row[relation.thisKey]).filter(Boolean)));
        const childRows = parentValues.length
          ? await child.findMany({
              where: {
                ...(includeArgs.where || {}),
                [relation.foreignKey]: { in: parentValues },
              },
              include: includeArgs.include,
              select: includeArgs.select ? { ...includeArgs.select, [relation.foreignKey]: true } : undefined,
              orderBy: includeArgs.orderBy,
            })
          : [];
        const map = new Map<string, any>();
        for (const childRow of childRows) {
          map.set(String(childRow[relation.foreignKey]), childRow);
        }
        for (const row of results) {
          row[relationName] = map.get(String(row[relation.thisKey])) ?? null;
        }
      }
    }

    return results;
  }

  private applySelect(row: Record<string, any>, select: Record<string, any>) {
    const selected: Record<string, any> = {};
    for (const [key, enabled] of Object.entries(select)) {
      if (enabled) selected[key] = row[key];
    }
    return selected;
  }
}

function createDb(exec: QueryExecutor) {
  const db: Record<string, any> = {};
  for (const [model, table] of Object.entries(MODEL_TO_TABLE)) {
    db[model] = new PostgresModelHandler(model, table, exec);
  }

  db.$connect = async () => {
    await exec("SELECT 1");
  };

  db.$disconnect = async () => undefined;

  db.$queryRaw = async (text: string, values?: any[]) => {
    const result = await exec(text, values || []);
    return result.rows;
  };

  db.$executeRawUnsafe = async (text: string, ...values: any[]) => {
    const result = await exec(text, values);
    return result.rowCount || 0;
  };

  db.$transaction = async (fn: (tx: any) => Promise<any>) => {
    const pool = getPool();
    const client = await pool.connect();
    const txExec: QueryExecutor = (text, values = []) => client.query(text, values);
    const txDb = createDb(txExec);
    try {
      await client.query("BEGIN");
      const result = await fn(txDb);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  };

  return db;
}

export function hasDatabaseConfig(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDatabaseConfigErrorMessage(): string {
  return "إعدادات قاعدة البيانات غير مكتملة. أضف DATABASE_URL في إعدادات Vercel أو ملف البيئة ثم أعد التشغيل.";
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(getDatabaseConfigErrorMessage());
  }

  if (!globalForPg.schoolProPool) {
    globalForPg.schoolProPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 10_000,
    });
  }

  return globalForPg.schoolProPool;
}

const rootExec: QueryExecutor = (text, values = []) => getPool().query(text, values);

export const postgresDB = createDb(rootExec) as any;

export async function closePostgresPool() {
  if (globalForPg.schoolProPool) {
    await globalForPg.schoolProPool.end();
    globalForPg.schoolProPool = undefined;
  }
}
