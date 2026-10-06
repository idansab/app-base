import * as React from "react";
import { cn } from "@/lib/utils";

const Sheet = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "fixed z-50 gap-4 inset-0",
        className
      )}
      {...props}
    >
      <div className={cn("pointer-events-none inset-0")}>
        <div className="pointer-events-auto h-full w-full overflow-y-auto overflow-x-hidden"></div>
      </div>
      <div className={cn("relative pointer-events-auto max-h-[85vh] w-full max-w-md")}>
        <div className={cn(
          "flex flex-col bg-popover text-popover-foreground shadow-lg rounded-md border border-border",
          "animate-in slide-in-from-right fade-in z-50"
        )}>{children}</div>
      </div>
    </div>
  );
});
Sheet.displayName = "Sheet";

const SheetContent = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full flex-col overflow-y-hidden",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </div>
  );
});
SheetContent.displayName = "SheetContent";

const SheetDescription = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn(
        "text-sm text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
});
SheetDescription.displayName = "SheetDescription";

const SheetTitle = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <h2
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
});
SheetTitle.displayName = "SheetTitle";

export { Sheet, SheetContent, SheetDescription, SheetTitle };
