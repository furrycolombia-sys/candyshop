"use client";

import { useTranslations } from "next-intl";

import { validateFileSize } from "@/shared/domain/paymentMethodUtils";

// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- 10 MB in bytes
const MAX_FILE_BYTES = 10 * 1024 * 1024;

interface FileInputProps {
  id: string;
  disabled: boolean;
  onFileChange?: (file: File | null) => void;
  onChange: (value: string) => void;
  onFileSizeError?: (message: string | null) => void;
}

export function FileInput({
  id,
  disabled,
  onFileChange,
  onChange,
  onFileSizeError,
}: FileInputProps) {
  const t = useTranslations("checkout");
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      onFileChange?.(null);
      onChange("");
      onFileSizeError?.(null);
      return;
    }
    if (!validateFileSize(file.size)) {
      e.target.value = "";
      onFileChange?.(null);
      onChange("");
      onFileSizeError?.(
        t("fileSizeExceeded", {
          multiplier: (file.size / MAX_FILE_BYTES).toFixed(1),
        }),
      );
      return;
    }
    onFileSizeError?.(null);
    onFileChange?.(file);
    onChange(file.name);
  };

  return (
    <input
      id={id}
      type="file"
      accept="image/*,.pdf"
      disabled={disabled}
      onChange={handleChange}
      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:font-semibold disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
