const STATUS_DOT_COLORS = {
  operational: "bg-success",
  degraded: "bg-warning",
  down: "bg-destructive",
} as const;

interface StatusRowProps {
  label: string;
  status: "operational" | "degraded" | "down";
  statusLabel: string;
}

export function StatusRow({ label, status, statusLabel }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span
          className={`size-1.5 rounded-full ${STATUS_DOT_COLORS[status]}`}
        />
        <span className="font-mono text-[10px] text-muted-foreground/60">
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
