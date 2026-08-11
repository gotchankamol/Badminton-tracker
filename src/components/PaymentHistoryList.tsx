"use client";

import type { CoveredGame, PaymentGroup } from "@/lib/state-helpers";

export function shortThaiDateTime(createdAt: string, fallbackDate: string): string {
  const dt = createdAt ? new Date(createdAt) : null;
  if (dt) {
    return "🕐 " + dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) + " " + dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
  }
  const [y, m, d] = fallbackDate.split("-").map(Number);
  return "🕐 " + new Date(y, m - 1, d).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function shuttleNumbersStr(numbers: string[]): string {
  return numbers.length > 0 ? "หมายเลข " + numbers.join(", ") : "-";
}

export function PaymentGroupRow({ grp, num }: { grp: PaymentGroup; num: number }) {
  const dt = grp.payment.at ? new Date(grp.payment.at) : null;
  const dateTimeStr = dt
    ? "🕐 " + dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) + " " + dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น."
    : "";
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="pay-history-row" style={{ fontWeight: 800, color: "var(--ink)" }}>
        <span>🧾 จ่ายครั้งที่ {num}{dateTimeStr ? " · " + dateTimeStr : ""}</span>
        <span>{grp.payment.amount} บาท</span>
      </div>
      {grp.games.length === 0 && (
        <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, padding: "2px 0 0 14px" }}>ไม่มีข้อมูลรายการละเอียดของยอดนี้</div>
      )}
      {grp.games.map((cg, ci) => (
        <div key={ci} style={{ padding: "3px 0 3px 14px", borderBottom: "1px dashed rgba(43,33,64,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
            <span>{shuttleNumbersStr(cg.entry.numbers)} <span style={{ opacity: 0.7, fontWeight: 600 }}>· {shortThaiDateTime(cg.entry.createdAt, cg.entry.date)}</span></span>
            <span>×{cg.unitsCovered}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{cg.entry.namesStr}</div>
        </div>
      ))}
    </div>
  );
}

function UnpaidGameRow({ cg }: { cg: CoveredGame }) {
  return (
    <div style={{ padding: "3px 0 3px 14px", borderBottom: "1px dashed rgba(43,33,64,0.1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
        <span>{shuttleNumbersStr(cg.entry.numbers)} <span style={{ opacity: 0.7, fontWeight: 600 }}>· {shortThaiDateTime(cg.entry.createdAt, cg.entry.date)}</span></span>
        <span>×{cg.unitsCovered}</span>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{cg.entry.namesStr}</div>
    </div>
  );
}

// When price + currentRoundStart are given, the unpaid list is split into "this round"
// vs "carried over from before" groups (each with its own baht subtotal) instead of one
// flat list — lets a player see at a glance how much of what they owe is from today.
export function UnpaidGamesList({
  unpaid,
  price,
  currentRoundStart,
}: {
  unpaid: CoveredGame[];
  price?: number;
  currentRoundStart?: string;
}) {
  if (unpaid.length === 0) return null;

  if (price != null && currentRoundStart) {
    const roundStart = new Date(currentRoundStart);
    const roundGames = unpaid.filter((cg) => new Date(cg.entry.createdAt) >= roundStart);
    const oldGames = unpaid.filter((cg) => new Date(cg.entry.createdAt) < roundStart);
    const roundTotal = roundGames.reduce((s, cg) => s + cg.unitsCovered, 0) * price;
    const oldTotal = oldGames.reduce((s, cg) => s + cg.unitsCovered, 0) * price;
    return (
      <div>
        {roundGames.length > 0 && (
          <div>
            <div className="pay-history-row" style={{ fontWeight: 800, color: "var(--pink)" }}>
              <span>🔴 ยังไม่จ่าย · รอบนี้</span>
              <span>{roundTotal} บาท</span>
            </div>
            {roundGames.map((cg, ci) => <UnpaidGameRow key={ci} cg={cg} />)}
          </div>
        )}
        {oldGames.length > 0 && (
          <div style={{ marginTop: roundGames.length > 0 ? 6 : 0 }}>
            <div className="pay-history-row" style={{ fontWeight: 800, color: "var(--pink)" }}>
              <span>🔴 ยังไม่จ่าย · รอบก่อน</span>
              <span>{oldTotal} บาท</span>
            </div>
            {oldGames.map((cg, ci) => <UnpaidGameRow key={ci} cg={cg} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="pay-history-row" style={{ fontWeight: 800, color: "var(--pink)" }}>🔴 ยังไม่จ่าย</div>
      {unpaid.map((cg, ci) => <UnpaidGameRow key={ci} cg={cg} />)}
    </div>
  );
}
