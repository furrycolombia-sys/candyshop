import * as React from "react";

import { cn } from "@ui/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground bg-input w-full min-w-0 rounded-md border-0 px-3 py-2 text-xs shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "ring-0 focus-visible:ring-1 focus-visible:ring-border",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "min-h-[80px] resize-y",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
