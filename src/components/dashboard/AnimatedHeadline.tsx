"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function useTypewriter(text: string, speedMs = 28) {
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

export default function AnimatedHeadline({ name }: { name: string }) {
  const firstName = useMemo(() => name.split(" ")[0] || "друг", [name]);
  const line = useTypewriter(`Собирай, оценивай и делись — ${firstName}`, 26);

  return (
    <div className="space-y-1">
      <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">
        Медиатека
        <span className="ml-2 inline-block align-middle w-2 h-2 rounded-full bg-primary animate-pulse" />
      </h1>
      <p className={cn("text-muted-foreground min-h-[22px]")}>
        {line}
        <span className="inline-block w-[1ch] text-muted-foreground/50 animate-pulse">▍</span>
      </p>
    </div>
  );
}

