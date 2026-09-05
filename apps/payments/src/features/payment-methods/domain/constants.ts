import { AlignLeft, Hash, Mail, Type } from "lucide-react";

import type { FormFieldType } from "./types";

/** React Query base key for payment methods list queries */

export const FIELD_TYPE_ICONS: Record<FormFieldType, typeof Type> = {
  text: Type,
  email: Mail,
  number: Hash,
  textarea: AlignLeft,
};
