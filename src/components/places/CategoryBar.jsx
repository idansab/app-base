import React from "react";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

const BASE =
"inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 font-semibold transition text-sm";

export default function CategoryBar({ value, onChange }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          BASE,
          !value ?
          "border-primary bg-primary text-primary-foreground shadow-sm bg-[hsl(var(--primary))] text-[hsl(var(--background))]" :
          "border-border hover:border-primary/40 hover:text-foreground"
        )}>
        
        הכל
      </button>
      {CATEGORIES.map((category) => {
        const Icon = category.icon;
        const active = value === category.key;
        return (
          <button
            key={category.key}
            type="button"
            onClick={() => onChange(active ? null : category.key)}
            className={cn(
              BASE,
              active ?
              "border-primary text-primary-foreground shadow-sm bg-[hsl(var(--primary-foreground))] bg-[#75b36b]" :
              "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}>
            
            <Icon className="h-3.5 w-3.5" />
            {category.label}
          </button>);

      })}
    </div>);

}