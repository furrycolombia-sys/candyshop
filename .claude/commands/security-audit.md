Perform a comprehensive security audit of the codebase.

## What It Checks

1. **XSS Vulnerabilities** - dangerouslySetInnerHTML, innerHTML
2. **Sensitive Data Exposure** - console.log with secrets, localStorage tokens
3. **Authentication/Authorization** - Missing auth checks, client-only validation
4. **CSRF Protection** - Forms without tokens, GET mutations
5. **Injection Vulnerabilities** - eval(), dynamic queries
6. **Dependency Vulnerabilities** - npm audit, known CVEs
7. **Insecure Communication** - HTTP URLs, mixed content
8. **Sensitive Data in URLs** - Tokens in query strings
9. **Client-Side Validation Only** - Missing server validation
10. **Environment Variable Exposure** - Secrets in NEXT*PUBLIC*\*

## Report Location

Reports saved to: `.ai-context/reports/security-audit-{timestamp}.md`

## Usage

```
/security-audit
```

## Severity Levels

- 🔴 **Critical** - Immediate action required
- 🟠 **High** - Fix in current sprint
- 🟡 **Medium** - Add to backlog
- 🟢 **Low** - Document for future

## Full Skill Reference

See `.claude/skills/security-audit/SKILL.md` for complete documentation.
