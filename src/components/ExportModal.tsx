"use client";

import { useEffect, useRef, useState } from "react";
import type { AppState } from "@/lib/types";
import { buildReportData, reportTotals } from "@/lib/state-helpers";

export type ExportMode = "text" | "csv" | "image" | null;

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function ExportModal({
  mode,
  onClose,
  state,
  showToast,
}: {
  mode: ExportMode;
  onClose: () => void;
  state: AppState;
  showToast: (msg: string) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const data = buildReportData(state);
  const now = new Date();

  let title = "";
  let hint = "";
  let text = "";

  if (mode === "text") {
    title = "💬 สรุปข้อความ";
    hint = 'กด "คัดลอก" แล้ววางในแชทไลน์ หรือแอปอื่นได้เลย';
    const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
    const { totalShuttles, totalOwed, totalPaid } = reportTotals(state, data);
    text = `🏸 สรุปลูกแบด - ${dateStr}\n\n`;
    text += `ลูกแบดที่ใช้ทั้งหมด: ${totalShuttles} ลูก\n`;
    text += `ค้างจ่ายรวม: ${totalOwed} บาท\n`;
    text += `จ่ายแล้วรวม: ${totalPaid} บาท\n\n`;
    text += `รายชื่อ:\n`;
    data.forEach((r) => {
      text += `- ${r.name}: ${r.count} ลูก, ${r.owed > 0 ? `ค้าง ${r.owed} บาท` : `จ่ายครบแล้ว (${r.total} บาท)`}\n`;
    });
  } else if (mode === "csv") {
    title = "📊 สรุป CSV";
    hint = 'กด "คัดลอก" แล้ววางลงใน Google Sheets หรือ Excel ได้เลย (คั่นด้วยจุลภาค)';
    text = "ชื่อ,จำนวนลูก,ยอดรวม,จ่ายแล้ว,ค้างจ่าย,จำนวนครั้งที่จ่าย\n";
    data.forEach((r) => { text += `${r.name},${r.count},${r.total},${r.paid},${r.owed},${r.paymentsCount}\n`; });
  } else if (mode === "image") {
    title = "🖼️ รูปสรุป";
    hint = 'กดค้างที่รูปด้านล่างเพื่อบันทึก หรือแคปหน้าจอ';
  }

  useEffect(() => {
    if (mode !== "image") return;
    const dateStr = now.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
    const timeStr = now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    const { totalShuttles, totalOwed, totalPaid } = reportTotals(state, data);

    const width = 680;
    const rowH = 48;
    const headerH = 160;
    const height = headerH + data.length * rowH + 50;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#FFF6E0");
    bgGrad.addColorStop(1, "#C9EEFF");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    roundRectPath(ctx, 16, 16, width - 32, height - 32, 20);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fill();

    ctx.fillStyle = "#2B2140";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("🏸 สรุปลูกแบด", 34, 58);
    ctx.font = "600 15px sans-serif";
    ctx.fillStyle = "#7A7191";
    ctx.fillText(`${dateStr} · ${timeStr} น.`, 34, 84);

    ctx.font = "700 14px sans-serif";
    ctx.fillStyle = "#2B2140";
    ctx.fillText(`ลูกแบดที่ใช้: ${totalShuttles} ลูก   ค้างจ่าย: ${totalOwed} บ.   จ่ายแล้ว: ${totalPaid} บ.`, 34, 112);

    ctx.strokeStyle = "rgba(43,33,64,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, headerH - 10);
    ctx.lineTo(width - 30, headerH - 10);
    ctx.stroke();

    data.forEach((r, i) => {
      const rowY = headerH + i * rowH;
      if (i % 2 === 0) {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillRect(30, rowY, width - 60, rowH);
      }
      ctx.fillStyle = "#2B2140";
      ctx.font = "700 17px sans-serif";
      ctx.fillText(r.name, 44, rowY + 30);
      ctx.font = "600 13px sans-serif";
      ctx.fillStyle = "#7A7191";
      ctx.fillText(`${r.count} ลูก`, 250, rowY + 30);
      ctx.textAlign = "right";
      ctx.font = "800 16px sans-serif";
      ctx.fillStyle = r.owed > 0 ? "#FF5D8F" : "#0BAE84";
      ctx.fillText(r.owed > 0 ? `ค้าง ${r.owed} บ.` : `จ่ายครบ ${r.total} บ.`, width - 44, rowY + 30);
      ctx.textAlign = "left";
    });

    canvasRef.current = canvas;
    // Rendering the report to a canvas is an unavoidable browser-only side effect;
    // the resulting data URL can only be known after this effect runs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageUrl(canvas.toDataURL("image/png"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!mode) return null;

  if (data.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card">
          <div className="card-title">{title} <span className="link" onClick={onClose}>ปิด ✕</span></div>
          <div className="hint" style={{ marginTop: 0 }}>ยังไม่มีข้อมูลให้สรุป</div>
        </div>
      </div>
    );
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      showToast("คัดลอกแล้ว วางในแชทหรือไฟล์ได้เลย");
    } catch {
      showToast("คัดลอกอัตโนมัติไม่สำเร็จ — เลือกข้อความในช่องแล้วคัดลอกเองได้เลย");
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card">
        <div className="card-title">{title} <span className="link" onClick={onClose}>ปิด ✕</span></div>
        <div className="hint" style={{ marginTop: 0 }}>{hint}</div>
        {mode === "image" ? (
          imageUrl && <img src={imageUrl} alt="สรุปรายงาน" style={{ width: "100%", borderRadius: 14, border: "2px solid var(--ink)" }} />
        ) : (
          <>
            <textarea className="mono-box" readOnly value={text} onClick={(e) => e.currentTarget.select()} />
            <button className="save" style={{ width: "100%", background: "var(--pink)", marginTop: 10 }} onClick={copyText}>📋 คัดลอก</button>
          </>
        )}
      </div>
    </div>
  );
}
