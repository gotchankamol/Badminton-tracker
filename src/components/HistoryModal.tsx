"use client";

import { useMemo, useState } from "react";
import type { AppState } from "@/lib/types";
import { buildDayReportData, formatThaiDate, shuttleUnitCount, todayDateStr } from "@/lib/state-helpers";

export default function HistoryModal({ open, onClose, state, showToast }: { open: boolean; onClose: () => void; state: AppState; showToast: (msg: string) => void }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    state.shuttles.forEach((s) => { counts[s.date] = (counts[s.date] || 0) + shuttleUnitCount(s); });
    return counts;
  }, [state.shuttles]);

  const dates = Object.keys(dateCounts).filter((d) => d !== todayDateStr(state.settings.dayResetHour)).sort((a, b) => b.localeCompare(a));

  if (!open) return null;

  function close() {
    setSelectedDate(null);
    onClose();
  }

  function detailText(dateStr: string) {
    const data = buildDayReportData(state, dateStr);
    let text = `🏸 สรุปลูกแบด - ${formatThaiDate(dateStr)}\n\n`;
    if (data.length === 0) {
      text += "ไม่มีข้อมูลการใช้ลูกแบดในวันนี้";
    } else {
      const totalShuttles = state.shuttles.filter((s) => s.date === dateStr).reduce((s, sh) => s + shuttleUnitCount(sh), 0);
      text += `ลูกแบดที่ใช้: ${totalShuttles} ลูก\n\n`;
      text += `รายชื่อ:\n`;
      data.forEach((r) => { text += `- ${r.name}: ${r.count} ลูก (${r.total} บาท)\n`; });
    }
    return text;
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("คัดลอกแล้ว");
    } catch {
      showToast("คัดลอกอัตโนมัติไม่สำเร็จ — เลือกข้อความในช่องแล้วคัดลอกเองได้เลย");
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal-card">
        <div className="card-title">
          <span>{selectedDate ? `📅 ${formatThaiDate(selectedDate)}` : "📅 ประวัติย้อนหลัง"}</span>
          <span className="link" onClick={close}>ปิด ✕</span>
        </div>
        {!selectedDate ? (
          <div>
            <div className="hint" style={{ marginTop: 0 }}>แตะวันที่เพื่อดูสรุปของวันนั้น</div>
            {dates.length === 0 ? (
              <div className="roster-empty">ยังไม่มีประวัติวันก่อนหน้า</div>
            ) : (
              dates.map((d) => (
                <div className="roster-row" key={d} style={{ cursor: "pointer" }} onClick={() => setSelectedDate(d)}>
                  <div className="rname">{formatThaiDate(d)}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 700, marginRight: 6 }}>{dateCounts[d]} ลูก</div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            <span className="link" onClick={() => setSelectedDate(null)}>← กลับไปเลือกวันที่</span>
            <textarea className="mono-box" style={{ minHeight: 200, marginTop: 10 }} readOnly value={detailText(selectedDate)} onClick={(e) => e.currentTarget.select()} />
            <button className="save" style={{ width: "100%", background: "var(--pink)", marginTop: 10 }} onClick={() => copyText(detailText(selectedDate))}>📋 คัดลอก</button>
          </div>
        )}
      </div>
    </div>
  );
}
