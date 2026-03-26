"use client";

import {
  ArrowLeft,
  FileDigit,
  Loader2,
  Package,
  RotateCcw,
  Ticket,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  Control,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { useWatch } from "react-hook-form";
import { tid } from "shared";
import type { ProductSection, ProductType } from "shared/types";
import { Switch } from "ui";

import { TemplatePicker } from "./TemplatePicker";

import {
  PRODUCT_CATEGORIES,
  PRODUCT_TYPES,
} from "@/features/products/domain/constants";
import type { ProductFormValues } from "@/features/products/domain/validationSchema";
import { Link } from "@/shared/infrastructure/i18n";

const TYPE_ICONS: Record<ProductType, typeof Package> = {
  merch: Package,
  digital: FileDigit,
  service: Wrench,
  ticket: Ticket,
};

interface EditorToolbarProps {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  onSave: () => void;
  isSaving: boolean;
  isEdit: boolean;
  onApplyTemplate: (sections: ProductSection[]) => void;
  onReset: () => void;
  hasSections: boolean;
}

export function EditorToolbar({
  control,
  register,
  setValue,
  onSave,
  isSaving,
  isEdit,
  onApplyTemplate,
  onReset,
  hasSections,
}: EditorToolbarProps) {
  const t = useTranslations();
  const tEditor = useTranslations("form.inlineEditor");

  const selectedType = useWatch({ control, name: "type" });
  const featured = useWatch({ control, name: "featured" });
  const isActive = useWatch({ control, name: "is_active" });
  const refundable = useWatch({ control, name: "refundable" });

  return (
    <div
      className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b-3 border-foreground bg-foreground px-4 py-3 text-background"
      {...tid("editor-toolbar")}
    >
      {/* Back link */}
      <Link
        href="/"
        className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-background/70 transition-colors hover:text-background"
        {...tid("editor-back-link")}
      >
        <ArrowLeft className="size-4" />
        {tEditor("backToProducts")}
      </Link>

      {/* Separator */}
      <div className="h-6 w-px bg-background/20" />

      {/* Type selector pills */}
      <div className="flex items-center gap-1.5">
        {PRODUCT_TYPES.map((type) => {
          const Icon = TYPE_ICONS[type];
          const isSelected = selectedType === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setValue("type", type)}
              className={`flex items-center gap-1 rounded-full px-3 py-1 font-display text-tiny font-bold uppercase tracking-wider transition-colors ${
                isSelected
                  ? "bg-background text-foreground"
                  : "text-background/60 hover:text-background"
              }`}
              {...tid(`toolbar-type-${type}`)}
            >
              <Icon className="size-3" />
              {t(`productTypes.${type}`)}
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-background/20" />

      {/* Category select */}
      <select
        className="rounded-lg border-2 border-background/30 bg-transparent px-2 py-1 font-display text-tiny font-bold uppercase tracking-wider text-background outline-none"
        {...register("category")}
        {...tid("toolbar-category")}
      >
        {PRODUCT_CATEGORIES.map((cat) => (
          <option
            key={cat}
            value={cat}
            className="bg-foreground text-background"
          >
            {t(`categories.${cat}`)}
          </option>
        ))}
      </select>

      {/* Featured toggle */}
      <label
        className="flex items-center gap-1.5 font-display text-tiny font-bold uppercase tracking-wider text-background/70"
        {...tid("toolbar-featured")}
      >
        <input
          type="checkbox"
          checked={featured ?? false}
          onChange={(e) => setValue("featured", e.target.checked)}
          className="size-3.5 rounded-sm border-2 border-background/40 accent-background"
        />
        {t("products.featured")}
      </label>

      {/* Refundable select */}
      <select
        value={refundable === null ? "" : String(refundable)}
        onChange={(e) => {
          const val = e.target.value;
          setValue("refundable", val === "" ? null : val === "true");
        }}
        className="rounded-lg border-2 border-background/30 bg-transparent px-2 py-1 font-display text-tiny font-bold uppercase tracking-wider text-background outline-none"
        {...tid("toolbar-refundable")}
      >
        <option value="" className="bg-foreground text-background">
          {tEditor("refundable.notSpecified")}
        </option>
        <option value="true" className="bg-foreground text-background">
          {tEditor("refundable.refundable")}
        </option>
        <option value="false" className="bg-foreground text-background">
          {tEditor("refundable.nonRefundable")}
        </option>
      </select>

      {/* Template + Reset */}
      <div className="h-6 w-px bg-background/20" />
      <TemplatePicker onApply={onApplyTemplate} hasSections={hasSections} />
      <button
        type="button"
        onClick={() => {
          if (globalThis.confirm(tEditor("resetConfirm"))) {
            onReset();
          }
        }}
        className="flex items-center gap-1.5 rounded-lg border-2 border-background/30 px-2.5 py-1 font-display text-tiny font-bold uppercase tracking-wider text-background/70 transition-colors hover:border-background hover:text-background"
        {...tid("toolbar-reset")}
      >
        <RotateCcw className="size-3.5" />
        {tEditor("resetForm")}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Active switch */}
      <div className="flex items-center gap-1.5">
        <Switch
          checked={isActive ?? true}
          onCheckedChange={(checked) => setValue("is_active", checked)}
          className="data-[state=checked]:bg-background/30"
          {...tid("toolbar-active")}
        />
        <span className="font-display text-tiny font-bold uppercase tracking-wider text-background/70">
          {t("products.active")}
        </span>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="nb-btn flex items-center gap-2 rounded-lg border-3 border-background bg-background px-5 py-1.5 font-display text-sm font-extrabold uppercase tracking-wider text-foreground transition-colors hover:bg-background/90 disabled:opacity-50"
        {...tid("toolbar-save")}
      >
        {isSaving && <Loader2 className="size-4 animate-spin" />}
        {isSaving && tEditor("saving")}
        {!isSaving && isEdit && tEditor("saveProduct")}
        {!isSaving && !isEdit && tEditor("createProduct")}
      </button>
    </div>
  );
}
