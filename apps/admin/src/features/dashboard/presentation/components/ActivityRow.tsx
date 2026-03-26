const ACTION_COLORS = {
  INSERT: "bg-mint/20 text-mint border-mint/40",
  UPDATE: "bg-sky/20 text-sky border-sky/40",
  DELETE: "bg-peach/20 text-peach border-peach/40",
} as const;

interface ActivityRowProps {
  action: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  time: string;
  user: string;
}

export function ActivityRow({ action, table, time, user }: ActivityRowProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span
        className={`inline-flex rounded-sm border px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${ACTION_COLORS[action]}`}
      >
        {action}
      </span>
      <span className="font-mono text-sm text-foreground">{table}</span>
      <span className="ml-auto flex items-center gap-3 text-muted-foreground">
        <span className="font-mono text-xs">{user}</span>
        <span className="font-mono text-[10px]">{time}</span>
      </span>
    </div>
  );
}
