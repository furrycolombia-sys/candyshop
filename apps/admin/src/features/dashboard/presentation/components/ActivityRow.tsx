interface ActivityRowProps {
  action: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  time: string;
  user: string;
}

function getActionClass(action: ActivityRowProps["action"]): string {
  switch (action) {
    case "INSERT": {
      return "border-mint bg-mint/20 text-mint";
    }
    case "UPDATE": {
      return "border-sky bg-sky/20 text-sky";
    }
    case "DELETE": {
      return "border-peach bg-peach/20 text-peach";
    }
  }
}

export function ActivityRow({ action, table, time, user }: ActivityRowProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span
        className={`inline-flex rounded-sm border px-2 py-0.5 font-mono text-ui-xs font-bold uppercase ${getActionClass(action)}`}
      >
        {action}
      </span>
      <span className="font-mono text-sm text-foreground">{table}</span>
      <span className="ml-auto flex items-center gap-3 text-muted-foreground">
        <span className="font-mono text-xs">{user}</span>
        <span className="font-mono text-ui-xs">{time}</span>
      </span>
    </div>
  );
}
