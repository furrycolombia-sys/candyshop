Structured approach to investigating and debugging errors.

## Instructions

1. **Capture error details** - Full message, stack trace, context
2. **Analyze stack trace** - Identify origin files and lines
3. **Search related code** - Find similar patterns in codebase
4. **Check git history** - Recent changes to affected files
5. **Identify root cause** - Determine why error occurs
6. **Implement fix** - Apply appropriate solution
7. **Verify fix** - Test error is resolved
8. **Document resolution** - Record findings and prevention

## Common Error Types

| Error                                 | Likely Cause                  |
| ------------------------------------- | ----------------------------- |
| "Cannot read property X of undefined" | Missing null check            |
| "X is not a function"                 | Wrong import or object        |
| "Module not found"                    | Bad import path               |
| "Type X not assignable to Y"          | TypeScript mismatch           |
| "Hydration mismatch"                  | Server/client content differs |
| "Maximum update depth exceeded"       | Infinite render loop          |

## Report Location

Investigation reports saved to: `.ai-context/reports/error-investigation-{timestamp}.md`

## Usage

```
/investigate-error
```

## Full Skill Reference

See `.claude/skills/investigate-error/SKILL.md` for complete documentation.
