import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, Textarea } from "@/components/ui/controls";
import { createIdeaLog } from "@/db/repositories/ideas";
import type { IdeaLogKind } from "@/db/types";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

const KINDS: IdeaLogKind[] = ["note", "finding", "decision", "progress"];

export function IdeaLogForm({
  open,
  ideaId,
  onClose,
}: {
  open: boolean;
  ideaId: string;
  onClose: () => void;
}) {
  const bump = useRefresh((s) => s.bump);
  const { t } = useI18n();
  const [kind, setKind] = useState<IdeaLogKind>("note");
  const [body, setBody] = useState("");

  const save = async () => {
    if (!body.trim()) return;
    await createIdeaLog({ idea_id: ideaId, kind, body: body.trim() });
    bump();
    setKind("note");
    setBody("");
    onClose();
  };

  return (
    <Modal
      open={open}
      title={t("ilogf.new")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="primary" onClick={save}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t("ilogf.kind")}>
          <Select value={kind} onChange={(e) => setKind(e.target.value as IdeaLogKind)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`ilogkind.${k}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("ilogf.body")}>
          <Textarea
            autoFocus
            rows={5}
            placeholder={t("ilogf.bodyHint")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
