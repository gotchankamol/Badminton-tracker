"use client";

export type ConfirmRequest = { message: string; resolve: (v: boolean) => void };

export default function ConfirmModal({ request }: { request: ConfirmRequest | null }) {
  if (!request) return null;
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) request.resolve(false); }}>
      <div className="modal-card">
        <div className="card-title">⚠️ ยืนยัน</div>
        <div className="hint" style={{ marginTop: 0, fontSize: 13.5, lineHeight: 1.6 }}>{request.message}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button
            className="save"
            style={{ flex: 1, background: "var(--card)", color: "var(--ink)", border: "3px solid var(--ink)" }}
            onClick={() => request.resolve(false)}
          >
            ยกเลิก
          </button>
          <button className="save" style={{ flex: 1, background: "var(--pink)" }} onClick={() => request.resolve(true)}>
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
}
