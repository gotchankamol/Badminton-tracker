"use client";

import { useEffect, useRef } from "react";

export default function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0;
    let dots: { x: number; y: number; r: number; vy: number; color: string }[] = [];
    let raf = 0;

    function resize() {
      w = canvas!.width = window.innerWidth;
      h = canvas!.height = window.innerHeight;
    }
    function initDots() {
      const colors = ["#FF9F1C", "#FF5D8F", "#3AB0FF", "#06D6A0", "#9B6BFF"];
      dots = Array.from({ length: 18 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 2 + Math.random() * 3,
        vy: 0.15 + Math.random() * 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
    }
    function tick() {
      ctx!.clearRect(0, 0, w, h);
      dots.forEach((d) => {
        d.y += d.vy;
        if (d.y > h) d.y = -5;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx!.fillStyle = d.color;
        ctx!.globalAlpha = 0.35;
        ctx!.fill();
        ctx!.globalAlpha = 1;
      });
      raf = requestAnimationFrame(tick);
    }
    resize();
    initDots();
    tick();
    const onResize = () => { resize(); initDots(); };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas className="confetti" ref={canvasRef} />;
}
