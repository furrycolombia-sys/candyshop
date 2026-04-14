"use client";

import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { tid } from "shared";
import { Popover, PopoverContent, PopoverTrigger } from "ui";

const MAX_VISIBLE = 42;

/** Convert PascalCase (legacy DB) or any casing to kebab-case for DynamicIcon */
function toKebab(name: string): IconName {
  return name
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replaceAll(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase() as IconName;
}

interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
  themeBg: string;
}

export function IconPicker({ value, onChange, themeBg }: IconPickerProps) {
  const t = useTranslations("form.inlineEditor");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return iconNames.slice(0, MAX_VISIBLE);
    const q = search.toLowerCase();
    return iconNames.filter((n) => n.includes(q)).slice(0, MAX_VISIBLE);
  }, [search]);

  const handleSelect = useCallback(
    (name: string) => {
      onChange(name);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  const displayName = toKebab(value || "sparkles");

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`w-fit border-strong border-foreground ${themeBg} p-2 shadow-brutal-sm cursor-pointer transition-opacity hover:opacity-80`}
          aria-label={t("chooseIcon")}
          {...tid("icon-picker-trigger")}
        >
          <DynamicIcon name={displayName} className="size-6" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0"
        side="right"
        align="start"
        {...tid("icon-picker-panel")}
      >
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchIcons")}
          autoFocus
          className="w-full border-b-2 border-foreground/20 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/50"
          {...tid("icon-picker-search")}
        />

        {/* Icon grid */}
        <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto p-2">
          {filtered.map((name) => {
            const isSelected = name === toKebab(value);
            const selectedClass = `${themeBg} border-2 border-foreground`;
            return (
              <button
                key={name}
                type="button"
                onClick={() => handleSelect(name)}
                className={`flex items-center justify-center size-8 transition-colors ${isSelected ? selectedClass : "hover:bg-muted"}`}
                title={name}
              >
                <DynamicIcon name={name} className="size-4" />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-8 py-4 text-center text-xs text-muted-foreground">
              {t("noIconsFound")}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
