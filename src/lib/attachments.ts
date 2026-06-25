import { open } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, mkdir, remove, exists, BaseDirectory } from "@tauri-apps/plugin-fs";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { appDataDir, basename, join } from "@tauri-apps/api/path";
import { newId } from "./ids";

const ROOT = "attachments/students";

export interface PickedFile {
  name: string;
  rel_path: string;
  size: number;
}

/**
 * Copy the given absolute file paths into the app data dir under
 * attachments/students/<studentId>/ and return metadata for DB rows. The
 * originals are left untouched. Shared by the picker and drag-and-drop.
 */
export async function storeFilePaths(studentId: string, paths: string[]): Promise<PickedFile[]> {
  if (paths.length === 0) return [];
  const dir = `${ROOT}/${studentId}`;
  await mkdir(dir, { baseDir: BaseDirectory.AppData, recursive: true });

  const out: PickedFile[] = [];
  for (const src of paths) {
    const bytes = await readFile(src); // absolute path, allowed by $HOME scope
    const base = await basename(src);
    const rel = `${dir}/${newId()}__${base}`;
    await writeFile(rel, bytes, { baseDir: BaseDirectory.AppData });
    out.push({ name: base, rel_path: rel, size: bytes.byteLength });
  }
  return out;
}

/** Let the user pick one or more files via the OS dialog, then store them. */
export async function pickStudentFiles(studentId: string): Promise<PickedFile[]> {
  const sel = await open({ multiple: true, title: "选择要附加的文件" });
  if (!sel) return [];
  return storeFilePaths(studentId, Array.isArray(sel) ? sel : [sel]);
}

async function absPath(rel: string): Promise<string> {
  return join(await appDataDir(), rel);
}

/** Open a stored file with the OS default application. */
export async function openStudentFile(rel: string): Promise<void> {
  await openPath(await absPath(rel));
}

/** Reveal a stored file in Finder / Explorer. */
export async function revealStudentFile(rel: string): Promise<void> {
  await revealItemInDir(await absPath(rel));
}

/** Delete the physical copy (best-effort — the DB row is removed separately). */
export async function removeStudentFile(rel: string): Promise<void> {
  try {
    await remove(rel, { baseDir: BaseDirectory.AppData });
  } catch {
    /* file may already be gone */
  }
}

// --- Blob sync helpers (keyed by rel_path under AppData) ---

export async function storedFileExists(rel: string): Promise<boolean> {
  try {
    return await exists(rel, { baseDir: BaseDirectory.AppData });
  } catch {
    return false;
  }
}

export async function readStoredFile(rel: string): Promise<Uint8Array> {
  return readFile(rel, { baseDir: BaseDirectory.AppData });
}

/** Write bytes pulled from the server into the local store, creating dirs. */
export async function writeStoredFile(rel: string, bytes: Uint8Array): Promise<void> {
  const dir = rel.split("/").slice(0, -1).join("/");
  if (dir) await mkdir(dir, { baseDir: BaseDirectory.AppData, recursive: true });
  await writeFile(rel, bytes, { baseDir: BaseDirectory.AppData });
}

export function humanSize(bytes: number | null): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
