import { LegalPage } from "./LegalPage";

const SECTION_KEYS = [
  "controller",
  "dataCollected",
  "purposes",
  "whereStored",
  "whoSeesIt",
  "retention",
  "yourRights",
  "contact",
  "changes",
] as const;

export function PrivacyPage() {
  return (
    <LegalPage
      namespace="legal.privacy"
      testId="legal-privacy-page"
      sectionKeys={SECTION_KEYS}
    />
  );
}
