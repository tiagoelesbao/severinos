"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type EditTab = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export function ProductEditTabsBar({
  tabs,
  active,
  onChange,
}: {
  tabs: EditTab[];
  active: string;
  onChange: (value: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollBy(amount: number) {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <div className="flex items-center gap-1 border-b border-border">
      <button
        type="button"
        onClick={() => scrollBy(-200)}
        className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
        aria-label="Rolar para esquerda"
      >
        <ChevronLeft className="size-4" />
      </button>
      <div ref={scrollRef} className="flex flex-1 gap-5 overflow-x-auto scroll-smooth [scrollbar-width:none]">
        {tabs.map((tab) => {
          const isActive = tab.value === active;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => scrollBy(200)}
        className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
        aria-label="Rolar para direita"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
