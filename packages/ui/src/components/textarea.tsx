import * as React from "react";

import { cn } from "@ui/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "text-foreground bg-background placeholder:text-muted-foreground w-full min-w-0 rounded-md border border-border px-3 py-2 text-xs shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "ring-0 focus-visible:ring-1 focus-visible:ring-border",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "min-h-form-textarea resize-y",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
