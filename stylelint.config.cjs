module.exports = {
  extends: ["stylelint-config-standard", "stylelint-config-tailwindcss"],
  ignoreFiles: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
  rules: {
    "declaration-block-no-duplicate-properties": true,
    "no-descending-specificity": null,
    "custom-property-pattern": [
      "^(--)?[a-z0-9][a-z0-9-]*(--[a-z0-9-]+)?$",
      {
        message:
          "Expected custom property name to be kebab-case; Tailwind theme line-height tokens may include a double dash.",
      },
    ],
  },
};
