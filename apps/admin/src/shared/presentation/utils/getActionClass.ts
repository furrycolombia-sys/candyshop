/**
 * Map an audit action type to its Tailwind color classes.
 *
 * Colour lives in the border and the fill; the text does not carry it. These
 * read `bg-X/20 text-X` -- a palette colour on a 20% tint of itself -- which
 * axe measured at 1.72:1 against a required 4.5:1 on every audit row. The
 * same shape was in four badge components across admin and payments and is
 * corrected the same way there.
 */
export function getActionClass(action: "INSERT" | "UPDATE" | "DELETE"): string {
  switch (action) {
    case "INSERT": {
      return "border-mint bg-mint/20 text-foreground";
    }
    case "UPDATE": {
      return "border-sky bg-sky/20 text-foreground";
    }
    case "DELETE": {
      return "border-peach bg-peach/20 text-foreground";
    }
    default: {
      return "";
    }
  }
}
