"use client";

import { useState } from "react";
import type { AppState } from "@/lib/types";
import { SOUND_THEME_LABELS, type SoundTheme } from "@/lib/sound";

type SoundControls = {
  enabled: boolean;
  theme: SoundTheme;
  setEnabled: (v: boolean) => void;
  setTheme: (t: SoundTheme) => void;
  play: (kind: "click" | "notify" | "roundEnd") => void;
};

export default function SettingsModal({
  open,
  onClose,
  state,
  onUpdateSettings,
  onEndRound,
  onOpenHistory,
  onExportText,
  onExportImage,
  onExportCsv,
  onOpenBackupExport,
  onOpenBackupImport,
  onOpenRosterExport,
  onOpenRosterImport,
  sound,
}: {
  open: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateSettings: (price: number, maxShuttleNumber: number, dayResetHour: number, dayResetEnabled: boolean) => void;
  onEndRound: () => void;
  onOpenHistory: () => void;
  onExportText: () => void;
  onExportImage: () => void;
  onExportCsv: () => void;
  onOpenBackupExport: () => void;
  onOpenBackupImport: () => void;
  onOpenRosterExport: () => void;
  onOpenRosterImport: () => void;
  sound: SoundControls;
}) {
  const [price, setPrice] = useState(state.settings.price);
  const [maxNum, setMaxNum] = useState(state.settings.maxShuttleNumber);
  const [resetHour, setResetHour] = useState(state.settings.dayResetHour);
  const [resetEnabled, setResetEnabled] = useState(state.settings.dayResetEnabled);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="card-title">⚙️ ตั้งค่า <span className="link" onClick={onClose}>ปิด ✕</span></div>

        <div style={{ marginTop: 4 }}>
          <div className="hint" style={{ marginTop: 0 }}>🔁 จบรอบวันนี้</div>
          <button className="save" style={{ background: "var(--pink)", fontSize: 13.5 }} onClick={onEndRound}>
            🔁 จบรอบนี้ เริ่มรอบใหม่
          </button>
          <div className="hint" style={{ marginBottom: 0 }}>
            ใช้ตอนทุกคนจ่ายครบแล้วอยากเริ่มรอบใหม่ในวันเดียวกัน — ล้างแค่รายชื่อ &quot;อยู่ในสนาม/กลับแล้ว&quot; และทำให้แท็บลูกแบด/สรุปเงินเริ่มนับใหม่ ไม่ลบข้อมูลลูกแบดหรือยอดจ่ายเดิม (ดูย้อนหลังได้เสมอ) กดได้หลายครั้งต่อวันถ้าเล่นหลายรอบ
          </div>
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "2px dashed rgba(43,33,64,0.2)" }}>
          <div className="hint" style={{ marginTop: 0 }}>📄 สรุปรายงานวันนี้</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="save" style={{ flex: 1, background: "var(--blue)", fontSize: 12.5, padding: "9px 4px" }} onClick={onExportText}>💬 ข้อความ</button>
            <button className="save" style={{ flex: 1, background: "var(--purple)", fontSize: 12.5, padding: "9px 4px" }} onClick={onExportImage}>🖼️ รูปภาพ</button>
            <button className="save" style={{ flex: 1, background: "var(--green)", fontSize: 12.5, padding: "9px 4px" }} onClick={onExportCsv}>📊 CSV</button>
          </div>
        </div>

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "2px dashed rgba(43,33,64,0.2)" }}>
          <button className="save" style={{ background: "var(--purple)", fontSize: 13.5 }} onClick={onOpenHistory}>📅 ดูประวัติย้อนหลัง</button>
        </div>

        <div className="price-row" style={{ marginTop: 16, paddingTop: 14, borderTop: "2px dashed rgba(43,33,64,0.2)" }}>
          <label>ราคาต่อลูก</label>
          <div className="price-input-group">
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value))}
              onBlur={() => onUpdateSettings(isNaN(price) ? 0 : price, maxNum, resetHour, resetEnabled)}
            />
            <span>บาท / คน</span>
          </div>
        </div>
        <div className="price-row" style={{ marginTop: 10 }}>
          <label>หมายเลขลูกสูงสุด</label>
          <div className="price-input-group">
            <input
              type="number"
              min={1}
              max={120}
              value={maxNum}
              onChange={(e) => setMaxNum(parseInt(e.target.value, 10))}
              onBlur={() => onUpdateSettings(price, isNaN(maxNum) || maxNum < 1 ? 12 : Math.min(maxNum, 120), resetHour, resetEnabled)}
            />
            <span>เลข</span>
          </div>
        </div>
        <div className="price-row" style={{ marginTop: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <input
              type="checkbox"
              checked={resetEnabled}
              onChange={(e) => {
                const next = e.target.checked;
                setResetEnabled(next);
                onUpdateSettings(price, maxNum, resetHour, next);
              }}
              style={{ width: 16, height: 16 }}
            />
            เวลาตัดรอบขึ้นวันใหม่อัตโนมัติ
          </label>
          <div className="price-input-group" style={{ opacity: resetEnabled ? 1 : 0.4 }}>
            <select
              className="num-select"
              style={{ width: "auto", minWidth: 110, marginBottom: 0, padding: "8px 30px 8px 12px", fontSize: 13 }}
              value={resetHour}
              disabled={!resetEnabled}
              onChange={(e) => {
                const hour = parseInt(e.target.value, 10);
                setResetHour(hour);
                onUpdateSettings(price, maxNum, hour, resetEnabled);
              }}
            >
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
              ))}
            </select>
          </div>
        </div>
        <div className="hint" style={{ marginBottom: 0 }}>
          {resetEnabled
            ? "เล่นข้ามเที่ยงคืนได้สบาย ระบบจะยังนับเป็น \"วันเดิม\" จนกว่าจะถึงเวลานี้ (ค่าเริ่มต้น 05:00 น.)"
            : "ปิดอยู่ — ระบบจะไม่ขึ้นวันใหม่ให้อัตโนมัติเลย ต้องกดปุ่ม \"จบรอบ\" ด้านล่างเองทุกครั้ง"}
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "2px dashed rgba(43,33,64,0.2)" }}>
          <div className="price-row">
            <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <input
                type="checkbox"
                checked={sound.enabled}
                onChange={(e) => sound.setEnabled(e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              🔊 เปิดเสียง
            </label>
          </div>
          <div className="price-row" style={{ marginTop: 10, opacity: sound.enabled ? 1 : 0.4 }}>
            <label>โทนเสียง</label>
            <select
              className="num-select"
              style={{ width: "auto", minWidth: 150, marginBottom: 0, padding: "8px 30px 8px 12px", fontSize: 13 }}
              value={sound.theme}
              disabled={!sound.enabled}
              onChange={(e) => {
                sound.setTheme(e.target.value as SoundTheme);
                setTimeout(() => sound.play("notify"), 50);
              }}
            >
              {(Object.keys(SOUND_THEME_LABELS) as SoundTheme[]).map((t) => (
                <option key={t} value={t}>{SOUND_THEME_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <button
            className="save"
            disabled={!sound.enabled}
            style={{ marginTop: 10, background: "var(--blue)", fontSize: 12.5, padding: "8px 4px" }}
            onClick={() => {
              sound.play("click");
              setTimeout(() => sound.play("notify"), 220);
              setTimeout(() => sound.play("roundEnd"), 500);
            }}
          >
            🔊 ทดลองฟัง
          </button>
          <div className="hint" style={{ marginBottom: 0 }}>
            ตั้งค่าเสียงนี้เฉพาะเครื่องนี้เท่านั้น ไม่กระทบคนอื่นที่เปิดลิงก์เดียวกัน
          </div>
        </div>

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "2px dashed rgba(43,33,64,0.2)" }}>
          <div className="hint" style={{ marginTop: 0 }}>👥 นำเข้า/ส่งออกรายชื่อผู้เล่น</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="save" style={{ flex: 1, background: "var(--blue)", fontSize: 12.5, padding: "9px 4px" }} onClick={onOpenRosterExport}>📤 ส่งออก</button>
            <button className="save" style={{ flex: 1, background: "var(--green)", fontSize: 12.5, padding: "9px 4px" }} onClick={onOpenRosterImport}>📥 นำเข้า</button>
          </div>
          <div className="hint" style={{ marginBottom: 0 }}>ใช้เพื่อเพิ่มรายชื่อผู้เล่นเข้าคลังทีละหลายคน หรือส่งออกไปแชร์/เก็บไว้</div>
        </div>

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "2px dashed rgba(43,33,64,0.2)" }}>
          <div className="hint" style={{ marginTop: 0 }}>💾 สำรอง/กู้คืนข้อมูล</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="save" style={{ flex: 1, background: "var(--blue)", fontSize: 12.5, padding: "9px 4px" }} onClick={onOpenBackupExport}>📤 ส่งออก</button>
            <button className="save" style={{ flex: 1, background: "var(--green)", fontSize: 12.5, padding: "9px 4px" }} onClick={onOpenBackupImport}>📥 นำเข้า</button>
          </div>
          <div className="hint" style={{ marginBottom: 0 }}>ใช้เพื่อย้าย/สำรองข้อมูลทั้งหมดของกลุ่มนี้</div>
        </div>
      </div>
    </div>
  );
}
