"use client";

import { useState, type FormEvent } from "react";
import { verifyAccessCode } from "@/lib/session-actions";

export default function GateScreen() {
  const [pin, setPin] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await verifyAccessCode(pin, nickname);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <div className="card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>🔒</div>
        <h1 style={{ fontSize: 19, marginBottom: 4 }}>ต้องกรอกรหัสผ่านก่อนเข้าใช้งาน</h1>
        <div className="hint" style={{ marginTop: 0 }}>กรอกรหัสผ่านและตั้งชื่อเล่นของคุณ</div>

        <form onSubmit={handleSubmit} style={{ textAlign: "left", marginTop: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>รหัสผ่าน (8 ตัว)</label>
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            maxLength={8}
            autoCapitalize="characters"
            autoComplete="off"
            className="gate-input"
            placeholder="เช่น A7K2P9QZ"
            required
          />
          <label style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>ชื่อเล่นของคุณ</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={30}
            autoComplete="off"
            className="gate-input"
            placeholder="เช่น น้องเอ"
            required
          />
          {error && (
            <div style={{ color: "var(--pink)", fontSize: 13, fontWeight: 700, marginTop: -4, marginBottom: 12 }}>
              ⚠️ {error}
            </div>
          )}
          <button className="save" type="submit" disabled={loading}>
            {loading ? "กำลังตรวจสอบ..." : "เข้าใช้งาน"}
          </button>
        </form>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "2px dashed rgba(43,33,64,0.2)" }}>
          <div className="hint" style={{ marginTop: 0 }}>ยังไม่มีรหัสผ่าน?</div>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>ขอรหัสเข้าใช้งานได้ที่ LINE นี้</div>
          <a
            href="https://line.me/ti/p/qt83xgp1QQ"
            target="_blank"
            rel="noopener noreferrer"
            className="save"
            style={{ display: "inline-block", width: "auto", background: "var(--green)", textDecoration: "none", padding: "10px 22px" }}
          >
            &gt;&gt;&gt; คลิกที่นี่ &lt;&lt;&lt;
          </a>
          <div style={{ marginTop: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/line-qr.jpg"
              alt="LINE QR Code"
              style={{ width: 160, height: 160, borderRadius: 12, border: "3px solid var(--ink)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
