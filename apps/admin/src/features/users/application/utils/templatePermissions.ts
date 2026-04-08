import { PERMISSION_TEMPLATES } from "@/features/users/domain/constants";

export type TemplateKey = Exclude<keyof typeof PERMISSION_TEMPLATES, "none">;

const TOGGLE_TEMPLATE_KEYS = ["buyer", "seller", "admin", "events"] as const;

function getActiveTemplateKeys(grantedKeys: readonly string[]): TemplateKey[] {
  return TOGGLE_TEMPLATE_KEYS.filter((templateKey) =>
    PERMISSION_TEMPLATES[templateKey].every((key) => grantedKeys.includes(key)),
  );
}

export function getUpdatedPermissionKeysForTemplateToggle(
  grantedKeys: readonly string[],
  templateKey: TemplateKey,
  activate: boolean,
): string[] {
  const templateKeys = PERMISSION_TEMPLATES[templateKey];

  if (activate) {
    return [...new Set([...grantedKeys, ...templateKeys])];
  }

  const otherActiveTemplateKeys = getActiveTemplateKeys(grantedKeys).filter(
    (activeTemplateKey) => activeTemplateKey !== templateKey,
  );
  const keysRetainedByOtherTemplates = new Set(
    otherActiveTemplateKeys.flatMap(
      (activeTemplateKey) => PERMISSION_TEMPLATES[activeTemplateKey],
    ),
  );

  return grantedKeys.filter(
    (key) =>
      !templateKeys.includes(key) || keysRetainedByOtherTemplates.has(key),
  );
}
