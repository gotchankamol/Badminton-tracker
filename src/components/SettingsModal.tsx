"use client";

import { useState } from "react";
import type { AppState } from "@/lib/types";
import { SOUND_THEME_LABELS, SOUND_VOLUME_LABELS, type SoundKind, type SoundTheme, type SoundVolume } from "@/lib/sound";

type SoundControls = {
  enabled: boolean;
  theme: SoundTheme;
  volume: SoundVolume;
  vibrationEnabled: boolean;
  setEnabled: (v: boolean) => void;
  setTheme: (t: SoundTheme) => void;
  setVolume: (v: SoundVolume) => void;
  setVibrationEnabled: (v: boolean) => void;
  play: (kind: SoundKind) => void;
};

export default function SettingsModal({
  open,
  onClose,
  state,
  onUpdateSettings,
  onEndRound,
  onOpenHistory,
  onOpenPlayerHistory,
  onExportText,
  onExportImage,
  onExportCsv,
  onOpenBackupExport,
  onOpenBackupImport,
  onOpenRosterExport,
  onOpenRosterImport,
  onResetApp,
  sound,
}: {
  open: boolean;
  onClose: () => void;
  state: AppState;
  onUpdateSettings: (price: number, maxShuttleNumber: number, dayResetHour: number, dayResetEnabled: boolean) => void;
  onEndRound: () => void;
  onOpenHistory: () => void;
  onOpenPlayerHistory: () => void;
  onExportText: () => void;
  onExportImage: () => void;
  onExportCsv: () => void;
  onOpenBackupExport: () => void;
  onOpenBackupImport: () => void;
  onOpenRosterExport: () => void;
  onOpenRosterImport: () => void;
  onResetApp: () => void;
  sound: SoundControls;
}) {
  const [price, setPrice] = useState(state.settings.price);
  const [maxNum, setMaxNum] = useState(state.settings.maxShuttleNumber);
  const [resetHour, setResetHour] = useState(state.settings.dayResetHour);
  const [resetEnabled, setResetEnabled] = useState(state.settings.dayResetEnabled);

  if (!open) return null;

  function playSoundDemo() {
    sound.play("click");
    setTimeout(() => sound.play("notify"), 220);
    setTimeout(() => sound.play("success"), 500);
    setTimeout(() => sound.play("error"), 1000);
    setTimeout(() => sound.play("roundEnd"), 1500);
  }

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
          <div className="hint" style={{ marginTop: 0 }}>📅 ดูประวัติย้อนหลัง</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="save" style={{ flex: 1, background: "var(--purple)", fontSize: 13 }} onClick={onOpenHistory}>📅 ตามวันที่</button>
            <button className="save" style={{ flex: 1, background: "var(--purple)", fontSize: 13 }} onClick={onOpenPlayerHistory}>🧾 ตามรายคน</button>
          </div>
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
                setTimeout(playSoundDemo, 50);
              }}
            >
              {(Object.keys(SOUND_THEME_LABELS) as SoundTheme[]).map((t) => (
                <option key={t} value={t}>{SOUND_THEME_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: 10, opacity: sound.enabled ? 1 : 0.4 }}>
            <label style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>ระดับเสียง</label>
            <div style={{ display: "flex", gap: 8 }}>
              {(Object.keys(SOUND_VOLUME_LABELS) as SoundVolume[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={!sound.enabled}
                  onClick={() => {
                    sound.setVolume(v);
                    setTimeout(() => sound.play("notify"), 50);
                  }}
                  style={{
                    flex: 1, padding: "8px 4px", borderRadius: 10, cursor: "pointer",
                    fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 12.5,
                    border: sound.volume === v ? "2px solid var(--ink)" : "2px solid rgba(43,33,64,0.2)",
                    background: sound.volume === v ? "var(--blue)" : "transparent",
                    color: sound.volume === v ? "#fff" : "var(--ink)",
                  }}
                >
                  {SOUND_VOLUME_LABELS[v]}
                </button>
              ))}
            </div>
          </div>
          <div className="price-row" style={{ marginTop: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <input
                type="checkbox"
                checked={sound.vibrationEnabled}
                onChange={(e) => {
                  sound.setVibrationEnabled(e.target.checked);
                  if (e.target.checked) setTimeout(() => sound.play("notify"), 50);
                }}
                style={{ width: 16, height: 16 }}
              />
              📳 เปิดโหมดสั่น
            </label>
          </div>
          <div className="hint" style={{ marginTop: 0, marginBottom: 0 }}>
            ใช้ได้เฉพาะมือถือ/เบราว์เซอร์ที่รองรับการสั่น (เช่น Android Chrome — iPhone/Safari ยังไม่รองรับ)
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

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "2px dashed rgba(43,33,64,0.2)" }}>
          <div className="hint" style={{ marginTop: 0 }}>⚠️ โซนอันตราย</div>
          <button className="save" style={{ background: "var(--pink)", fontSize: 13 }} onClick={onResetApp}>
            🗑️ รีเซ็ตแอปกลับเป็นค่าเริ่มต้น
          </button>
          <div className="hint" style={{ marginBottom: 0 }}>
            ลบรายชื่อผู้เล่น ลูกแบด และประวัติการจ่ายเงินทั้งหมดถาวร แล้วตั้งค่าราคา/ค่าตั้งค่ากลับเป็นค่าเริ่มต้น — ใช้ตอนอยากเริ่มต้นใหม่ทั้งหมด (ไม่ใช่แค่จบรอบ)
          </div>
        </div>
      </div>
    </div>
  );
}
