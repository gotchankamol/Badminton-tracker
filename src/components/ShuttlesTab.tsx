"use client";

import { useMemo, useState } from "react";
import type { AppState } from "@/lib/types";
import {
  chipColor,
  countColor,
  groupPlayerIds,
  isInCurrentRound,
  rosterName,
  shuttleUnitCount,
} from "@/lib/state-helpers";

export default function ShuttlesTab({
  state,
  onAddShuttle,
  onDeleteShuttle,
  onAddNumberToShuttle,
  showToast,
}: {
  state: AppState;
  onAddShuttle: (number: string, shares: Record<string, number>) => void;
  onDeleteShuttle: (id: number, orderIndex: number) => void;
  onAddNumberToShuttle: (shuttleId: number, number: string) => void;
  showToast: (msg: string) => void;
}) {
  const [selectedNumber, setSelectedNumber] = useState<string>("");
  const [shares, setShares] = useState<Record<string, number>>({});
  const [numberFilter, setNumberFilter] = useState<Set<string>>(new Set());
  const [addNumOpenFor, setAddNumOpenFor] = useState<number | null>(null);

  const todayIds = state.roster.filter((p) => p.isToday).map((p) => p.id);
  const validShares: Record<string, number> = {};
  Object.keys(shares).forEach((id) => { if (todayIds.includes(parseInt(id, 10))) validShares[id] = shares[id]; });

  const total = Object.values(validShares).reduce((s, n) => s + n, 0);

  function togglePick(id: number) {
    const key = String(id);
    const current = validShares[key] || 0;
    const otherTotal = Object.entries(validShares).reduce((s, [k, n]) => (k === key ? s : s + n), 0);
    const wouldBe = current + 1;
    if (wouldBe > 4 || otherTotal + wouldBe > 4) {
      const next = { ...validShares };
      delete next[key];
      setShares(next);
      return;
    }
    setShares({ ...validShares, [key]: wouldBe });
  }

  function handleSave() {
    if (!selectedNumber) {
      showToast("กรุณาเลือกหมายเลขลูกก่อน");
      return;
    }
    if (total !== 4) {
      showToast(`ยอดรวมจำนวนที่แต่ละคนจ่ายต้องเท่ากับ 4 (ตอนนี้รวมได้ ${total}) กรุณาแตะปรับจำนวนของแต่ละคนให้ครบก่อนบันทึก`);
      return;
    }
    onAddShuttle(selectedNumber, validShares);
    setSelectedNumber("");
    setShares({});
  }

  const max = state.settings.maxShuttleNumber || 12;

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    state.shuttles.filter((s) => isInCurrentRound(state, s)).forEach((s) => {
      (s.numbers || []).forEach((n) => { c[n] = (c[n] || 0) + 1; });
    });
    return c;
  }, [state]);

  const displayNumbers = useMemo(() => {
    const nums: string[] = [];
    for (let n = 1; n <= max; n++) nums.push(String(n));
    Object.keys(counts).forEach((n) => { if (!nums.includes(n)) nums.push(n); });
    nums.sort((a, b) => {
      const na = parseFloat(a), nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });
    return nums;
  }, [max, counts]);

  const todayShuttles = state.shuttles.filter((s) => isInCurrentRound(state, s));
  const orderMap: Record<number, number> = {};
  todayShuttles.slice().sort((a, b) => a.id - b.id).forEach((s, i) => { orderMap[s.id] = i + 1; });

  let shuttlesToShow = todayShuttles.slice().sort((a, b) => b.id - a.id);
  if (numberFilter.size > 0) {
    shuttlesToShow = shuttlesToShow.filter((s) => (s.numbers || []).some((n) => numberFilter.has(String(n))));
  }

  const totalShuttles = todayShuttles.reduce((sum, s) => sum + shuttleUnitCount(s), 0);
  // Scoped to this round, not all-time: right after "จบรอบ" these should read 0,
  // matching "ลูกทั้งหมด" above. Older unpaid debt still shows in the Summary tab —
  // it's just not folded into this round's running total here.
  let totalOwed = 0, totalPaid = 0;
  state.roster.forEach((p) => {
    const roundUsage = todayShuttles
      .filter((s) => s.playerIds.includes(p.id))
      .reduce((sum, s) => sum + s.playerIds.filter((pid) => pid === p.id).length * shuttleUnitCount(s), 0);
    const roundCost = roundUsage * state.settings.price;
    const paidThisRound = (p.payments || [])
      .filter((pay) => pay.at && new Date(pay.at) >= new Date(state.currentRoundStart))
      .reduce((s, pay) => s + pay.amount, 0);
    totalPaid += paidThisRound;
    totalOwed += Math.max(0, roundCost - paidThisRound);
  });

  return (
    <div>
      <div className="card add-shuttle">
        <div className="card-title">➕ เพิ่มลูกใหม่</div>
        <div className="hint">เลือกหมายเลขลูกแบดมินตัน</div>
        <select className="num-select" value={selectedNumber} onChange={(e) => setSelectedNumber(e.target.value)}>
          <option value="">— เลือกหมายเลข —</option>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>หมายเลข {n}</option>
          ))}
        </select>
        <div className="hint">
          {todayIds.length === 0
            ? "ยังไม่มีใครถูกเลือกว่ามาวันนี้ — เลือกผู้เล่นวันนี้ด้านบนก่อน"
            : "แตะชื่อเพื่อเลือก แตะซ้ำเพื่อเพิ่มจำนวนที่จ่าย (×1 ถึง ×4) ยอดรวมต้องเท่ากับ 4"}
        </div>
        {todayIds.length > 0 && (
          <div className="selcount" style={{ color: total === 4 ? "var(--green)" : "var(--pink)" }}>
            <span>รวมแล้ว {total}/4</span>
            {total > 0 && <span className="link" onClick={() => setShares({})}>ล้างการเลือก</span>}
          </div>
        )}
        <div className="pick-grid">
          {todayIds.map((id) => {
            const nm = rosterName(state, id);
            const col = chipColor(nm);
            const s = validShares[String(id)] || 0;
            const style = s > 0
              ? { background: col.border, borderColor: col.border, color: "#fff" }
              : { background: col.bg, borderColor: col.border, color: "var(--ink)" };
            return (
              <button type="button" key={id} className={`toggle-chip${s > 0 ? " selected" : ""}`} style={style} onClick={() => togglePick(id)}>
                {s > 0 ? `${nm} ×${s}` : nm}
              </button>
            );
          })}
        </div>
        <button className="save" disabled={todayIds.length === 0} onClick={handleSave}>+ บันทึกลูกนี้</button>
      </div>

      <div className="card">
        <div className="un-label">
          ✅ ลูกแบดที่ใช้ไปแล้ว
          {numberFilter.size > 0 && (
            <span className="link" onClick={() => setNumberFilter(new Set())}>ล้างตัวกรอง</span>
          )}
        </div>
        <div className="num-grid">
          {displayNumbers.map((n) => {
            const used = !!counts[n];
            const active = numberFilter.has(n);
            const col = used ? countColor(counts[n]) : null;
            return (
              <div
                key={n}
                className={`num-tile ${used ? "used" : "unused"}${active ? " active" : ""}`}
                style={!active && col ? { background: col.bg, borderColor: col.border } : undefined}
                onClick={() => {
                  if (!used) return;
                  const next = new Set(numberFilter);
                  if (next.has(n)) next.delete(n); else next.add(n);
                  setNumberFilter(next);
                }}
              >
                <span>{n}</span>
                {used && <span className="n-count">×{counts[n]}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="summary">
        <div className="stat"><div className="num">{totalShuttles}</div><div className="lbl">ลูกทั้งหมด</div></div>
        <div className="stat owe"><div className="num">{totalOwed}</div><div className="lbl">ค้างจ่าย (บ.)</div></div>
        <div className="stat paid"><div className="num">{totalPaid}</div><div className="lbl">จ่ายแล้ว (บ.)</div></div>
      </div>

      {shuttlesToShow.length === 0 ? (
        <div className="empty-msg">ยังไม่มีลูกที่บันทึกไว้ เพิ่มลูกแรกด้านบนได้เลย 🏸</div>
      ) : (
        <div>
          {shuttlesToShow.map((s) => {
            const grouped = groupPlayerIds(s.playerIds);
            const numCount = shuttleUnitCount(s);
            const totalShares = s.playerIds.length * numCount;
            const baseComplete = s.playerIds.length === 4;
            let timeStr = "";
            if (s.createdAt) {
              const dt = new Date(s.createdAt);
              timeStr = dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) + " · " + dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
            }
            const addNumOpen = addNumOpenFor === s.id;
            return (
              <div className="card shuttle-card" key={s.id}>
                <div className="shuttle-head">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 800, marginRight: 2 }}>รายการที่ {orderMap[s.id]}</span>
                    {(s.numbers || []).map((n, i) => <span className="shuttle-num" key={i}>#{n}</span>)}
                  </div>
                  <div className="shuttle-amt" style={{ color: baseComplete ? "var(--ink-soft)" : "var(--pink)" }}>{totalShares} ส่วน × {state.settings.price} บ.</div>
                  <button className="del-shuttle" onClick={() => onDeleteShuttle(s.id, orderMap[s.id])}>✕</button>
                </div>
                {timeStr && <div style={{ fontSize: 10.5, color: "var(--ink-soft)", fontWeight: 600, margin: "-4px 0 9px" }}>🕐 {timeStr}</div>}
                <div className="chips">
                  {grouped.map((g) => {
                    const nm = rosterName(state, g.id);
                    const col = chipColor(nm);
                    return (
                      <div className="chip" key={g.id} style={{ background: col.bg, borderColor: col.border, cursor: "default" }}>
                        {g.count > 1 ? `${nm} ×${g.count}` : nm}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 9, paddingTop: 9, borderTop: "2px dashed rgba(43,33,64,0.12)" }}>
                  <span className="link" onClick={() => setAddNumOpenFor(addNumOpen ? null : s.id)}>+ เพิ่มหมายเลขลูก (คนกลุ่มนี้)</span>
                  {addNumOpen && (
                    <select
                      className="num-select"
                      style={{ marginTop: 8, marginBottom: 0 }}
                      value=""
                      onChange={(e) => {
                        const n = e.target.value;
                        if (!n) return;
                        onAddNumberToShuttle(s.id, n);
                        setAddNumOpenFor(null);
                      }}
                    >
                      <option value="">— เลือกหมายเลข —</option>
                      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>หมายเลข {n}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
