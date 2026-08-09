"use client";

import { useState } from "react";
import type { AppState } from "@/lib/types";

export type BackupMode = "export" | "import" | null;

export default function BackupModal({
  mode,
  onClose,
  state,
  onImport,
  showToast,
  onConfirm,
}: {
  mode: BackupMode;
  onClose: () => void;
  state: AppState;
  onImport: (json: string) => Promise<void>;
  showToast: (msg: string) => void;
  onConfirm: (message: string) => Promise<boolean>;
}) {
  const [importText, setImportText] = useState("");

  if (!mode) return null;

  const exportText = JSON.stringify({
    price: state.settings.price,
    maxShuttleNumber: state.settings.maxShuttleNumber,
    dayResetHour: state.settings.dayResetHour,
    dayResetEnabled: state.settings.dayResetEnabled,
    roundStartAt: state.settings.roundStartAt,
    roster: state.roster.map((p) => ({ id: p.id, name: p.name, payments: p.payments })),
    todayIds: state.roster.filter((p) => p.isToday).map((p) => p.id),
    leftTodayIds: state.roster.filter((p) => p.hasLeft).map((p) => p.id),
    shuttles: state.shuttles,
  });

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportText);
      showToast("คัดลอกข้อมูลสำรองแล้ว");
    } catch {
      showToast("คัดลอกอัตโนมัติไม่สำเร็จ — เลือกข้อความในช่องแล้วคัดลอกเองได้เลย");
    }
  }

  async function doImport() {
    const ok = await onConfirm("นำเข้าข้อมูลนี้? ข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่ทั้งหมด");
    if (!ok) return;
    await onImport(importText);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="card-title">
          <span>{mode === "export" ? "📤 ส่งออกข้อมูลสำรอง" : "📥 นำเข้าข้อมูลสำรอง"}</span>
          <span className="link" onClick={onClose}>ปิด ✕</span>
        </div>
        <div className="hint" style={{ marginTop: 0 }}>
          {mode === "export"
            ? 'คัดลอกข้อความนี้ไปเก็บไว้ (เช่น วางในโน้ต) แล้วนำไปวางในช่อง "นำเข้า" เพื่อย้ายข้อมูลทั้งหมด'
            : 'วางข้อความสำรองที่คัดลอกมาก่อนหน้านี้ แล้วกด "นำเข้าข้อมูล" — ข้อมูลปัจจุบันจะถูกแทนที่ทั้งหมด'}
        </div>
        {mode === "export" ? (
          <textarea className="mono-box" readOnly value={exportText} onClick={(e) => e.currentTarget.select()} />
        ) : (
          <textarea className="mono-box" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="วางข้อมูลสำรองที่นี่..." />
        )}
        <button className="save" style={{ width: "100%", background: "var(--pink)", marginTop: 10 }} onClick={mode === "export" ? copyExport : doImport}>
          {mode === "export" ? "📋 คัดลอก" : "📥 นำเข้าข้อมูล"}
        </button>
      </div>
    </div>
  );
}
