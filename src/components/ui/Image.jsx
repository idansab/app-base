import * as React from "react";
import { cn } from "@/lib/utils";

const Image = React.forwardRef(({ className, src, alt, ...props }, ref) => {
  return (
    <img
      className={cn("object-cover rounded-md", className)}
      ref={ref}
      src={src}
      alt={alt}
      {...props}
    />
  );
});
Image.displayName = "Image";

export { Image };
