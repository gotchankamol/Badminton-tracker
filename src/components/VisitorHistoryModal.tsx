"use client";

import { useEffect, useRef, useState } from "react";
import {
  listVisitors,
  revokeVisitor,
  deleteVisitor,
  getAdminSnapshot,
  restoreAdminSnapshot,
  type VisitorSummary,
  type AdminSnapshot,
} from "@/lib/session-actions";
import { SESSION_INVALID_ERROR } from "@/lib/session-shared";

function formatVisitorDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function VisitorHistoryModal({
  open,
  onClose,
  isOwner,
  showToast,
}: {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  showToast: (msg: string, isError?: boolean) => void;
}) {
  const [visitors, setVisitors] = useState<VisitorSummary[]>([]);
  const [search, setSearch] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const historyRef = useRef<AdminSnapshot[]>([]);
  const futureRef = useRef<AdminSnapshot[]>([]);
  const [historyLen, setHistoryLen] = useState(0);
  const [futureLen, setFutureLen] = useState(0);

  useEffect(() => {
    if (!open || !isOwner) return;
    let cancelled = false;
    async function load() {
      try {
        const v = await listVisitors();
        if (!cancelled) setVisitors(v);
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
  }, [open, isOwner]);

  async function withHistory(action: () => Promise<void>) {
    try {
      const before = await getAdminSnapshot();
      await action();
      historyRef.current.push(before);
      if (historyRef.current.length > 50) historyRef.current.shift();
      futureRef.current = [];
      setHistoryLen(historyRef.current.length);
      setFutureLen(0);
    } catch (e) {
      if (e instanceof Error && e.message === SESSION_INVALID_ERROR) window.location.reload();
    }
  }

  async function handleRevoke(id: number) {
    setBusy(true);
    await withHistory(async () => {
      setVisitors(await revokeVisitor(id));
    });
    setBusy(false);
  }

  async function handleDelete(id: number) {
    setBusy(true);
    await withHistory(async () => {
      setVisitors(await deleteVisitor(id));
    });
    setBusy(false);
  }

  async function handleUndo() {
    if (historyRef.current.length === 0) return;
    setBusy(true);
    try {
      const prev = historyRef.current.pop()!;
      const current = await getAdminSnapshot();
      futureRef.current.push(current);
      setHistoryLen(historyRef.current.length);
      setFutureLen(futureRef.current.length);
      const result = await restoreAdminSnapshot(prev);
      setVisitors(result.visitors);
    } catch (e) {
      if (e instanceof Error && e.message === SESSION_INVALID_ERROR) window.location.reload();
    }
    setBusy(false);
  }

  async function handleRedo() {
    if (futureRef.current.length === 0) return;
    setBusy(true);
    try {
      const next = futureRef.current.pop()!;
      const current = await getAdminSnapshot();
      historyRef.current.push(current);
      setHistoryLen(historyRef.current.length);
      setFutureLen(futureRef.current.length);
      const result = await restoreAdminSnapshot(next);
      setVisitors(result.visitors);
    } catch (e) {
      if (e instanceof Error && e.message === SESSION_INVALID_ERROR) window.location.reload();
    }
    setBusy(false);
  }

  if (!open || !isOwner) return null;

  const query = search.trim().toLowerCase();
  const filtered = query
    ? visitors.filter((v) => v.nickname.toLowerCase().includes(query) || v.codeLabel.toLowerCase().includes(query))
    : visitors;

  const exportText =
    "ชื่อเล่น,รหัสที่ใช้,เข้าครั้งแรก,ใช้งานล่าสุด,สถานะ\n" +
    filtered
      .map((v) => {
        const status = v.revoked ? "ถูกตัดสิทธิ์แล้ว" : v.online ? "ออนไลน์อยู่" : "ออฟไลน์";
        return `${v.nickname},${v.codeLabel},${formatVisitorDateTime(v.createdAt)},${formatVisitorDateTime(v.lastSeenAt)},${status}`;
      })
      .join("\n");

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(exportText);
      showToast("คัดลอกประวัติผู้เข้าใช้งานแล้ว");
    } catch {
      showToast("คัดลอกอัตโนมัติไม่สำเร็จ — เลือกข้อความในช่องแล้วคัดลอกเองได้เลย", true);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="card-title">
          <span>📋 รายงานผู้เข้าใช้งาน</span>
          <span className="link" onClick={onClose}>ปิด ✕</span>
        </div>
        <div className="hint" style={{ marginTop: 0 }}>
          ชื่อเล่นเป็นข้อความที่แต่ละคนพิมพ์เองตอนเข้าครั้งแรก ไม่ได้ยืนยันตัวตน อาจซ้ำหรือปลอมได้ — ใช้เป็นตัวช่วยจำ ไม่ใช่บัญชีผู้ใช้จริงจัง
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginTop: 10 }}>
          <div className="hint" style={{ marginTop: 0 }}>
            👥 ทั้งหมด ({visitors.length}) · ออนไลน์ตอนนี้ {visitors.filter((v) => v.online).length} คน
          </div>
          {visitors.length > 0 && (
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              style={{ flexShrink: 0, background: "none", border: "none", color: "var(--blue)", fontSize: 11.5, fontWeight: 700, cursor: "pointer", padding: 0, textDecoration: "underline" }}
            >
              {exportOpen ? "ซ่อนรายการ" : "📤 ส่งออก"}
            </button>
          )}
        </div>

        {visitors.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔎 ค้นหาชื่อเล่นหรือรหัสที่ใช้..."
            className="gate-input"
            style={{ margin: "8px 0", padding: "7px 10px", fontSize: 13 }}
          />
        )}

        {exportOpen && (
          <div style={{ marginBottom: 10 }}>
            <textarea className="mono-box" readOnly value={exportText} onClick={(e) => e.currentTarget.select()} style={{ minHeight: 100 }} />
            <button className="save" style={{ width: "100%", background: "var(--pink)", marginTop: 6 }} onClick={copyExport}>
              📋 คัดลอก (CSV)
            </button>
          </div>
        )}

        {visitors.length === 0 && <div className="hint" style={{ marginTop: 0 }}>ยังไม่มีใครเข้าใช้งาน</div>}
        {visitors.length > 0 && filtered.length === 0 && (
          <div className="hint" style={{ marginTop: 0 }}>ไม่พบคนที่ตรงกับ &quot;{search}&quot;</div>
        )}
        {filtered.map((v) => (
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
                {v.revoked && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDelete(v.id)}
                    style={{ background: "none", border: "none", color: "var(--ink-soft)", fontSize: 11, fontWeight: 700, cursor: "pointer", padding: 0, textDecoration: "underline" }}
                  >
                    ลบออกจากรายการถาวร
                  </button>
                )}
              </div>
              {!v.revoked && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleRevoke(v.id)}
                  style={{ flexShrink: 0, background: "var(--pink)", color: "#fff", border: "2px solid var(--ink)", borderRadius: 10, padding: "6px 10px", fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                >
                  🚫 ตัดสิทธิ์
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-fab-group">
        <button className="fab-btn" title="ย้อนกลับ" disabled={busy || historyLen === 0} onClick={handleUndo} style={{ background: "var(--orange)" }}>↶</button>
        <button className="fab-btn" title="ทำซ้ำ" disabled={busy || futureLen === 0} onClick={handleRedo} style={{ background: "var(--blue)" }}>↷</button>
      </div>
    </div>
  );
}
