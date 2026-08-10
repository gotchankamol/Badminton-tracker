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
  playerRoundUsage,
  playerUsage,
} from "@/lib/state-helpers";
import { PaymentGroupRow, UnpaidGamesList } from "./PaymentHistoryList";

function PlayerRow({ state, p, onPay, clearedOldDebt }: { state: AppState; p: Player; onPay: (id: number) => void; clearedOldDebt?: boolean }) {
  const [showDetails, setShowDetails] = useState(false);

  const activeThisRound = playerActiveInCurrentRound(state, p.id);
  const lifetimeCount = playerUsage(state, p.id);
  const roundCount = playerRoundUsage(state, p.id);
  const owed = playerOwed(state, p);
  const settled = isSettled(state, p);
  const { groups, unpaid } = playerPaymentBreakdown(state, p);
  const unpaidCount = unpaid.reduce((sum, cg) => sum + cg.unitsCovered, 0);
  const { oldOwed, roundOwed } = playerOwedSplit(state, p);
  const hasDetails = groups.length > 0 || unpaid.length > 0;
  const lastPayment = p.payments && p.payments.length > 0 ? p.payments[p.payments.length - 1] : null;

  let count: number;
  let pamt: number;
  if (activeThisRound) {
    // Active this round: headline is this round's count/amount only — otherwise the
    // number would keep growing forever across every round ever played.
    count = roundCount;
    pamt = settled ? roundCount * state.settings.price : roundOwed;
  } else if (settled) {
    // Not active this round but settled only happens via playerJustClearedOldDebt —
    // show what that specific payment actually cleared, not the lifetime total (which
    // would include balls paid off in unrelated payments long before this round).
    count = lastPayment?.shuttleCount ?? lifetimeCount;
    pamt = lastPayment?.amount ?? lifetimeCount * state.settings.price;
  } else {
    // Carried-over debt: show only the unpaid ball count so it lines up with the
    // amount due next to it, instead of a lifetime count that also includes balls
    // paid off long ago.
    count = unpaidCount;
    pamt = owed;
  }

  // If a payment made during this round covered more shuttles than this round actually
  // has, the extra must have been old (pre-round) debt getting swept up in the same
  // payment — pay() always settles everything owed at once. Flag it so that debt
  // doesn't just quietly vanish from view once the row shows round-only numbers.
  const roundStart = new Date(state.currentRoundStart);
  const paidThisRoundUnits = (p.payments || [])
    .filter((pay) => pay.at && new Date(pay.at) >= roundStart)
    .reduce((s, pay) => s + (pay.shuttleCount || 0), 0);
  const oldDebtClearedAmount = activeThisRound && settled && paidThisRoundUnits > roundCount
    ? (paidThisRoundUnits - roundCount) * state.settings.price
    : 0;

  // Only this round's payments show here — the full lifetime ledger lives in
  // Settings → ประวัติการจ่ายเงินรายคน instead, so this stays focused on "right now."
  const recentGroups = groups
    .filter((grp) => grp.payment.at && new Date(grp.payment.at) >= roundStart)
    .map((grp, i) => ({ grp, num: i + 1 }));

  return (
    <div className="player-block">
      <div className={`player-row${settled ? " is-paid" : ""}`}>
        <div className="pname" onClick={() => hasDetails && setShowDetails((v) => !v)}>
          <span className={p.isGuest ? "guest-name" : undefined}>{p.isGuest && "🎫 "}{p.name}</span>
          {clearedOldDebt && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" }}> (จ่ายยอดค้างวันก่อน)</span>}
          {oldDebtClearedAmount > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" }}> (+ เคลียร์ค้างเก่า {oldDebtClearedAmount}บ.)</span>}
        </div>
        <div className="pcount">{count} ลูก</div>
        <div className="pamt">{pamt}</div>
        <button className="pay-btn" onClick={() => onPay(p.id)}>{settled ? "✓" : ""}</button>
      </div>
      {!settled && oldOwed > 0 && roundOwed > 0 && (
        <div style={{ fontSize: 11, color: "var(--pink)", fontWeight: 700, padding: "4px 14px 0" }}>
          วันนี้ {roundOwed}บ. + ค้างเก่า {oldOwed}บ.
        </div>
      )}
      {showDetails && (
        <div className="pay-history">
          {recentGroups.map(({ grp, num }) => <PaymentGroupRow key={grp.payment.id} grp={grp} num={num} />)}
          <UnpaidGamesList unpaid={unpaid} />
        </div>
      )}
    </div>
  );
}

export default function SummaryTab({ state, onPay }: { state: AppState; onPay: (id: number) => void }) {
  const sortByUsage = (a: Player, b: Player) => playerUsage(state, b.id) - playerUsage(state, a.id);
  const sortByRoundUsage = (a: Player, b: Player) => playerRoundUsage(state, b.id) - playerRoundUsage(state, a.id);

  // Debt that's still unpaid from before this round (they haven't played this round at
  // all, but still owe money) gets its own card, separate from this round's activity —
  // so a fresh round doesn't look "contaminated" by old stragglers, but nobody's debt
  // ever silently disappears either.
  const carriedOver = state.roster
    .filter((p) => playerOwed(state, p) > 0 && !playerActiveInCurrentRound(state, p.id))
    .sort(sortByUsage);

  const roundPlayers = state.roster.filter((p) => playerActiveInCurrentRound(state, p.id)).sort(sortByRoundUsage);
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
