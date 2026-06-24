import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import { scopeWhere, type ListScope, type SyncFields } from "../types";

export interface Student extends SyncFields {
  name: string;
  level: string; // "bachelor" | "master" | "phd"
  status: string; // "applying" | "active" | "graduated" | "transferred"
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

export async function listStudents(scope: ListScope = "active"): Promise<Student[]> {
  return select<Student>(
    `SELECT * FROM students WHERE ${LIVE} ${scopeWhere(scope)} ORDER BY level DESC, enrollment_year DESC, name ASC`,
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
