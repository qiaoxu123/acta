// One-off: re-map existing students to the new category/grade/school taxonomy
// and insert the newly-mentioned advisees. Run AFTER migration 0017 has been
// applied by the app (columns category/grade/school must exist).
//
//   node scripts/update_students_2026.mjs
//
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

const DB = "/Users/xqiao/Library/Application Support/io.github.qiaoxu123.acta/acta.db";
const db = new DatabaseSync(DB);
const now = () => new Date().toISOString();

// Guard: columns must exist (migration applied).
const cols = db.prepare("PRAGMA table_info(students)").all().map((c) => c.name);
for (const c of ["category", "grade", "school"]) {
  if (!cols.includes(c)) {
    console.error(`Column "${c}" missing — launch the app once to apply migration 0017 first.`);
    process.exit(1);
  }
}

// --- Updates to existing rows (match by name) ---
const updates = {
  "丘宇航": { category: "incoming", grade: "准研一", level: "master", status: "agreed",
    school: "吉林大学 卓越工程师学院", enrollment_year: "2026" },
  "刘菁蕊": { category: "rec_applicant", grade: "大四", level: "bachelor", status: "agreed",
    school: "中国矿业大学 人工智能" },
  "李俊杰": { category: "rec_applicant", grade: "大四", level: "bachelor", status: "pending",
    school: "南京林业大学 人工智能" },
  "朱烁杰": { category: "rec_applicant", grade: "大四", level: "bachelor", status: "pending",
    school: "河南师范大学 计算机科学与技术" },
  "匡书函": { category: "rec_applicant", grade: "大四", level: "bachelor", status: "pending",
    school: "沈阳师范大学 计算机科学与技术" },
  "洪澍雨": { category: "rec_applicant", grade: "大四", level: "bachelor", status: "pending",
    school: "中北大学 计算机科学与技术" },
  "李思凝": { category: "rec_applicant", grade: "大四", level: "bachelor", status: "pending",
    school: "青海师范大学 计算机科学与技术" },
  "陈楠": { category: "assistant", grade: "大三", level: "bachelor", status: "active",
    school: "吉林大学 软件学院", direction: "无人机通信与网络",
    notes: "吉林大学软件学院 2023 级大三（本校生），GPA 3.785/4.0。在组任科研助理，准备保研外校。2026-03-25 发来自荐。" },
};

const updStmt = (patch) => {
  const keys = Object.keys(patch);
  return `UPDATE students SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ?, sync_status = 'dirty' WHERE name = ? AND deleted_at IS NULL`;
};

for (const [name, patch] of Object.entries(updates)) {
  const sql = updStmt(patch);
  const vals = [...Object.values(patch), now(), name];
  const info = db.prepare(sql).run(...vals);
  console.log(`update ${name}: ${info.changes} row(s)`);
}

// --- New rows ---
const inserts = [
  { name: "刘爽", category: "incoming", grade: "准研一", level: "master", status: "agreed",
    enrollment_year: "2026", notes: "2026 级准研一，暑假后正式入学。" },
  { name: "丁洪峰", category: "incoming", grade: "准研一", level: "master", status: "agreed",
    enrollment_year: "2026", notes: "2026 级准研一，暑假后正式入学。" },
  { name: "秦叶天", category: "assistant", grade: "大二", level: "bachelor", status: "active",
    notes: "大二，在组任科研助理，正在准备考试。" },
  { name: "宋枰儒", category: "assistant", grade: "大二", level: "bachelor", status: "active",
    notes: "大二，在组任科研助理，正在准备考试。" },
  { name: "林泰来", category: "rec_applicant", grade: "大四", level: "bachelor", status: "agreed",
    notes: "保研推免，已同意。" },
  { name: "房禹龙", category: "phd_applicant", grade: null, level: "master", status: "declined",
    enrollment_year: "2027", notes: "希望申请 2027 年博士，因当年无博士招生名额，只能放弃。" },
];

const FIELDS = [
  "id", "name", "category", "level", "grade", "school", "status", "email", "phone",
  "direction", "co_advisor", "enrollment_year", "graduation_year", "exam_date",
  "interview_date", "notes", "created_at", "updated_at", "sync_status", "owner_id",
];

const insStmt = db.prepare(
  `INSERT INTO students (${FIELDS.join(", ")}) VALUES (${FIELDS.map(() => "?").join(", ")})`,
);

for (const r of inserts) {
  // 林泰来 may already be created via the update map (it isn't — only updates existing). Skip if a row already exists.
  const existing = db.prepare("SELECT id FROM students WHERE name = ? AND deleted_at IS NULL").get(r.name);
  if (existing) { console.log(`skip insert ${r.name}: already exists`); continue; }
  const ts = now();
  const row = {
    id: randomUUID(), name: r.name, category: r.category, level: r.level,
    grade: r.grade ?? null, school: r.school ?? null, status: r.status,
    email: r.email ?? null, phone: r.phone ?? null, direction: r.direction ?? null,
    co_advisor: r.co_advisor ?? null, enrollment_year: r.enrollment_year ?? null,
    graduation_year: r.graduation_year ?? null, exam_date: r.exam_date ?? null,
    interview_date: r.interview_date ?? null, notes: r.notes ?? null,
    created_at: ts, updated_at: ts, sync_status: "dirty", owner_id: "xqiao",
  };
  insStmt.run(...FIELDS.map((f) => row[f]));
  console.log(`insert ${r.name}`);
}

console.log("\n--- Final roster ---");
const all = db.prepare(
  "SELECT name, category, grade, status, school FROM students WHERE deleted_at IS NULL ORDER BY category, name",
).all();
for (const r of all) console.log(`${r.category.padEnd(14)} ${r.status.padEnd(10)} ${(r.grade||'').padEnd(8)} ${r.name}  ${r.school||''}`);
console.log(`\ntotal: ${all.length}`);
