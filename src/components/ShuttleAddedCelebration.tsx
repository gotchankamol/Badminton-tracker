"use client";

import { useEffect } from "react";

const DISPLAY_MS = 2200;

export default function ShuttleAddedCelebration({ show, onDone }: { show: boolean; onDone: () => void }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDone, DISPLAY_MS);
    return () => clearTimeout(t);
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="shuttleadd-badge">
        <div className="shuttleadd-circle">🏸</div>
        <div className="shuttleadd-label">เพิ่มลูกใหม่แล้ว!</div>
      </div>
    </div>
  );
}
