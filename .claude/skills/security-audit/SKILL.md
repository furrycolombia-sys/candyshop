---
name: security-audit
description: Run a comprehensive security audit for common vulnerabilities.
---

# Security Audit

## Description

Performs a comprehensive security audit of the codebase, checking for common vulnerabilities and generating a detailed report. Covers OWASP Top 10 vulnerabilities, dependency security, and frontend-specific issues.

## Usage

```
/security-audit
```

Or natural language:

```
Run a security audit
Check for security vulnerabilities
Scan for security issues
```

## When to Use

- Before major releases
- After adding authentication/authorization features
- When handling sensitive data (PII, financial info)
- Periodic security reviews (monthly recommended)
- After dependency updates

## Report Location

Reports are saved to: `.ai-context/reports/security-audit-{YYYY-MM-DD-HHmmss}.md`

---

## Security Checks

### 1. XSS (Cross-Site Scripting) Vulnerabilities

**What to scan:**

```bash
# dangerouslySetInnerHTML usage
grep -rn "dangerouslySetInnerHTML" src/

# Direct innerHTML manipulation
grep -rn "\.innerHTML\s*=" src/

# Unescaped user input in templates
grep -rn "\${.*user\|\${.*input\|\${.*query" src/
```

**Risk levels:**

- 🔴 CRITICAL: `dangerouslySetInnerHTML` with user input
- 🟠 HIGH: `innerHTML` assignments
- 🟡 MEDIUM: Template literals with external data

**Safe patterns:**

```typescript
// UNSAFE
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// SAFE - Use DOMPurify if HTML is required
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />

// SAFEST - Avoid HTML injection entirely
<div>{userInput}</div>
```

---

### 2. Sensitive Data Exposure

**What to scan:**

```bash
# Console.log with sensitive data
grep -rn "console\.\(log\|info\|debug\).*password\|token\|secret\|key\|credential" src/

# localStorage/sessionStorage for sensitive data
grep -rn "localStorage\|sessionStorage" src/

# Hardcoded secrets
grep -rn "api[_-]?key\|secret\|password\|token" src/ --include="*.ts" --include="*.tsx"

# Exposed in error messages
grep -rn "catch.*console\|\.message" src/
```

**Risk levels:**

- 🔴 CRITICAL: Hardcoded API keys/secrets in code
- 🔴 CRITICAL: Tokens stored in localStorage
- 🟠 HIGH: Sensitive data in console.log
- 🟡 MEDIUM: Verbose error messages exposing internals

**Safe patterns:**

```typescript
// UNSAFE
localStorage.setItem("authToken", token);
console.log("User password:", password);

// SAFE - Use httpOnly cookies for auth tokens
// SAFE - Sanitize logs in production
if (process.env.NODE_ENV === "development") {
  console.log("Debug info");
}
```

---

### 3. Authentication & Authorization

**What to scan:**

```bash
# Missing auth checks in API routes
grep -rn "export.*function.*\(GET\|POST\|PUT\|DELETE\)" src/app/api/ -A 10

# Client-side only auth checks
grep -rn "isAuthenticated\|isAuthorized\|hasPermission" src/ --include="*.tsx"

# Direct user ID usage without validation
grep -rn "userId\|user\.id" src/app/api/
```

**Risk levels:**

- 🔴 CRITICAL: API routes without authentication
- 🔴 CRITICAL: Authorization bypass possibilities
- 🟠 HIGH: Client-side only permission checks
- 🟡 MEDIUM: Missing role validation

**Safe patterns:**

```typescript
// API Route - Always verify auth server-side
export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Additional role check if needed
  if (!session.user.roles.includes("admin")) {
    return new Response("Forbidden", { status: 403 });
  }
}
```

---

### 4. CSRF (Cross-Site Request Forgery)

**What to scan:**

```bash
# Forms without CSRF protection
grep -rn "<form" src/ --include="*.tsx" -A 5

# State-changing GET requests
grep -rn "router\.push.*delete\|remove\|update" src/

# Missing SameSite cookie attributes
grep -rn "cookie\|Cookie" src/ --include="*.config.*"
```

**Risk levels:**

- 🟠 HIGH: Forms submitting without tokens
- 🟠 HIGH: GET requests performing mutations
- 🟡 MEDIUM: Missing SameSite cookie config

**Safe patterns:**

```typescript
// Use POST/PUT/DELETE for mutations
// Never use GET for state-changing operations
// Configure cookies with SameSite=Strict
```

---

### 5. Injection Vulnerabilities

**What to scan:**

```bash
# SQL-like patterns
grep -rn "SELECT\|INSERT\|UPDATE\|DELETE" src/ --include="*.ts" --include="*.tsx"

# Dynamic query building
grep -rn "query.*\+\|query.*\`" src/

# URL parameter injection
grep -rn "searchParams\|URLSearchParams" src/ -A 3

# eval() or Function() usage
grep -rn "eval(\|new Function(" src/
```

**Risk levels:**

- 🔴 CRITICAL: `eval()` with user input
- 🔴 CRITICAL: Dynamic query construction
- 🟠 HIGH: Unvalidated URL parameters in queries
- 🟡 MEDIUM: String concatenation in queries

**Safe patterns:**

```typescript
// UNSAFE
const query = `SELECT * FROM users WHERE id = ${userId}`;

// SAFE - Use parameterized queries
const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);

// SAFE - Use ORM with parameterization
const user = await prisma.user.findUnique({ where: { id: userId } });
```

---

### 6. Dependency Vulnerabilities

**What to scan:**

```bash
# Run npm audit
npm audit

# Check for outdated packages
npm outdated

# Check for known vulnerable packages
grep -rn "event-stream\|flatmap-stream\|ua-parser-js\|coa\|rc\|colors\|faker" package.json

# Check for packages with prototype pollution history
grep -rn "lodash\|minimist\|qs\|deep-extend\|merge" package.json
```

**Risk levels:**

- 🔴 CRITICAL: Known CVEs with active exploits (CVSS 9.0+)
- 🔴 CRITICAL: Supply chain compromised packages
- 🟠 HIGH: High severity vulnerabilities (CVSS 7.0-8.9)
- 🟡 MEDIUM: Moderate vulnerabilities (CVSS 4.0-6.9)
- 🟢 LOW: Low severity issues (CVSS 0.1-3.9)

**High-risk packages to check:**

| Package        | Risk                | Check For               |
| -------------- | ------------------- | ----------------------- |
| `lodash`       | Prototype pollution | Version < 4.17.21       |
| `axios`        | SSRF, open redirect | Version < 1.6.0         |
| `jsonwebtoken` | Algorithm confusion | Version < 9.0.0         |
| `moment`       | ReDoS               | Consider dayjs/date-fns |
| `node-fetch`   | Various             | Version < 3.3.0         |

**Trusted Security Resources:**

1. **GitHub Advisory Database**: `https://github.com/advisories`
2. **Snyk Vulnerability DB**: `https://security.snyk.io/`
3. **NPM Advisories**: `https://www.npmjs.com/advisories`
4. **NIST NVD**: `https://nvd.nist.gov/`
5. **Socket.dev**: `https://socket.dev/` - Supply chain analysis

---

### 7. Insecure Communication

**What to scan:**

```bash
# HTTP URLs (should be HTTPS)
grep -rn "http://" src/ --include="*.ts" --include="*.tsx" | grep -v "localhost\|127.0.0.1"

# Mixed content
grep -rn "src=.http://" src/

# Insecure WebSocket
grep -rn "ws://" src/
```

**Risk levels:**

- 🔴 CRITICAL: Production HTTP endpoints
- 🟠 HIGH: Mixed content issues
- 🟡 MEDIUM: Insecure WebSocket connections

---

### 8. Sensitive Data in URLs

**What to scan:**

```bash
# Tokens/IDs in URL paths
grep -rn "router\.push.*token\|router\.push.*password" src/

# Sensitive query parameters
grep -rn "searchParams.*token\|searchParams.*key\|searchParams.*secret" src/

# GET requests with sensitive data
grep -rn "fetch.*\?.*password\|fetch.*\?.*token" src/
```

**Risk levels:**

- 🔴 CRITICAL: Passwords/tokens in URLs
- 🟠 HIGH: PII in query strings
- 🟡 MEDIUM: Session IDs in URLs

---

### 9. Client-Side Data Validation Only

**What to scan:**

```bash
# Zod schemas only in client components
grep -rn "zodResolver\|z\.object" src/ --include="*.tsx" -l

# Compare with API route validation
grep -rn "z\.object\|schema\.parse" src/app/api/
```

**Risk levels:**

- 🟠 HIGH: No server-side validation
- 🟡 MEDIUM: Inconsistent validation rules

**Safe patterns:**

```typescript
// Share validation schemas between client and server
// schemas/user.ts
export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Client-side
const form = useForm({ resolver: zodResolver(userSchema) });

// Server-side (API route)
const validated = userSchema.parse(requestBody);
```

---

### 10. Environment Variable Exposure

**What to scan:**

```bash
# NEXT_PUBLIC_ variables with sensitive data
grep -rn "NEXT_PUBLIC_" src/ --include="*.ts" --include="*.tsx"

# Environment variables in client code
grep -rn "process\.env\." src/ --include="*.tsx"

# Check .env files for sensitive data patterns
cat .env.example .env.local.example 2>/dev/null
```

**Risk levels:**

- 🔴 CRITICAL: Secrets in NEXT*PUBLIC*\* vars
- 🟠 HIGH: Server env vars exposed to client
- 🟡 MEDIUM: Unnecessary env var exposure

---

## Report Template

````markdown
# Security Audit Report

**Generated:** {timestamp}
**Scanned directories:** src/
**Total files scanned:** {count}

## Executive Summary

| Severity    | Count |
| ----------- | ----- |
| 🔴 Critical | X     |
| 🟠 High     | X     |
| 🟡 Medium   | X     |
| 🟢 Low      | X     |

## Critical Findings

### 1. [Finding Title]

- **File:** `path/to/file.tsx`
- **Line:** XX
- **Category:** XSS / Injection / Auth / etc.
- **Description:** [What was found]
- **Risk:** [Why it's dangerous]
- **Recommendation:** [How to fix]
- **Code:**

```typescript
// Current (vulnerable)
[code snippet]

// Recommended (secure)
[fixed code]
```
````

## High Findings

...

## Medium Findings

...

## Low Findings

...

## Passed Checks

✅ No eval() usage found
✅ No hardcoded secrets detected
✅ HTTPS enforced for external URLs
...

## NPM Security Summary

### Audit Results

| Package | Vulnerability   | Severity    | Fixed In | Advisory |
| ------- | --------------- | ----------- | -------- | -------- |
| [name]  | [CVE-XXXX-XXXX] | 🔴 CRITICAL | X.X.X    | [link]   |

## Recommendations

1. [Priority action items]
2. [Security improvements]
3. [Best practices to adopt]

## Next Steps

- [ ] Address critical findings immediately
- [ ] Schedule fixes for high findings
- [ ] Add to tech debt backlog: medium/low findings
- [ ] Schedule next audit: {date + 30 days}

```

---

## Running the Audit

### Step 1: Initialize

Create task list:

```

TodoWrite([
{ content: "Scan for XSS vulnerabilities", status: "in_progress", activeForm: "Scanning for XSS" },
{ content: "Check sensitive data exposure", status: "pending", activeForm: "Checking data exposure" },
{ content: "Audit authentication/authorization", status: "pending", activeForm: "Auditing auth" },
{ content: "Check CSRF protection", status: "pending", activeForm: "Checking CSRF" },
{ content: "Scan for injection vulnerabilities", status: "pending", activeForm: "Scanning injections" },
{ content: "Audit dependencies", status: "pending", activeForm: "Auditing dependencies" },
{ content: "Check communication security", status: "pending", activeForm: "Checking comms" },
{ content: "Review environment variables", status: "pending", activeForm: "Reviewing env vars" },
{ content: "Generate report", status: "pending", activeForm: "Generating report" }
])

````

### Step 2: Run All Scans

Execute each category's scan commands and collect findings.

### Step 3: Categorize Findings

Group by severity:
- 🔴 CRITICAL: Immediate action required
- 🟠 HIGH: Fix in current sprint
- 🟡 MEDIUM: Add to backlog
- 🟢 LOW: Document for future

### Step 4: Generate Report

Create timestamped report file:

```typescript
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const reportPath = `.ai-context/reports/security-audit-${timestamp}.md`;
````

### Step 5: Save Report

Write findings to `.ai-context/reports/security-audit-{timestamp}.md`

---

## Post-Audit Actions

1. **Critical findings** → Create tickets immediately
2. **High findings** → Add to current sprint
3. **Medium findings** → Add to backlog
4. **Low findings** → Document for future reference

---

## References

### General Security

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)

### Dependency Security

- [GitHub Advisory Database](https://github.com/advisories)
- [Snyk Vulnerability DB](https://security.snyk.io/)
- [NPM Advisories](https://www.npmjs.com/advisories)
- [NIST NVD](https://nvd.nist.gov/)
- [Socket.dev](https://socket.dev/) - Supply chain analysis

---

## Related

- [Code Review](../code-review/SKILL.md) - General code review
- [Submit PR](../submit-pr/SKILL.md) - Pre-submission checks
