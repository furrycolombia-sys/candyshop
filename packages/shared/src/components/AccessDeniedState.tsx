"use client";

import { ShieldAlert } from "lucide-react";

import { tid } from "@shared/utils";

interface AccessDeniedStateProps {
  title?: string;
  hint?: string;
}

export function AccessDeniedState({
  title = "Access Denied",
  hint = "You don't have permission to view this page.",
}: AccessDeniedStateProps) {
  return (
    <main
      className="flex flex-1 items-center justify-center bg-dots p-6"
      {...tid("access-denied")}
    >
      <div className="nb-shadow-lg w-full max-w-xl border-3 border-foreground bg-background p-8 text-center">
        <ShieldAlert className="mx-auto mb-4 size-12 text-destructive" />
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
      </div>
    </main>
  );
}
