import * as React from "react";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef(({ className, defaultValue, value, onChange, ...props }, ref) => {
  const [localValue, setLocalValue] = React.useState(() =>
    Array.isArray(value) ? value : (Array.isArray(defaultValue) ? defaultValue : [0])
  );

  React.useEffect(() => {
    if (typeof value === "number") setLocalValue([value]);
    if (Array.isArray(value)) setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const newVal = [parseFloat(e.target.value)];
    setLocalValue(newVal);
    if (onChange) onChange(newVal[0]);
  };

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={ref}
        type="range"
        min={props.min || 0}
        max={props.max || 100}
        step={props.step || 1}
        value={localValue[0]}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
});
Slider.displayName = "Slider";

export { Slider };
