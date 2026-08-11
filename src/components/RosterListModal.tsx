"use client";

import { useState } from "react";
import type { AppState } from "@/lib/types";
import { sortedRoster } from "@/lib/state-helpers";

export type RosterListMode = "export" | "import" | null;

export default function RosterListModal({
  mode,
  onClose,
  state,
  onImport,
  showToast,
}: {
  mode: RosterListMode;
  onClose: () => void;
  state: AppState;
  onImport: (names: string[]) => Promise<{ added: number; skipped: string[] }>;
  showToast: (msg: string, isError?: boolean) => void;
}) {
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  if (!mode) return null;

  const exportText = sortedRoster(state).map((p) => p.name).join("\n");

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportText);
      showToast("คัดลอกรายชื่อแล้ว");
    } catch {
      showToast("คัดลอกอัตโนมัติไม่สำเร็จ — เลือกข้อความในช่องแล้วคัดลอกเองได้เลย", true);
    }
  }

  async function doImport() {
    const names = importText.split("\n").map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) {
      showToast("กรุณาวางรายชื่ออย่างน้อย 1 ชื่อ", true);
      return;
    }
    setImporting(true);
    try {
      const result = await onImport(names);
      setImportText("");
      onClose();
      showToast(
        result.skipped.length > 0
          ? `เพิ่ม ${result.added} คน ข้าม ${result.skipped.length} คน (มีอยู่แล้ว: ${result.skipped.join(", ")})`
          : `เพิ่ม ${result.added} คนสำเร็จ`
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="card-title">
          <span>{mode === "export" ? "📤 ส่งออกรายชื่อผู้เล่น" : "📥 นำเข้ารายชื่อผู้เล่น"}</span>
          <span className="link" onClick={onClose}>ปิด ✕</span>
        </div>
        <div className="hint" style={{ marginTop: 0 }}>
          {mode === "export"
            ? "รายชื่อทุกคนในคลัง คนละบรรทัด คัดลอกไปเก็บ/แชร์ต่อได้เลย"
            : 'วางรายชื่อ คนละบรรทัด แล้วกด "นำเข้ารายชื่อ" — ชื่อที่ซ้ำกับที่มีอยู่แล้วจะถูกข้ามอัตโนมัติ ผู้เล่นใหม่จะยังไม่ถูกติ๊กว่า "มาวันนี้"'}
        </div>
        {mode === "export" ? (
          <textarea className="mono-box" readOnly value={exportText} onClick={(e) => e.currentTarget.select()} />
        ) : (
          <textarea
            className="mono-box"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"สมชาย\nสมหญิง\nก๊อต"}
          />
        )}
        <button
          className="save"
          style={{ width: "100%", background: "var(--pink)", marginTop: 10 }}
          disabled={mode === "import" && importing}
          onClick={mode === "export" ? copyExport : doImport}
        >
          {mode === "export" ? "📋 คัดลอก" : "📥 นำเข้ารายชื่อ"}
        </button>
      </div>
    </div>
  );
}
