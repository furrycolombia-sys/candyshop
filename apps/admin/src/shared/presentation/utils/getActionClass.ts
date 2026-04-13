/** Map an audit action type to its Tailwind color classes */
export function getActionClass(action: "INSERT" | "UPDATE" | "DELETE"): string {
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
    default: {
      return "";
    }
  }
}
