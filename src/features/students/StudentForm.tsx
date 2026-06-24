import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, TextInput, Textarea } from "@/components/ui/controls";
import { createStudent, updateStudent } from "@/db/repositories/students";
import type { Student } from "@/db/repositories/students";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

const LEVELS = ["bachelor", "master", "phd"] as const;
const STATUSES = ["applying", "active", "graduated", "transferred"] as const;

export function StudentForm({ open, existing, onClose, onSaved }: {
  open: boolean; existing?: Student | null; onClose: () => void; onSaved?: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [level, setLevel] = useState<string>("master");
  const [status, setStatus] = useState<string>("active");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [direction, setDirection] = useState("");
  const [coAdvisor, setCoAdvisor] = useState("");
  const [enroll, setEnroll] = useState("");
  const [grad, setGrad] = useState("");
  const [exam, setExam] = useState("");
  const [interview, setInterview] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(existing?.name ?? "");
    setLevel(existing?.level ?? "master");
    setStatus(existing?.status ?? "active");
    setEmail(existing?.email ?? "");
    setPhone(existing?.phone ?? "");
    setDirection(existing?.direction ?? "");
    setCoAdvisor(existing?.co_advisor ?? "");
    setEnroll(existing?.enrollment_year ?? "");
    setGrad(existing?.graduation_year ?? "");
    setExam(existing?.exam_date ?? "");
    setInterview(existing?.interview_date ?? "");
    setNotes(existing?.notes ?? "");
  }, [open, existing]);

  const save = async () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(), level, status,
      email: email.trim() || null, phone: phone.trim() || null,
      direction: direction.trim() || null, co_advisor: coAdvisor.trim() || null,
      enrollment_year: enroll || null, graduation_year: grad || null,
      exam_date: exam || null, interview_date: interview || null,
      notes: notes.trim() || null,
    };
    if (existing) { await updateStudent(existing.id, data); } else { await createStudent(data); }
    useRefresh.getState().bump(); onSaved?.(); onClose();
  };

  return (
    <Modal open={open} title={existing ? t("students.edit") : t("students.new")} onClose={onClose}
      footer={<><Button onClick={onClose}>{t("common.cancel")}</Button><Button variant="primary" onClick={save}>{t("common.save")}</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("stu.name")}><TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label={t("stu.level")}>
            <Select value={level} onChange={(e) => setLevel(e.target.value)}>
              {LEVELS.map((l) => <option key={l} value={l}>{t(`stu.level.${l}`)}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("stu.email")}><TextInput value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label={t("stu.phone")}><TextInput value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("stu.direction")}><TextInput value={direction} onChange={(e) => setDirection(e.target.value)} /></Field>
          <Field label={t("stu.coAdvisor")}><TextInput value={coAdvisor} onChange={(e) => setCoAdvisor(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("col.status")}>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`stu.status.${s}`)}</option>)}</Select></Field>
          <Field label={t("stu.enrollment")}><TextInput value={enroll} placeholder="YYYY" onChange={(e) => setEnroll(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("stu.exam")}><TextInput type="date" value={exam} onChange={(e) => setExam(e.target.value)} /></Field>
          <Field label={t("stu.interview")}><TextInput type="date" value={interview} onChange={(e) => setInterview(e.target.value)} /></Field>
        </div>
        <Field label={t("stu.notes")}><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
