import { LegalPage } from "./LegalPage";

const SECTION_KEYS = [
  "platformAsTool",
  "userResponsibility",
  "noMoneyHandling",
  "disputeResolution",
  "ip",
  "accountTermination",
  "limitationOfLiability",
  "changes",
  "governingLaw",
  "contact",
] as const;

export function TermsPage() {
  return (
    <LegalPage
      namespace="legal.terms"
      testId="legal-terms-page"
      sectionKeys={SECTION_KEYS}
    />
  );
}
