"use client";

import { useEffect, useMemo } from "react";

const CORNERS: Array<React.CSSProperties> = [
  { top: "10%", left: "12%" },
  { top: "10%", right: "12%" },
  { bottom: "16%", left: "18%" },
  { bottom: "16%", right: "18%" },
];

const SPARK_COLORS = ["#FF9F1C", "#FF5D8F", "#3AB0FF", "#06D6A0", "#9B6BFF", "#E8B400"];

// How far and how big the corner sparks are — 3x the original size/travel distance.
const SPARK_SCALE = 3;

function makeSparks(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = (34 + Math.random() * 26) * SPARK_SCALE;
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      color: SPARK_COLORS[i % SPARK_COLORS.length],
      delay: Math.random() * 0.3,
    };
  });
}

const DISPLAY_MS = 4200;

export default function RoundEndCelebration({ show, onDone }: { show: boolean; onDone: () => void }) {
  const particleSets = useMemo(() => CORNERS.map(() => makeSparks(9)), []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDone, DISPLAY_MS);
    return () => clearTimeout(t);
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, pointerEvents: "none", overflow: "hidden" }}>
      {CORNERS.map((pos, ci) => (
        <div key={ci} style={{ position: "absolute", ...pos, width: 4, height: 4 }}>
          {particleSets[ci].map((p) => (
            <span
              key={p.id}
              style={
                {
                  position: "absolute",
                  width: 7 * SPARK_SCALE,
                  height: 7 * SPARK_SCALE,
                  borderRadius: "50%",
                  background: p.color,
                  animation: `roundend-spark 1.8s ease-out ${p.delay}s forwards`,
                  "--dx": `${p.dx}px`,
                  "--dy": `${p.dy}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="roundend-badge">
          <div className="roundend-circle">✓</div>
          <div className="roundend-label">จบรอบแล้ว!</div>
        </div>
      </div>
    </div>
  );
}
