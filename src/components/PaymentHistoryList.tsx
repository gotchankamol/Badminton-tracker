"use client";

import type { CoveredGame, PaymentGroup } from "@/lib/state-helpers";

export function shortThaiDateTime(createdAt: string, fallbackDate: string): string {
  const dt = createdAt ? new Date(createdAt) : null;
  if (dt) {
    return dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) + " " + dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
  }
  const [y, m, d] = fallbackDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export function PaymentGroupRow({ grp, num }: { grp: PaymentGroup; num: number }) {
  const dt = grp.payment.at ? new Date(grp.payment.at) : null;
  const dateTimeStr = dt
    ? dt.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) + " " + dt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น."
    : "";
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="pay-history-row" style={{ fontWeight: 800, color: "var(--ink)" }}>
        <span>🧾 ครั้งที่ {num}{dateTimeStr ? " · " + dateTimeStr : ""}</span>
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
}

export function UnpaidGamesList({ unpaid }: { unpaid: CoveredGame[] }) {
  if (unpaid.length === 0) return null;
  return (
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
  );
}
