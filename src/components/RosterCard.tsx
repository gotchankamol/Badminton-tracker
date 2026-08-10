"use client";

import { useEffect, useRef, useState } from "react";
import type { AppState } from "@/lib/types";
import { chipColor, displayName, sortedRoster } from "@/lib/state-helpers";

export default function RosterCard({
  state,
  onAddPlayer,
  onEditPlayer,
  onDeletePlayer,
  onSetPresent,
  onSetPresentMultiple,
  onAddGuest,
  onRemoveToday,
  onClearToday,
}: {
  state: AppState;
  onAddPlayer: (name: string) => void;
  onEditPlayer: (id: number) => void;
  onDeletePlayer: (id: number) => void;
  onSetPresent: (id: number) => void;
  onSetPresentMultiple: (ids: number[]) => void;
  onAddGuest: (name: string) => void;
  onRemoveToday: (id: number) => void;
  onClearToday: () => void;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [guestName, setGuestName] = useState("");
  const pickerWrapRef = useRef<HTMLDivElement>(null);

  // Closing on an outside click (rather than the old onBlur-with-timeout trick) avoids
  // the focus/blur races that made typing feel unreliable, especially on phones. No
  // auto-focus on open either — on a phone that pops the keyboard immediately and
  // covers the list, so search is opt-in (tap the field) rather than forced.
  useEffect(() => {
    if (!pickerOpen) return;
    function handleOutside(e: MouseEvent) {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setSearch("");
        setSelectedIds(new Set());
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [pickerOpen]);

  const presentPlayers = sortedRoster(state).filter((p) => p.isToday);
  const notPresentPlayers = sortedRoster(state).filter((p) => !p.isToday);
  const filteredPlayers = notPresentPlayers.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));
  const presentCount = presentPlayers.length;
  const leftCount = state.roster.filter((p) => p.hasLeft).length;
  const totalCount = presentCount + leftCount;

  function submitAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddPlayer(trimmed);
    setNewName("");
  }

  function submitGuest() {
    const trimmed = guestName.trim();
    if (!trimmed) return;
    onAddGuest(trimmed);
    setGuestName("");
  }

  function pickOne(id: number) {
    onSetPresent(id);
    setSearch("");
    setSelectedIds(new Set());
    setPickerOpen(false);
  }

  function pickAll() {
    onSetPresentMultiple(notPresentPlayers.map((p) => p.id));
    setSearch("");
    setSelectedIds(new Set());
    setPickerOpen(false);
  }

  function pickSelected() {
    onSetPresentMultiple(Array.from(selectedIds));
    setSearch("");
    setSelectedIds(new Set());
    setPickerOpen(false);
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
                    {p.name}{p.isGuest && " 😎"}
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

      <div className="search-dropdown-wrap" ref={pickerWrapRef}>
        <button type="button" className="num-select" onClick={() => setPickerOpen((v) => !v)}>
          + เลือกผู้เล่นวันนี้
        </button>
        {pickerOpen && (
          <div className="search-dropdown-list">
            {notPresentPlayers.length > 0 && (
              <div className="search-dropdown-item all-option" onClick={pickAll}>
                ⚡ เพิ่มทุกคน ({notPresentPlayers.length})
              </div>
            )}
            {selectedIds.size > 0 && (
              <div className="search-dropdown-item all-option" onClick={pickSelected}>
                ✅ เพิ่มที่เลือกไว้ ({selectedIds.size})
              </div>
            )}
            {notPresentPlayers.length > 0 && (
              <div className="search-dropdown-search">
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหาชื่อ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            {notPresentPlayers.length === 0 ? (
              <div className="search-dropdown-empty">ทุกคนอยู่ในสนามหมดแล้ว</div>
            ) : filteredPlayers.length === 0 ? (
              <div className="search-dropdown-empty">ไม่พบชื่อที่ค้นหา</div>
            ) : (
              filteredPlayers.map((p) => (
                <div key={p.id} className="search-dropdown-item" onClick={() => pickOne(p.id)}>
                  <span>{displayName(p)}</span>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(p.id)}
                    style={{ width: 18, height: 18, marginLeft: 10, flexShrink: 0 }}
                  />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="roster-add">
        <input
          type="text"
          placeholder="ชื่อผู้เล่นทั่วไป (ไม่บันทึกในคลัง)..."
          maxLength={30}
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitGuest(); } }}
        />
        <button onClick={submitGuest}>+</button>
      </div>

      <div className="pick-grid">
        {presentPlayers.map((p) => {
          const col = chipColor(p.name);
          return (
            <div key={p.id} className="chip" style={{ background: col.bg, borderColor: col.border }} onClick={() => onRemoveToday(p.id)}>
              {p.name}{p.isGuest && " 😎"}<span className="x">✕</span>
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
