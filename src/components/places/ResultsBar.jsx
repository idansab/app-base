import React from "react";
import { ArrowUpDown, FilterX } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { key: "rating", label: "מדורגים" },
  { key: "distance", label: "קרובים" },
  { key: "name", label: "לפי שם" },
];

export default function ResultsBar({
  total,
  sortBy,
  onChangeSort,
  hasFilters,
  onClear,
  distanceDisabled,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        נמצאו <span className="font-semibold text-foreground">{total}</span> מקומות
      </p>

      <div className="flex items-center gap-1.5">
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
          <ArrowUpDown className="h-3.5 w-3.5" />
          מיון
        </span>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          {OPTIONS.map((option) => {
            const disabled = option.key === "distance" && distanceDisabled;
            return (
              <button
                key={option.key}
                type="button"
                disabled={disabled}
                onClick={() => onChangeSort(option.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition",
                  sortBy === option.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  disabled && "cursor-not-allowed opacity-40"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            <FilterX className="h-3.5 w-3.5" />
            ניקוי
          </button>
        ) : null}
      </div>
    </div>
  );
}