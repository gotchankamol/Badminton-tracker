"use client";

import { useEffect, useRef, useState } from "react";
import type { AppState } from "@/lib/types";
import { SOUND_THEME_LABELS, SOUND_VOLUME_LABELS, type SoundKind, type SoundTheme, type SoundVolume } from "@/lib/sound";
import {
  listAccessCodes,
  createAccessCode,
  toggleAccessCode,
  deleteAccessCode,
  listVisitors,
  revokeVisitor,
  getAdminSnapshot,
  restoreAdminSnapshot,
  type AccessCodeSummary,
  type VisitorSummary,
  type AdminSnapshot,
} from "@/lib/session-actions";
import { SESSION_INVALID_ERROR } from "@/lib/session-shared";

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
  isOwner,
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
  isOwner: boolean;
}) {
  const [price, setPrice] = useState(state.settings.price);
  const [maxNum, setMaxNum] = useState(state.settings.maxShuttleNumber);
  const [resetHour, setResetHour] = useState(state.settings.dayResetHour);
  const [resetEnabled, setResetEnabled] = useState(state.settings.dayResetEnabled);
  const [tab, setTab] = useState<"basic" | "reports" | "data" | "admin">("basic");

  const [codes, setCodes] = useState<AccessCodeSummary[]>([]);
  const [visitors, setVisitors] = useState<VisitorSummary[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newMaxUses, setNewMaxUses] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const adminHistoryRef = useRef<AdminSnapshot[]>([]);
  const adminFutureRef = useRef<AdminSnapshot[]>([]);
  const [adminHistoryLen, setAdminHistoryLen] = useState(0);
  const [adminFutureLen, setAdminFutureLen] = useState(0);

  useEffect(() => {
    if (!open || !isOwner || tab !== "admin") return;
    let cancelled = false;
    async function load() {
      try {
        const [c, v] = await Promise.all([listAccessCodes(), listVisitors()]);
        if (!cancelled) {
          setCodes(c);
          setVisitors(v);
        }
      } catch (e) {
        if (e instanceof Error && e.message === SESSION_INVALID_ERROR) window.location.reload();
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, isOwner, tab]);

  async function withAdminHistory(action: () => Promise<void>) {
    try {
      const before = await getAdminSnapshot();
      await action();
      adminHistoryRef.current.push(before);
      if (adminHistoryRef.current.length > 50) adminHistoryRef.current.shift();
      adminFutureRef.current = [];
      setAdminHistoryLen(adminHistoryRef.current.length);
      setAdminFutureLen(0);
    } catch (e) {
      if (e instanceof Error && e.message === SESSION_INVALID_ERROR) window.location.reload();
    }
  }

  async function handleCreateCode() {
    if (!newLabel.trim()) return;
    setAdminBusy(true);
    await withAdminHistory(async () => {
      const maxUses = newMaxUses.trim() ? parseInt(newMaxUses, 10) : null;
      setCodes(await createAccessCode(newLabel, Number.isFinite(maxUses) ? maxUses : null));
    });
    setNewLabel("");
    setNewMaxUses("");
    setAdminBusy(false);
  }

  async function handleToggleCode(id: number) {
    setAdminBusy(true);
    await withAdminHistory(async () => {
      setCodes(await toggleAccessCode(id));
    });
    setAdminBusy(false);
  }

  async function handleDeleteCode(id: number) {
    setAdminBusy(true);
    await withAdminHistory(async () => {
      setCodes(await deleteAccessCode(id));
    });
    setAdminBusy(false);
  }

  async function handleRevokeVisitor(id: number) {
    setAdminBusy(true);
    await withAdminHistory(async () => {
      setVisitors(await revokeVisitor(id));
    });
    setAdminBusy(false);
  }

  async function handleAdminUndo() {
    if (adminHistoryRef.current.length === 0) return;
    setAdminBusy(true);
    try {
      const prev = adminHistoryRef.current.pop()!;
      const current = await getAdminSnapshot();
      adminFutureRef.current.push(current);
      setAdminHistoryLen(adminHistoryRef.current.length);
      setAdminFutureLen(adminFutureRef.current.length);
      const result = await restoreAdminSnapshot(prev);
      setCodes(result.codes);
      setVisitors(result.visitors);
    } catch (e) {
      if (e instanceof Error && e.message === SESSION_INVALID_ERROR) window.location.reload();
    }
    setAdminBusy(false);
  }

  async function handleAdminRedo() {
    if (adminFutureRef.current.length === 0) return;
    setAdminBusy(true);
    try {
      const next = adminFutureRef.current.pop()!;
      const current = await getAdminSnapshot();
      adminHistoryRef.current.push(current);
      setAdminHistoryLen(adminHistoryRef.current.length);
      setAdminFutureLen(adminFutureRef.current.length);
      const result = await restoreAdminSnapshot(next);
      setCodes(result.codes);
      setVisitors(result.visitors);
    } catch (e) {
      if (e instanceof Error && e.message === SESSION_INVALID_ERROR) window.location.reload();
    }
    setAdminBusy(false);
  }

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

        <div className="settings-tabs">
          <button type="button" className={`settings-tab${tab === "basic" ? " active" : ""}`} onClick={() => setTab("basic")}>🔧 พื้นฐาน</button>
          <button type="button" className={`settings-tab${tab === "reports" ? " active" : ""}`} onClick={() => setTab("reports")}>📊 รายงาน</button>
          <button type="button" className={`settings-tab${tab === "data" ? " active" : ""}`} onClick={() => setTab("data")}>💾 ข้อมูล</button>
          {isOwner && (
            <button type="button" className={`settings-tab${tab === "admin" ? " active" : ""}`} onClick={() => setTab("admin")}>👤 ผู้ใช้งาน</button>
          )}
        </div>

        {tab === "basic" && (
          <>
            <div style={{ marginTop: 4 }}>
              <div className="hint" style={{ marginTop: 0 }}>🔁 จบรอบวันนี้</div>
              <button className="save" style={{ background: "var(--pink)", fontSize: 13.5 }} onClick={onEndRound}>
                🔁 จบรอบนี้ เริ่มรอบใหม่
              </button>
              <div className="hint" style={{ marginBottom: 0 }}>
                ใช้ตอนทุกคนจ่ายครบแล้วอยากเริ่มรอบใหม่ในวันเดียวกัน — ล้างแค่รายชื่อ &quot;อยู่ในสนาม/กลับแล้ว&quot; และทำให้แท็บลูกแบด/สรุปเงินเริ่มนับใหม่ ไม่ลบข้อมูลลูกแบดหรือยอดจ่ายเดิม (ดูย้อนหลังได้เสมอ) กดได้หลายครั้งต่อวันถ้าเล่นหลายรอบ
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
          </>
        )}

        {tab === "reports" && (
          <>
            <div style={{ marginTop: 4 }}>
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
          </>
        )}

        {tab === "data" && (
          <>
            <div style={{ marginTop: 4 }}>
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
          </>
        )}

        {tab === "admin" && isOwner && (
          <>
            <div style={{ marginTop: 4 }}>
              <div className="hint" style={{ marginTop: 0 }}>🔑 ออกรหัสผ่านใหม่</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="ชื่อกำกับ เช่น กลุ่มเพื่อนออฟฟิศ"
                  className="gate-input"
                  style={{ flex: 2, margin: 0 }}
                />
                <input
                  type="number"
                  min={1}
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(e.target.value)}
                  placeholder="จำกัดกี่คน"
                  className="gate-input"
                  style={{ flex: 1, margin: 0 }}
                />
              </div>
              <button className="save" style={{ marginTop: 8, background: "var(--green)", fontSize: 13.5 }} disabled={adminBusy || !newLabel.trim()} onClick={handleCreateCode}>
                ➕ สร้างรหัสใหม่
              </button>
              <div className="hint" style={{ marginBottom: 0 }}>เว้นช่อง &quot;จำกัดกี่คน&quot; ไว้ว่างถ้าไม่จำกัดจำนวน</div>
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "2px dashed rgba(43,33,64,0.2)" }}>
              <div className="hint" style={{ marginTop: 0 }}>📋 รายการรหัสผ่าน ({codes.length})</div>
              {codes.length === 0 && <div className="hint" style={{ marginTop: 0 }}>ยังไม่มีรหัสผ่าน</div>}
              {codes.map((c) => (
                <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(43,33,64,0.08)", opacity: c.revoked ? 0.45 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 13.5 }}>{c.label}{c.isOwner ? " 👑" : ""}</div>
                      <div style={{ fontFamily: "var(--font-baloo)", fontSize: 13, letterSpacing: "0.05em" }}>{c.code}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 600 }}>
                        ใช้ไปแล้ว {c.useCount}{c.maxUses != null ? ` / ${c.maxUses}` : ""} คน{c.revoked ? " · ปิดใช้งานอยู่" : ""}
                      </div>
                    </div>
                    {!c.isOwner && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        <button
                          type="button"
                          disabled={adminBusy}
                          onClick={() => handleToggleCode(c.id)}
                          style={{ background: c.revoked ? "var(--green)" : "var(--pink)", color: "#fff", border: "2px solid var(--ink)", borderRadius: 10, padding: "6px 10px", fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                        >
                          {c.revoked ? "✅ เปิดใช้งาน" : "🚫 ปิดใช้งาน"}
                        </button>
                        {c.revoked && (
                          <button
                            type="button"
                            disabled={adminBusy}
                            onClick={() => handleDeleteCode(c.id)}
                            style={{ background: "none", border: "none", color: "var(--ink-soft)", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0, textDecoration: "underline" }}
                          >
                            ลบออกจากรายการถาวร
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "2px dashed rgba(43,33,64,0.2)" }}>
              <div className="hint" style={{ marginTop: 0 }}>
                👥 คนที่เคยเข้าใช้งาน ({visitors.length}) · ออนไลน์ตอนนี้ {visitors.filter((v) => v.online).length} คน
              </div>
              {visitors.length === 0 && <div className="hint" style={{ marginTop: 0 }}>ยังไม่มีใครเข้าใช้งาน</div>}
              {visitors.map((v) => (
                <div key={v.id} style={{ padding: "8px 0", borderBottom: "1px solid rgba(43,33,64,0.08)", opacity: v.revoked ? 0.45 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 13.5 }}>
                        {v.online && <span style={{ color: "var(--green)" }}>● </span>}
                        {v.nickname}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 600 }}>
                        รหัส: {v.codeLabel}{v.revoked ? " · ถูกตัดสิทธิ์แล้ว" : v.online ? " · ออนไลน์อยู่" : ""}
                      </div>
                    </div>
                    {!v.revoked && (
                      <button
                        type="button"
                        disabled={adminBusy}
                        onClick={() => handleRevokeVisitor(v.id)}
                        style={{ flexShrink: 0, background: "var(--pink)", color: "#fff", border: "2px solid var(--ink)", borderRadius: 10, padding: "6px 10px", fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                      >
                        🚫 ตัดสิทธิ์
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {tab === "admin" && isOwner && (
        <div className="admin-fab-group">
          <button className="fab-btn" title="ย้อนกลับ" disabled={adminBusy || adminHistoryLen === 0} onClick={handleAdminUndo} style={{ background: "var(--orange)" }}>↶</button>
          <button className="fab-btn" title="ทำซ้ำ" disabled={adminBusy || adminFutureLen === 0} onClick={handleAdminRedo} style={{ background: "var(--blue)" }}>↷</button>
        </div>
      )}
    </div>
  );
}
