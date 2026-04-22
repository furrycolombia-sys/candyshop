"use client";

import { MessageCircle } from "lucide-react";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { getRuntimeEnv } from "shared/config/environment";

export function TallyFeedbackButton() {
  const formId = getRuntimeEnv().tallyFormId;
  const t = useTranslations("common");

  if (!formId) return null;

  return (
    <>
      <Script
        src="https://tally.so/widgets/embed.js"
        strategy="afterInteractive"
      />
      <button
        type="button"
        data-tally-open={formId}
        data-tally-layout="modal"
        data-tally-align-left="1"
        aria-label={t("feedback")}
        className="fixed bottom-6 left-6 z-50 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
      >
        <MessageCircle className="size-5" />
      </button>
    </>
  );
}
