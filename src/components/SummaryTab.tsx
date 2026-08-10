"use client";

import { useState } from "react";
import type { AppState, Player } from "@/lib/types";
import {
  isSettled,
  playerActiveInCurrentRound,
  playerJustClearedOldDebt,
  playerOwed,
  playerOwedSplit,
  playerPaymentBreakdown,
  playerUsage,
} from "@/lib/state-helpers";

function shortThaiDateTime(createdAt: string, fallbackDate: string): string {
  const dt = createdAt ? new Date(createdAt) : null;
  if (dt) {
    return dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) + " " + dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
  }
  const [y, m, d] = fallbackDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function PlayerRow({ state, p, onPay, clearedOldDebt }: { state: AppState; p: Player; onPay: (id: number) => void; clearedOldDebt?: boolean }) {
  const [showDetails, setShowDetails] = useState(false);

  const count = playerUsage(state, p.id);
  const total = count * state.settings.price;
  const owed = playerOwed(state, p);
  const settled = isSettled(state, p);
  const { groups, unpaid } = playerPaymentBreakdown(state, p);
  const { oldOwed, roundOwed } = playerOwedSplit(state, p);
  const hasDetails = groups.length > 0 || unpaid.length > 0;

  return (
    <div className="player-block">
      <div className={`player-row${settled ? " is-paid" : ""}`}>
        <div className="pname" onClick={() => hasDetails && setShowDetails((v) => !v)}>
          {p.name}
          {clearedOldDebt && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" }}> (จ่ายยอดค้างวันก่อน)</span>}
        </div>
        <div className="pcount">{count} ลูก</div>
        <div className="pamt">{settled ? total : owed}</div>
        <button className="pay-btn" onClick={() => onPay(p.id)}>{settled ? "✓" : ""}</button>
      </div>
      {!settled && oldOwed > 0 && roundOwed > 0 && (
        <div style={{ fontSize: 11, color: "var(--pink)", fontWeight: 700, padding: "4px 14px 0" }}>
          วันนี้ {roundOwed}บ. + ค้างเก่า {oldOwed}บ.
        </div>
      )}
      {showDetails && (
        <div className="pay-history">
          {groups.map((grp, gi) => {
            const dt = grp.payment.at ? new Date(grp.payment.at) : null;
            const dateTimeStr = dt
              ? dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) + " " + dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น."
              : "";
            return (
              <div key={grp.payment.id} style={{ marginBottom: 8 }}>
                <div className="pay-history-row" style={{ fontWeight: 800, color: "var(--ink)" }}>
                  <span>🧾 ครั้งที่ {gi + 1}{dateTimeStr ? " · " + dateTimeStr : ""}</span>
                  <span>{grp.payment.amount} บาท</span>
                </div>
                {grp.games.length === 0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, padding: "2px 0 0 14px" }}>ไม่มีข้อมูลรายการละเอียดของยอดนี้</div>
                )}
                {grp.games.map((cg, ci) => (
                  <div key={ci} style={{ padding: "3px 0 3px 14px", borderBottom: "1px dashed rgba(43,33,64,0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                      <span>{cg.entry.numbers.map((n) => `#${n}`).join(" ") || "-"} <span style={{ opacity: 0.7, fontWeight: 600 }}>· {shortThaiDateTime(cg.entry.createdAt, cg.entry.date)}</span></span>
                      <span>×{cg.unitsCovered}</span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{cg.entry.namesStr}</div>
                  </div>
                ))}
              </div>
            );
          })}
          {unpaid.length > 0 && (
            <div>
              <div className="pay-history-row" style={{ fontWeight: 800, color: "var(--pink)" }}>🔴 ยังไม่จ่าย</div>
              {unpaid.map((cg, ci) => (
                <div key={ci} style={{ padding: "3px 0 3px 14px", borderBottom: "1px dashed rgba(43,33,64,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                    <span>{cg.entry.numbers.map((n) => `#${n}`).join(" ") || "-"} <span style={{ opacity: 0.7, fontWeight: 600 }}>· {shortThaiDateTime(cg.entry.createdAt, cg.entry.date)}</span></span>
                    <span>×{cg.unitsCovered}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{cg.entry.namesStr}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SummaryTab({ state, onPay }: { state: AppState; onPay: (id: number) => void }) {
  const sortByUsage = (a: Player, b: Player) => playerUsage(state, b.id) - playerUsage(state, a.id);

  // Debt that's still unpaid from before this round (they haven't played this round at
  // all, but still owe money) gets its own card, separate from this round's activity —
  // so a fresh round doesn't look "contaminated" by old stragglers, but nobody's debt
  // ever silently disappears either.
  const carriedOver = state.roster
    .filter((p) => playerOwed(state, p) > 0 && !playerActiveInCurrentRound(state, p.id))
    .sort(sortByUsage);

  const roundPlayers = state.roster.filter((p) => playerActiveInCurrentRound(state, p.id)).sort(sortByUsage);
  const unpaid = roundPlayers.filter((p) => !isSettled(state, p));

  // Old debtors who paid off during this round (see playerJustClearedOldDebt) join the
  // "paid" list instead of vanishing once their carried-over balance hits zero.
  const clearedOldDebt = state.roster.filter((p) => playerJustClearedOldDebt(state, p)).sort(sortByUsage);
  const paid = roundPlayers.filter((p) => isSettled(state, p));

  if (carriedOver.length === 0 && roundPlayers.length === 0 && clearedOldDebt.length === 0) {
    return <div className="empty-msg">ยังไม่มีใครใช้ลูกแบดหรือมีประวัติจ่ายเงินเลย</div>;
  }

  return (
    <div>
      {carriedOver.length > 0 && (
        <div className="card">
          <div className="card-title">🔴 ผู้เล่นค้างจ่าย</div>
          {carriedOver.map((p) => <PlayerRow key={p.id} state={state} p={p} onPay={onPay} />)}
        </div>
      )}
      {carriedOver.length > 0 && unpaid.length > 0 && (
        <div className="un-label" style={{ justifyContent: "flex-start" }}>🏸 รอบนี้</div>
      )}
      {unpaid.map((p) => <PlayerRow key={p.id} state={state} p={p} onPay={onPay} />)}
      {(paid.length > 0 || clearedOldDebt.length > 0) && (
        <>
          <div className="un-label" style={{ marginTop: unpaid.length > 0 ? 18 : 0, justifyContent: "flex-start" }}>✅ คนที่จ่ายเงินแล้ว</div>
          {paid.map((p) => <PlayerRow key={p.id} state={state} p={p} onPay={onPay} />)}
          {clearedOldDebt.map((p) => <PlayerRow key={p.id} state={state} p={p} onPay={onPay} clearedOldDebt />)}
        </>
      )}
    </div>
  );
}
