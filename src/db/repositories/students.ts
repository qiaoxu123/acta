import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import { scopeWhere, type ListScope, type SyncFields } from "../types";

// Primary role bucket — drives the main list grouping.
export type StudentCategory =
  | "incoming"       // 准研一：已录取待入学
  | "master"         // 在读硕士
  | "phd"            // 在读博士
  | "assistant"      // 科研助理（本科在组）
  | "rec_applicant"  // 保研推免申请
  | "phd_applicant"  // 博士申请
  | "graduated";     // 已毕业

// Progress / decision state.
export type StudentStatus =
  | "pending"      // 待回复 / 沟通中
  | "agreed"       // 已同意 / 已录取
  | "active"       // 在读 / 在组
  | "declined"     // 已放弃 / 婉拒
  | "graduated"    // 已毕业
  | "transferred"; // 已离组

export interface Student extends SyncFields {
  name: string;
  category: string;                // StudentCategory — primary role bucket
  level: string;                   // "bachelor" | "master" | "phd" — academic level
  grade: string | null;            // 年级标签：大二 / 大三 / 准研一 / 研一 / 博一 …
  school: string | null;           // 院校（申请者尤其重要）
  status: string;                  // StudentStatus — progress / decision
  email: string | null;
  phone: string | null;
  direction: string | null;        // research direction
  co_advisor: string | null;
  enrollment_year: string | null;  // YYYY
  graduation_year: string | null;  // YYYY
  exam_date: string | null;        // YYYY-MM-DD (考研初试)
  interview_date: string | null;   // YYYY-MM-DD (复试/保研面试)
  notes: string | null;
  archived_at: string | null;
}

const LIVE = "deleted_at IS NULL";

// Display / grouping order for categories.
export const CATEGORY_ORDER: StudentCategory[] = [
  "incoming", "master", "phd", "assistant", "rec_applicant", "phd_applicant", "graduated",
];

export async function listStudents(scope: ListScope = "active"): Promise<Student[]> {
  return select<Student>(
    `SELECT * FROM students WHERE ${LIVE} ${scopeWhere(scope)} ORDER BY enrollment_year DESC, name ASC`,
  );
}

export async function getStudent(id: string): Promise<Student | null> {
  const rows = await select<Student>(`SELECT * FROM students WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export type StudentInput = Omit<Student, keyof SyncFields | "archived_at">;

export function createStudent(data: StudentInput): Promise<string> {
  return insert("students", data);
}
export function updateStudent(id: string, patch: Partial<StudentInput>): Promise<void> {
  return update("students", id, patch);
}
export function deleteStudent(id: string): Promise<void> {
  return softDelete("students", id);
}
