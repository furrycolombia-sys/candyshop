interface StatusRowProps {
  label: string;
  status: "operational" | "degraded" | "down";
  statusLabel: string;
}

function getDotClass(status: StatusRowProps["status"]): string {
  switch (status) {
    case "operational": {
      return "bg-success";
    }
    case "degraded": {
      return "bg-warning";
    }
    case "down": {
      return "bg-destructive";
    }
  }
}

export function StatusRow({ label, status, statusLabel }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${getDotClass(status)}`} />
        <span className="font-mono text-ui-xs text-muted-foreground/60">
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
