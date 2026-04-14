---
name: investigate-error
description: Structured workflow to investigate and debug errors with context gathering.
---

# Investigate Error

## Description

Structured approach to investigating and debugging errors. Captures error details, searches codebase for related code, checks git history, reviews documentation, and suggests fix strategies.

## Usage

```
/investigate-error
```

Or natural language:

```
Debug this error
Investigate the error
Help me fix this bug
What's causing this error?
```

## When to Use

- Runtime errors in development
- Build failures
- Test failures
- Production error reports
- Any error you need to understand and fix

---

## Instructions

### Step 1: Capture Error Details

Collect complete information:

**Error message:**

- Full text
- Error type (TypeError, ReferenceError, SyntaxError, etc.)
- Error code if applicable

**Stack trace:**

- File paths
- Line numbers
- Function call chain

**Context:**

- When does it occur? (on load, on click, on submit, etc.)
- Reproducible consistently?
- Dev, preview, or production?
- What user action triggers it?

**Environment:**

- Browser and version (if frontend)
- Node.js version (if backend)
- Operating system
- Network conditions
- Local or deployed

### Step 2: Create Investigation Document

Create `.ai-context/reports/error-investigation-{timestamp}.md`:

```markdown
# Error Investigation - [Brief Description]

## Error Details

**Error Message:**
```

[Full error]

```

**Error Type:** [TypeError, ReferenceError, etc.]

**Stack Trace:**
```

[Full stack trace]

```

**Environment:**
- Browser: [Chrome 120, etc.]
- OS: [macOS, Windows, Linux]
- Environment: [Local, Preview, Production]
- URL: [Where it occurred]

**Reproduction Steps:**
1. [Step 1]
2. [Step 2]
3. Error occurs

**Expected:** [What should happen]
**Actual:** [What happens]
**First Occurred:** [When first noticed]
```

### Step 3: Analyze Stack Trace

Extract file paths and line numbers from stack trace.

**Read the relevant files:**

```
Read file_path (focus on line_number and surrounding context)
```

**Identify:**

- Where error originates
- Function that throws error
- What values are undefined/null
- What condition fails

### Step 4: Search for Related Code

Use Grep to find similar patterns:

```
Grep for error-related keywords
Grep for function names in stack trace
Grep for variable names involved
```

**Look for:**

- Other places using same code
- Similar error handling
- Related functionality
- Type definitions

### Step 5: Check Git History

See recent changes to affected files:

```
mcp__git__git_log({
  filePath: "path/to/file.ts",
  maxCount: 10
})

mcp__git__git_blame({
  file: "path/to/file.ts",
  startLine: X,
  endLine: Y
})
```

**Questions to answer:**

- Was this code recently changed?
- Who made recent changes?
- What was changed?
- Could recent changes cause this?

### Step 6: Review Documentation

Check relevant documentation:

- Component documentation
- API documentation
- Library documentation for dependencies
- TypeScript types and interfaces

### Step 7: Identify Root Cause

Analyze findings to determine root cause:

| Root Cause Type           | Signs                                  | Common Fix                               |
| ------------------------- | -------------------------------------- | ---------------------------------------- |
| **Null/undefined access** | "Cannot read property X of undefined"  | Add null check or optional chaining      |
| **Type mismatch**         | Type errors, unexpected values         | Fix types or add type guards             |
| **Missing dependency**    | "Module not found", "X is not defined" | Check imports, install packages          |
| **Async timing**          | Intermittent errors, race conditions   | Add await, fix promise handling          |
| **State issue**           | Stale data, unexpected re-renders      | Fix state management, check dependencies |
| **Logic error**           | Wrong output, incorrect behavior       | Fix conditional logic                    |

### Step 8: Suggest Fix Strategies

Based on root cause, suggest fixes:

**For null/undefined:**

```typescript
// Add null check
if (data?.property) {
  // Use property
}

// Or optional chaining with nullish coalescing
const value = data?.property?.nested ?? defaultValue;
```

**For type mismatch:**

```typescript
// Add type guard
function isUser(obj: unknown): obj is User {
  return obj !== null && typeof obj === "object" && "id" in obj;
}

if (isUser(data)) {
  // data is typed as User
}
```

**For async timing:**

```typescript
// Ensure await
const result = await asyncFunction();

// Or use proper loading state
if (loading) return <Loading />;
if (error) return <Error error={error} />;
if (!data) return null;
```

**For state issues:**

```typescript
// Fix useEffect dependencies
useEffect(() => {
  // effect
}, [dependency1, dependency2]);

// Use useCallback for stable references
const handleClick = useCallback(() => {
  // handler
}, [dep]);
```

### Step 9: Implement Fix

Apply the suggested fix:

1. Make code changes
2. Test that error is resolved
3. Test that fix doesn't break other functionality
4. Run build and lint checks
5. Document fix in investigation document

### Step 10: Document Resolution

Update investigation document:

````markdown
## Root Cause

[Explanation of why error occurred]

## Fix Applied

**Changes Made:**

- Modified `path/to/file.ts:line`
- Added null check for `variable`
- Updated type from `OldType` to `NewType`

**Code:**

```typescript
// Before
const value = data.property;

// After
const value = data?.property ?? defaultValue;
```
````

## Verification

- [x] Error no longer occurs
- [x] Related functionality still works
- [x] No new errors introduced
- [x] Build passes
- [x] Lint passes

## Prevention

[How to prevent similar errors in future]

- Add unit tests for edge cases
- Add type guards for external data
- Improve error boundaries

````

---

## Investigation Checklist

- [ ] Error details captured completely
- [ ] Stack trace analyzed
- [ ] Relevant files read
- [ ] Related code searched
- [ ] Git history checked
- [ ] Root cause identified
- [ ] Fix strategy determined
- [ ] Fix implemented
- [ ] Fix verified
- [ ] Resolution documented

---

## Common Error Patterns

### "Cannot read property X of undefined"

**Cause:** Accessing property on null/undefined object

**Fix:**
```typescript
// Add optional chaining
const value = obj?.property?.nested;

// Or add explicit check
if (obj && obj.property) {
  // use obj.property
}
````

### "X is not a function"

**Cause:** Calling something that isn't a function

**Fix:**

```typescript
// Check import is correct
import { myFunction } from "./module"; // Not default import

// Verify object has the method
if (typeof obj.method === "function") {
  obj.method();
}
```

### "Module not found"

**Cause:** Import path incorrect or package missing

**Fix:**

```bash
# Check import path
# Relative: ./file or ../folder/file
# Alias: @/features/auth

# Install missing package
npm install missing-package
```

### "Type X is not assignable to type Y"

**Cause:** TypeScript type mismatch

**Fix:**

```typescript
// Fix the type at source
const data: CorrectType = fetchData();

// Or add type assertion (use cautiously)
const data = fetchData() as ExpectedType;

// Or add type guard
if (isExpectedType(data)) {
  // data is typed correctly
}
```

### "Hydration mismatch" (Next.js/React)

**Cause:** Server and client render different content

**Fix:**

```typescript
// Use useEffect for client-only content
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

if (!mounted) return null; // or skeleton

// Or use dynamic import with ssr: false
const ClientComponent = dynamic(() => import("./Component"), { ssr: false });
```

### "Maximum update depth exceeded"

**Cause:** Infinite re-render loop

**Fix:**

```typescript
// Fix useEffect dependencies
useEffect(() => {
  setData(newData);
}, [specificDep]); // Not [data] which changes on every render

// Use useCallback for handlers
const handler = useCallback(() => {
  // logic
}, [stableDeps]);
```

---

## Task Tracking

When executing this skill, use TodoWrite:

```
TodoWrite([
  { content: "Capture error details", status: "in_progress", activeForm: "Capturing details" },
  { content: "Analyze stack trace", status: "pending", activeForm: "Analyzing stack trace" },
  { content: "Search related code", status: "pending", activeForm: "Searching codebase" },
  { content: "Check git history", status: "pending", activeForm: "Checking history" },
  { content: "Identify root cause", status: "pending", activeForm: "Identifying cause" },
  { content: "Implement fix", status: "pending", activeForm: "Implementing fix" },
  { content: "Verify fix", status: "pending", activeForm: "Verifying fix" },
  { content: "Document resolution", status: "pending", activeForm: "Documenting" }
])
```

---

## MCP Tools Used

| Tool                  | Purpose                             |
| --------------------- | ----------------------------------- |
| `Read`                | Read source files at specific lines |
| `Grep`                | Search for related code patterns    |
| `mcp__git__git_log`   | Check recent changes to files       |
| `mcp__git__git_blame` | See who changed specific lines      |
| `mcp__git__git_diff`  | Compare changes                     |
| `Edit`                | Apply fixes to code                 |

---

## Output

Creates:

- Error investigation document
- Root cause analysis
- Fix implementation
- Verification results
- Prevention recommendations

---

## Next Steps

After resolution:

1. Update implementation log if working on a ticket
2. Add tests to prevent regression
3. Document in code comments if needed
4. Consider if similar issues exist elsewhere
5. Share learnings with team if applicable

---

## Related

- [Troubleshoot Build](../troubleshoot-build/SKILL.md) - Build-specific errors
- [Code Review](../code-review/SKILL.md) - Prevent errors through review
