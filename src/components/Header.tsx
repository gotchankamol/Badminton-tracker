"use client";

import { useEffect, useState } from "react";

function formatClock() {
  const now = new Date();
  const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return `${dateStr} · ${timeStr} น.`;
}

export default function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  // Starts empty and fills in on mount (not via the lazy initializer) so server-rendered
  // HTML never bakes in a timestamp that could mismatch the client's clock during hydration.
  const [clock, setClock] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClock(formatClock());
    const t = setInterval(() => setClock(formatClock()), 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <header>
      <svg className="mascot" viewBox="0 0 64 64" fill="none">
        <path d="M32 30 L14 8 M32 30 L23 5 M32 30 L32 4 M32 30 L41 5 M32 30 L50 8" stroke="#3AB0FF" strokeWidth={5} strokeLinecap="round" />
        <path d="M32 30 L14 8 M32 30 L23 5 M32 30 L32 4 M32 30 L41 5 M32 30 L50 8" stroke="#9B6BFF" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
        <circle cx={32} cy={42} r={15} fill="#FFB84D" stroke="#2B2140" strokeWidth={3} />
        <circle cx={27} cy={40} r={2.6} fill="#2B2140" />
        <circle cx={37} cy={40} r={2.6} fill="#2B2140" />
        <path d="M25 47 Q32 53 39 47" stroke="#2B2140" strokeWidth={2.6} strokeLinecap="round" fill="none" />
        <circle cx={21} cy={43} r={3} fill="#FF9FB8" opacity={0.7} />
        <circle cx={43} cy={43} r={3} fill="#FF9FB8" opacity={0.7} />
      </svg>
      <div className="title-block">
        <div className="eyebrow">Shuttle Ledger</div>
        <h1>บันทึกลูกแบด</h1>
        <div className="clock">{clock}</div>
      </div>
      <div className="toolbar">
        <button className="icon-btn" title="ตั้งค่า" onClick={onOpenSettings}>⚙️</button>
      </div>
    </header>
  );
}
