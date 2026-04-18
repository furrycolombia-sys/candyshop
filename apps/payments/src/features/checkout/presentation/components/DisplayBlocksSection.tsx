"use client";

import { DisplayBlockRenderer } from "./DisplayBlockRenderer";

import type { SellerPaymentMethodWithType } from "@/features/checkout/domain/types";

interface DisplayBlocksSectionProps {
  blocks: SellerPaymentMethodWithType["display_blocks"];
  label: string;
}

export function DisplayBlocksSection({
  blocks,
  label,
}: DisplayBlocksSectionProps) {
  if (blocks.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className="font-display text-xs font-extrabold uppercase tracking-widest">
        {label}
      </p>
      <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
        {blocks.map((block) => (
          <DisplayBlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
}
