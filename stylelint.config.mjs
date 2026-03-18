/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-standard", "stylelint-config-tailwindcss"],
  rules: {
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: [
          "apply",
          "layer",
          "tailwind",
          "variants",
          "responsive",
          "screen",
          "keyframes",
          "font-face",
          "custom-variant",
          "theme",
        ],
      },
    ],
    "custom-property-pattern": [
      "^(--)?[a-z0-9][a-z0-9-]*(--[a-z0-9-]+)?$",
      {
        message:
          "Expected custom property name to be kebab-case; Tailwind theme line-height tokens may include a double dash.",
      },
    ],
  },
};
