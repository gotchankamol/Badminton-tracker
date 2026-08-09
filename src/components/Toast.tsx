"use client";

export default function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div id="toastBox" style={{ display: "block" }}>
      {message}
    </div>
  );
}
