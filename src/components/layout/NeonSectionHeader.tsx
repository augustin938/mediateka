"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function useTypewriter(text: string, speedMs = 24) {
  const [out, setOut] = useState("");
  useEffect(() => {
    let i = 0;
    setOut("");
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, speedMs]);
  return out;
}

export default function NeonSectionHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge?: string;
}) {
  const typed = useTypewriter(subtitle, 22);

  return (
    <div className="relative">
      <div className="absolute -inset-x-6 -top-4 h-16 bg-gradient-to-r from-primary/10 via-fuchsia-500/10 to-cyan-500/10 blur-2xl pointer-events-none" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-black tracking-tight text-foreground">
              <span className="bg-gradient-to-r from-foreground via-primary to-violet-300 bg-clip-text text-transparent">
                {title}
              </span>
            </h1>
            {badge && (
              <span className={cn("text-xs px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-semibold")}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-muted-foreground min-h-[22px]">
            <span className="text-cyan-200/90">{typed}</span>
            <span className="inline-block w-[1ch] text-cyan-200/40 animate-pulse">▍</span>
          </p>
        </div>
        <div className="hidden sm:block w-32 h-px mt-5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </div>
    </div>
  );
}

