"use client";

import { useState, useEffect } from "react";

import { cn } from "@ui/utils/cn";

const PHASE_INTERVAL_MS = 2800;

interface AnalysisProgressProps {
  /** Rotating phase messages displayed during loading */
  phases: string[];
  /** Optional label displayed before the phase text */
  label?: string;
  className?: string;
}

/**
 * Animated loading indicator that cycles through analysis phases.
 * Gives users feedback that complex processing is actively happening,
 * without requiring knowledge of actual progress.
 *
 * Pure component - pass translated strings via props.
 */
function AnalysisProgress({ phases, label, className }: AnalysisProgressProps) {
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    if (phases.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentPhase((prev) => (prev + 1) % phases.length);
    }, PHASE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [phases.length]);

  if (phases.length === 0) return null;

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Animated spinner */}
        <div className="relative size-5 shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-brand/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand animate-spin" />
        </div>

        {/* Phase text with crossfade */}
        <div className="flex items-center gap-1.5 min-w-0">
          {label && (
            <span className="text-sm font-medium text-foreground shrink-0">
              {label}
            </span>
          )}
          <span
            key={currentPhase}
            className="text-sm text-muted-foreground truncate animate-in fade-in duration-500"
          >
            {phases[currentPhase]}
          </span>
        </div>
      </div>

      {/* Indeterminate progress bar */}
      <div className="h-0.5 bg-muted progress-indeterminate" />
    </div>
  );
}

export { AnalysisProgress };
export type { AnalysisProgressProps };
