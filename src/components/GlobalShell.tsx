"use client";

import MouseTrackBackground from "@/components/MouseTrackBackground";

export default function GlobalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-full flex flex-col">
      <MouseTrackBackground />
      <div className="relative z-10 flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
}
