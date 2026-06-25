import { select } from "../client";
import { insert, softDelete, update } from "../mutate";

export type FileKind = "resume" | "transcript" | "attachment" | "other";

export interface StudentFile {
  id: string;
  student_id: string;
  name: string;
  kind: string;
  rel_path: string;
  size: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: string;
  owner_id: string;
}

export async function listStudentFiles(studentId: string): Promise<StudentFile[]> {
  return select<StudentFile>(
    `SELECT * FROM student_files WHERE student_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC`,
    [studentId],
  );
}

export interface StudentFileInput {
  student_id: string;
  name: string;
  kind: FileKind;
  rel_path: string;
  size: number | null;
  note?: string | null;
}

export function addStudentFile(data: StudentFileInput): Promise<string> {
  // Metadata rows sync via the snapshot (in ALL_TABLES); the physical bytes are
  // reconciled separately through the transport's blob endpoints, keyed by
  // rel_path. owner_id is stamped explicitly so it's set even pre-login.
  return insert("student_files", { ...data, note: data.note ?? null, owner_id: "xqiao" });
}

export function updateStudentFileKind(id: string, kind: FileKind): Promise<void> {
  return update("student_files", id, { kind });
}

export function deleteStudentFile(id: string): Promise<void> {
  return softDelete("student_files", id);
}
