"use client";

import { useEffect, useRef, useState } from "react";
import type { AppState, Player } from "@/lib/types";
import { getPublicReport } from "@/lib/public-report";
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

const REFRESH_MS = 15000;

function ReadOnlyPlayerRow({ state, p, clearedOldDebt }: { state: AppState; p: Player; clearedOldDebt?: boolean }) {
  const [showDetails, setShowDetails] = useState(false);

  const activeThisRound = playerActiveInCurrentRound(state, p.id);
  const roundCount = playerRoundUsage(state, p.id);
  const lifetimeCount = playerUsage(state, p.id);
  const owed = playerOwed(state, p);
  const settled = isSettled(state, p);
  const { groups, unpaid } = playerPaymentBreakdown(state, p);
  const unpaidCount = unpaid.reduce((sum, cg) => sum + cg.unitsCovered, 0);
  const { oldOwed, roundOwed } = playerOwedSplit(state, p);
  const hasDetails = groups.length > 0 || unpaid.length > 0;
  const lastPayment = p.payments && p.payments.length > 0 ? p.payments[p.payments.length - 1] : null;

  const roundStart = new Date(state.currentRoundStart);
  const paidThisRoundUnits = (p.payments || [])
    .filter((pay) => pay.at && new Date(pay.at) >= roundStart)
    .reduce((s, pay) => s + (pay.shuttleCount || 0), 0);
  const oldDebtClearedAmount = activeThisRound && settled && paidThisRoundUnits > roundCount
    ? (paidThisRoundUnits - roundCount) * state.settings.price
    : 0;

  let count: number;
  let pamt: number;
  if (activeThisRound) {
    count = roundCount;
    pamt = settled ? roundCount * state.settings.price + oldDebtClearedAmount : owed;
  } else if (settled) {
    count = lastPayment?.shuttleCount ?? lifetimeCount;
    pamt = lastPayment?.amount ?? lifetimeCount * state.settings.price;
  } else {
    count = unpaidCount;
    pamt = owed;
  }

  const recentGroups = groups
    .filter((grp) => grp.payment.at && new Date(grp.payment.at) >= roundStart)
    .map((grp, i) => ({ grp, num: i + 1 }));

  const showSplitNote = (!settled && oldOwed > 0 && roundOwed > 0) || (settled && oldDebtClearedAmount > 0);
  const splitRoundAmt = settled ? roundCount * state.settings.price : roundOwed;
  const splitOldAmt = settled ? oldDebtClearedAmount : oldOwed;

  return (
    <div className="player-block">
      <div className={`player-row${settled ? " is-paid" : ""}`}>
        <div className="pname" onClick={() => hasDetails && setShowDetails((v) => !v)} style={{ cursor: hasDetails ? "pointer" : "default" }}>
          <span>{p.name}{p.isGuest && " 😎"}</span>
          {showSplitNote && (
            <div style={{ fontSize: 11, fontWeight: 700, color: settled ? "var(--ink-soft)" : "var(--pink)" }}>รอบนี้ {splitRoundAmt} + รอบก่อน {splitOldAmt}</div>
          )}
          {clearedOldDebt && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)" }}> (จ่ายยอดค้าง)</span>}
        </div>
        <div className="pcount">{count} ลูก</div>
        <div className="pamt">{pamt}</div>
      </div>
      {showDetails && (
        <div className="pay-history">
          {recentGroups.map(({ grp, num }) => <PaymentGroupRow key={grp.payment.id} grp={grp} num={num} />)}
          <UnpaidGamesList unpaid={unpaid} price={state.settings.price} currentRoundStart={state.currentRoundStart} />
        </div>
      )}
    </div>
  );
}

export default function PublicReportView({ initialState }: { initialState: AppState }) {
  const [state, setState] = useState<AppState>(initialState);
  // Starts empty and fills in on mount (not via the lazy initializer) so server-rendered
  // HTML never bakes in a timestamp that could mismatch the client's clock during hydration.
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSynced(new Date());
    async function refresh() {
      if (document.visibilityState !== "visible") return;
      try {
        const fresh = await getPublicReport();
        setState(fresh);
        setLastSynced(new Date());
      } catch {
        // transient network/db hiccup — next tick retries on its own
      }
    }
    timerRef.current = setInterval(refresh, REFRESH_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const sortByUsage = (a: Player, b: Player) => playerUsage(state, b.id) - playerUsage(state, a.id);
  const sortByRoundUsage = (a: Player, b: Player) => playerRoundUsage(state, b.id) - playerRoundUsage(state, a.id);

  const carriedOver = state.roster
    .filter((p) => playerOwed(state, p) > 0 && !playerActiveInCurrentRound(state, p.id))
    .sort(sortByUsage);

  const roundPlayers = state.roster.filter((p) => playerActiveInCurrentRound(state, p.id)).sort(sortByRoundUsage);
  const unpaid = roundPlayers.filter((p) => !isSettled(state, p));
  const clearedOldDebt = state.roster.filter((p) => playerJustClearedOldDebt(state, p)).sort(sortByUsage);
  const paid = roundPlayers.filter((p) => isSettled(state, p));

  const isEmpty = carriedOver.length === 0 && roundPlayers.length === 0 && clearedOldDebt.length === 0;

  return (
    <div className="wrap">
      <header>
        <div className="mascot" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>📊</div>
        <div className="title-block">
          <div className="eyebrow">SHUTTLE LEDGER · REPORT</div>
          <h1>รายงานการใช้ลูกแบด</h1>
          <div className="clock">ดูอย่างเดียว · อัปเดตล่าสุด {lastSynced ? lastSynced.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "..."}</div>
        </div>
      </header>

      {isEmpty ? (
        <div className="empty-msg">ยังไม่มีใครใช้ลูกแบดหรือมีประวัติจ่ายเงินเลย</div>
      ) : (
        <>
          {unpaid.length > 0 && (
            <div className="card">
              <div className="card-title">💰 สรุปเงินรอบนี้</div>
              {unpaid.map((p) => <ReadOnlyPlayerRow key={p.id} state={state} p={p} />)}
            </div>
          )}
          {carriedOver.length > 0 && (
            <div className="card">
              <div className="card-title">🔴 ค้างจ่ายรอบก่อน</div>
              {carriedOver.map((p) => <ReadOnlyPlayerRow key={p.id} state={state} p={p} />)}
            </div>
          )}
          {(paid.length > 0 || clearedOldDebt.length > 0) && (
            <div className="card">
              <div className="card-title">✅ จ่ายเงินแล้ว</div>
              {paid.map((p) => <ReadOnlyPlayerRow key={p.id} state={state} p={p} />)}
              {clearedOldDebt.map((p) => <ReadOnlyPlayerRow key={p.id} state={state} p={p} clearedOldDebt />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
