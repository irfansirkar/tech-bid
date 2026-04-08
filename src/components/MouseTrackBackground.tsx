"use client";

import { useEffect, useRef } from "react";

export default function MouseTrackBackground() {
  const auroraRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);

  // Smoothly interpolated mouse position
  const mouse = useRef({ x: 0.5, y: 0.5 });
  const current = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      let clientX: number, clientY: number;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      mouse.current = {
        x: clientX / window.innerWidth,
        y: clientY / window.innerHeight,
      };
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });

    const tick = () => {
      // Lerp toward mouse
      const lerp = 0.06;
      current.current.x += (mouse.current.x - current.current.x) * lerp;
      current.current.y += (mouse.current.y - current.current.y) * lerp;

      const { x, y } = current.current;

      if (auroraRef.current) {
        // Main aurora blob follows cursor
        auroraRef.current.style.transform = `translate(${x * 100 - 50}%, ${y * 100 - 50}%)`;
        auroraRef.current.style.left = `${x * 100}%`;
        auroraRef.current.style.top = `${y * 100}%`;
      }

      if (trailRef.current) {
        // Secondary orb moves opposite / lagging for depth
        const ox = 1 - x;
        const oy = 1 - y;
        trailRef.current.style.left = `${ox * 100}%`;
        trailRef.current.style.top = `${oy * 100}%`;
        trailRef.current.style.transform = `translate(${ox * 100 - 50}%, ${oy * 100 - 50}%)`;
      }

      raf.current = requestAnimationFrame(tick);
    };

    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Base deep-space gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 20% 50%, #0f0524 0%, #060612 40%, #00040f 100%)",
        }}
      />

      {/* Grid mesh */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Mouse-tracking primary aurora */}
      <div
        ref={auroraRef}
        className="absolute"
        style={{
          width: "700px",
          height: "700px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.25) 0%, rgba(109,40,217,0.12) 35%, transparent 70%)",
          filter: "blur(60px)",
          willChange: "transform, left, top",
          transition: "none",
        }}
      />

      {/* Counter-orbit secondary glow */}
      <div
        ref={trailRef}
        className="absolute"
        style={{
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(6,182,212,0.18) 0%, rgba(8,145,178,0.08) 40%, transparent 70%)",
          filter: "blur(80px)",
          willChange: "transform, left, top",
          transition: "none",
        }}
      />

      {/* Static ambient accent — always bottom-right */}
      <div
        className="absolute"
        style={{
          width: "400px",
          height: "400px",
          bottom: "-100px",
          right: "-100px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />
    </div>
  );
}
