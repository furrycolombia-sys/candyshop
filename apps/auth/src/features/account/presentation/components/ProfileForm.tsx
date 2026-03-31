"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { tid } from "shared";
import { Input } from "ui";
import type { z } from "zod";

import type {
  ProfileFormValues,
  UserProfile,
} from "@/features/account/domain/types";
import { profileFormSchema } from "@/features/account/domain/types";

/** Input shape for the form fields (before Zod transforms) */
type ProfileFormInput = z.input<typeof profileFormSchema>;

interface ProfileFormProps {
  profile: UserProfile;
  onSubmit: (values: ProfileFormValues) => void;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export function ProfileForm({
  profile,
  onSubmit,
  isPending,
  isSuccess,
  isError,
}: ProfileFormProps) {
  const t = useTranslations("auth.accountSettings");

  const { register, handleSubmit, formState } = useForm<
    ProfileFormInput,
    unknown,
    ProfileFormValues
  >({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: profile.display_name ?? "",
      display_email: profile.display_email ?? "",
      display_avatar_url: profile.display_avatar_url ?? "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-strong border-foreground bg-background p-6 shadow-brutal-sm"
      {...tid("profile-form")}
    >
      <h2 className="mb-4 font-display text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
        {t("publicProfile")}
      </h2>

      <div className="flex flex-col gap-4">
        {/* Display Name */}
        <label className="flex flex-col gap-1">
          <span className="font-display text-ui-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("displayName")}
          </span>
          <Input
            placeholder={t("displayNamePlaceholder")}
            {...register("display_name")}
            {...tid("profile-display-name")}
          />
          {formState.errors.display_name && (
            <span className="font-mono text-xs text-destructive">
              {formState.errors.display_name.message}
            </span>
          )}
        </label>

        {/* Contact Email */}
        <label className="flex flex-col gap-1">
          <span className="font-display text-ui-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("contactEmail")}
          </span>
          <Input
            type="email"
            placeholder={t("contactEmailPlaceholder")}
            {...register("display_email")}
            {...tid("profile-display-email")}
          />
          {formState.errors.display_email && (
            <span className="font-mono text-xs text-destructive">
              {formState.errors.display_email.message}
            </span>
          )}
        </label>

        {/* Custom Avatar URL */}
        <label className="flex flex-col gap-1">
          <span className="font-display text-ui-xs font-bold uppercase tracking-widest text-muted-foreground">
            {t("customAvatar")}
          </span>
          <Input
            type="url"
            placeholder={t("customAvatarPlaceholder")}
            {...register("display_avatar_url")}
            {...tid("profile-display-avatar")}
          />
          {formState.errors.display_avatar_url && (
            <span className="font-mono text-xs text-destructive">
              {formState.errors.display_avatar_url.message}
            </span>
          )}
        </label>
      </div>

      {/* Status messages */}
      {isSuccess && (
        <p className="mt-3 font-mono text-xs text-success">{t("saved")}</p>
      )}
      {isError && (
        <p className="mt-3 font-mono text-xs text-destructive">{t("error")}</p>
      )}

      {/* Save button */}
      <button
        type="submit"
        disabled={isPending}
        className="button-brutal button-press-sm mt-6 w-full justify-center border-strong border-foreground bg-foreground py-2.5 font-display text-sm font-extrabold uppercase tracking-widest text-background disabled:opacity-50"
        {...tid("profile-save")}
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        {isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
