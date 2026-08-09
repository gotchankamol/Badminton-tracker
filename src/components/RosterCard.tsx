"use client";

import { useState } from "react";
import type { AppState } from "@/lib/types";
import { chipColor, sortedRoster } from "@/lib/state-helpers";

export default function RosterCard({
  state,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onSetPresent,
  onAddAllPresent,
  onRemoveToday,
  onClearToday,
}: {
  state: AppState;
  onAddPlayer: (name: string) => void;
  onEditPlayer: (id: number) => void;
  onDeletePlayer: (id: number) => void;
  onSetPresent: (id: number) => void;
  onAddAllPresent: () => void;
  onRemoveToday: (id: number) => void;
  onClearToday: () => void;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const presentPlayers = sortedRoster(state).filter((p) => p.isToday);
  const notPresentPlayers = sortedRoster(state).filter((p) => !p.isToday);
  const presentCount = presentPlayers.length;
  const leftCount = state.roster.filter((p) => p.hasLeft).length;
  const totalCount = presentCount + leftCount;

  function submitAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddPlayer(trimmed);
    setNewName("");
  }

  return (
    <div className="card">
      <div className="card-title" style={{ justifyContent: "space-between" }}>
        <span>🙋 ผู้เล่นวันนี้</span>
        <button
          onClick={() => setManageOpen((v) => !v)}
          style={{
            background: "var(--purple)", color: "#fff", border: "2px solid var(--ink)", borderRadius: 9,
            padding: "5px 9px", fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 11, cursor: "pointer",
            boxShadow: "2px 2px 0 rgba(43,33,64,0.2)",
          }}
        >
          📇 {manageOpen ? "ซ่อนรายชื่อ" : "จัดการรายชื่อผู้เล่น"} ({state.roster.length})
        </button>
      </div>

      {manageOpen && (
        <div style={{ marginBottom: 12 }}>
          <div className="roster-add">
            <input
              type="text"
              placeholder="ชื่อผู้เล่นใหม่..."
              maxLength={30}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitAdd(); } }}
            />
            <button onClick={submitAdd}>+</button>
          </div>
          <div className="hint" style={{ marginTop: 0 }}>ทั้งหมดในคลัง {state.roster.length} คน</div>
          {state.roster.length === 0 ? (
            <div className="roster-empty">ยังไม่มีชื่อในคลัง</div>
          ) : (
            <div>
              {sortedRoster(state).map((p) => (
                <div className="roster-row" key={p.id}>
                  <div className="rname">
                    {p.name}
                    {p.hasLeft && <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600 }}> (กลับแล้ว)</span>}
                  </div>
                  <button className="roster-del" style={{ color: "var(--blue)" }} onClick={() => onEditPlayer(p.id)}>
                    แก้ไข ✎
                  </button>
                  <button className="roster-del" onClick={() => onDeletePlayer(p.id)}>ลบ ✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="status-line">
        🟢 ในสนาม {presentCount}
        <span className="status-sep">·</span>
        👋 กลับแล้ว {leftCount}
        <span className="status-sep">·</span>
        👥 รวม {totalCount} คน
      </div>
      <div className="hint">เลือกผู้เล่นที่มาวันนี้จากรายการด้านล่าง</div>
      <div style={{ display: "flex", gap: 8 }}>
        <select
          className="num-select"
          style={{ flex: 1, marginBottom: 0 }}
          value=""
          onChange={(e) => {
            const id = parseInt(e.target.value, 10);
            if (id) onSetPresent(id);
          }}
        >
          <option value="">+ เลือกผู้เล่นวันนี้</option>
          {notPresentPlayers.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {notPresentPlayers.length > 0 && (
          <button
            onClick={onAddAllPresent}
            style={{
              background: "var(--green)", color: "#fff", border: "2px solid var(--ink)", borderRadius: 9,
              padding: "0 12px", fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 12, cursor: "pointer",
              boxShadow: "2px 2px 0 rgba(43,33,64,0.2)", whiteSpace: "nowrap",
            }}
          >
            + เพิ่มทุกคน
          </button>
        )}
      </div>
      <div className="pick-grid">
        {presentPlayers.map((p) => {
          const col = chipColor(p.name);
          return (
            <div key={p.id} className="chip" style={{ background: col.bg, borderColor: col.border }} onClick={() => onRemoveToday(p.id)}>
              {p.name}<span className="x">✕</span>
            </div>
          );
        })}
      </div>
      {state.roster.length === 0 && (
        <div className="roster-empty">ยังไม่มีชื่อในคลัง เพิ่มได้จากปุ่ม &quot;จัดการรายชื่อผู้เล่น&quot; ด้านบน</div>
      )}
      <div style={{ textAlign: "right", marginTop: 10 }}>
        <span className="link" onClick={onClearToday}>ล้างทั้งหมด</span>
      </div>
    </div>
  );
}
