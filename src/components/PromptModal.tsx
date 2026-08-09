"use client";

import { useEffect, useRef, useState } from "react";

export type PromptRequest = { title: string; defaultValue: string; resolve: (v: string | null) => void };

function PromptModalInner({ request }: { request: PromptRequest }) {
  const [value, setValue] = useState(request.defaultValue || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) request.resolve(null); }}>
      <div className="modal-card">
        <div className="card-title">{request.title}</div>
        <input
          ref={inputRef}
          type="text"
          maxLength={30}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              request.resolve(value);
            }
          }}
          style={{
            width: "100%", background: "var(--blue-soft)", border: "2px solid var(--blue)", borderRadius: 12,
            padding: "11px 14px", color: "var(--ink)", fontSize: 15, fontWeight: 600, marginTop: 4,
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            className="save"
            style={{ flex: 1, background: "var(--card)", color: "var(--ink)", border: "3px solid var(--ink)" }}
            onClick={() => request.resolve(null)}
          >
            ยกเลิก
          </button>
          <button className="save" style={{ flex: 1, background: "var(--green)" }} onClick={() => request.resolve(value)}>
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PromptModal({ request }: { request: PromptRequest | null }) {
  if (!request) return null;
  // Keying on the request forces a fresh mount (and fresh initial state) each time a new
  // prompt is opened, instead of resetting state from an effect.
  return <PromptModalInner key={`${request.title}:${request.defaultValue}`} request={request} />;
}
