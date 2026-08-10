"use client";

import { useState } from "react";
import type { AppState } from "@/lib/types";
import { paidTotal, playerOwed, playerPaymentBreakdown, playerUsage, sortedRoster } from "@/lib/state-helpers";
import { PaymentGroupRow, UnpaidGamesList } from "./PaymentHistoryList";

export default function PlayerHistoryModal({ open, onClose, state }: { open: boolean; onClose: () => void; state: AppState }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (!open) return null;

  function close() {
    setSelectedId(null);
    onClose();
  }

  const players = sortedRoster(state).filter((p) => playerUsage(state, p.id) > 0);
  const selected = selectedId ? state.roster.find((p) => p.id === selectedId) : null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal-card">
        <div className="card-title">
          <span>
            {selected ? (
              <>🧾 {selected.name}{selected.isGuest && " 😎"}</>
            ) : "🧾 ประวัติการจ่ายเงินรายคน"}
          </span>
          <span className="link" onClick={close}>ปิด ✕</span>
        </div>
        {!selected ? (
          <div>
            <div className="hint" style={{ marginTop: 0 }}>แตะชื่อเพื่อดูประวัติการจ่ายเงินทั้งหมดของคนนั้น</div>
            {players.length === 0 ? (
              <div className="roster-empty">ยังไม่มีใครใช้ลูกแบดเลย</div>
            ) : (
              players.map((p) => {
                const count = playerUsage(state, p.id);
                const owed = playerOwed(state, p);
                return (
                  <div className="roster-row" key={p.id} style={{ cursor: "pointer" }} onClick={() => setSelectedId(p.id)}>
                    <div className="rname">{p.name}{p.isGuest && " 😎"}</div>
                    <div style={{ fontSize: 11.5, color: owed > 0 ? "var(--pink)" : "var(--ink-soft)", fontWeight: 700, marginRight: 6 }}>
                      {count} ลูก{owed > 0 ? ` · ค้าง ${owed} บ.` : " · จ่ายครบแล้ว"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div>
            <span className="link" onClick={() => setSelectedId(null)}>← กลับไปเลือกคน</span>
            {(() => {
              const count = playerUsage(state, selected.id);
              const total = count * state.settings.price;
              const paid = Math.min(paidTotal(selected), total);
              const owed = playerOwed(state, selected);
              const { groups, unpaid } = playerPaymentBreakdown(state, selected);
              return (
                <>
                  <div className="hint" style={{ marginTop: 8, marginBottom: 10 }}>
                    รวม {count} ลูก ({total} บ.) · จ่ายแล้ว {paid} บ.{owed > 0 ? ` · ค้าง ${owed} บ.` : ""}
                  </div>
                  <div className="pay-history">
                    {groups.length === 0 && unpaid.length === 0 && (
                      <div style={{ fontSize: 12.5, opacity: 0.7 }}>ยังไม่มีประวัติการจ่ายเงิน</div>
                    )}
                    {groups.map((grp, i) => <PaymentGroupRow key={grp.payment.id} grp={grp} num={i + 1} />)}
                    <UnpaidGamesList unpaid={unpaid} />
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
