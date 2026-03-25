"use client";

import type { Control } from "react-hook-form";
import { useController } from "react-hook-form";
import { tid } from "shared";
import { Input, Switch } from "ui";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface TypeDetailFieldProps {
  control: Control<ProductFormValues>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic paths from type_details_* objects
  fieldPath: any;
  label: string;
  placeholder: string;
  type: "text" | "number" | "boolean";
}

export function TypeDetailField({
  control,
  fieldPath,
  label,
  placeholder,
  type,
}: TypeDetailFieldProps) {
  const { field } = useController({ control, name: fieldPath });
  const { ref, name, value, onChange, onBlur } = field;

  if (type === "boolean") {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border-2 border-dashed border-foreground/20 p-3"
        {...tid(`type-detail-${fieldPath}`)}
      >
        <Switch
          ref={ref}
          name={name}
          checked={Boolean(value)}
          onCheckedChange={(checked: boolean) =>
            onChange({ target: { value: checked } })
          }
        />
        <span className="font-display text-xs font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
    );
  }

  const stringValue = value == null ? "" : String(value);

  return (
    <div
      className="flex flex-col gap-1 rounded-xl border-2 border-dashed border-foreground/20 p-3"
      {...tid(`type-detail-${fieldPath}`)}
    >
      <span className="font-display text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <Input
        ref={ref}
        name={name}
        value={stringValue}
        onChange={onChange}
        onBlur={onBlur}
        type={type === "number" ? "number" : "text"}
        placeholder={placeholder}
        className="border-none bg-transparent p-0 text-sm shadow-none outline-none focus-visible:ring-0"
      />
    </div>
  );
}
