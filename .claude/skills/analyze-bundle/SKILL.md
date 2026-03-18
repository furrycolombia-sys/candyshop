---
name: analyze-bundle
description: Analyze application bundle size and composition to find optimization opportunities, large dependencies, and performance bottlenecks; use for bundle analysis and size reduction tasks.
---

# Analyze Bundle

## Description

Analyzes the application bundle to identify optimization opportunities, large dependencies, and performance bottlenecks. Generates actionable recommendations for reducing bundle size.

**This skill uses a task list to show progress during analysis.**

## Usage

```
/analyze-bundle [options]
```

Or natural language:

```
Analyze the bundle size
Find large dependencies
Optimize bundle
Check what's making the build large
```

## Parameters

| Parameter      | Required | Description                                  |
| -------------- | -------- | -------------------------------------------- |
| `--full`       | No       | Run complete analysis with all optimizations |
| `--deps`       | No       | Focus on dependency analysis                 |
| `--tree-shake` | No       | Check for tree-shaking opportunities         |
| `--report`     | No       | Generate detailed report file                |

## When to Use

- Before major releases
- When build times increase significantly
- When page load performance degrades
- After adding new dependencies
- Periodic optimization reviews

## Report Location

Reports saved to: `.ai-context/reports/bundle-analysis-{timestamp}.md`

---

## Analysis Steps

### Step 1: Initialize Task List

```
TodoWrite([
  { content: "Build application for analysis", status: "in_progress", activeForm: "Building application" },
  { content: "Analyze bundle composition", status: "pending", activeForm: "Analyzing bundle" },
  { content: "Identify large dependencies", status: "pending", activeForm: "Finding large deps" },
  { content: "Check tree-shaking effectiveness", status: "pending", activeForm: "Checking tree-shaking" },
  { content: "Analyze code splitting", status: "pending", activeForm: "Analyzing code splitting" },
  { content: "Review dynamic imports", status: "pending", activeForm: "Reviewing dynamic imports" },
  { content: "Generate optimization recommendations", status: "pending", activeForm: "Generating recommendations" },
  { content: "Create report", status: "pending", activeForm: "Creating report" }
])
```

### Step 2: Build for Analysis

```bash
# Build with bundle analyzer
ANALYZE=true pnpm build

# Or use Next.js built-in analyzer
pnpm add -D @next/bundle-analyzer

# Configure in next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer(nextConfig);
```

### Step 3: Analyze Bundle Composition

**Check bundle stats:**

```bash
# View .next/analyze folder after build
ls -la .next/analyze/

# Check page sizes
cat .next/BUILD_ID
ls -la .next/static/chunks/
```

**Key metrics to extract:**

| Metric        | Target      | Warning |
| ------------- | ----------- | ------- |
| First Load JS | < 100KB     | > 200KB |
| Page chunks   | < 50KB each | > 100KB |
| Shared chunks | < 150KB     | > 250KB |

### Step 4: Identify Large Dependencies

**Common large packages to check:**

```bash
# Search for known large packages
grep -E "moment|lodash[^-]|@mui/material|antd|rxjs" package.json

# Check bundle impact (use bundlephobia.com data)
```

| Package               | Size (gzip) | Alternative                  |
| --------------------- | ----------- | ---------------------------- |
| `moment`              | ~70KB       | `dayjs` (~3KB)               |
| `lodash`              | ~70KB       | `lodash-es` (tree-shakeable) |
| `@mui/icons-material` | Large       | Import specific icons        |
| `date-fns`            | ~75KB       | Import specific functions    |

### Step 5: Check Tree-Shaking

**Patterns that prevent tree-shaking:**

```typescript
// BAD: Imports entire library
import _ from "lodash";
import * as Icons from "@mui/icons-material";

// GOOD: Import specific functions/components
import debounce from "lodash/debounce";
import { Search, Home } from "@mui/icons-material";
```

**Scan for problematic imports:**

```bash
# Find wildcard imports
grep -rn "import \* as" src/

# Find default imports from large libraries
grep -rn "import .* from 'lodash'" src/
grep -rn "import .* from 'moment'" src/
```

### Step 6: Analyze Code Splitting

**Check dynamic imports:**

```bash
# Find dynamic imports
grep -rn "dynamic(" src/
grep -rn "import(" src/
```

**Components that should be dynamically imported:**

| Component Type         | Should Dynamic Import |
| ---------------------- | --------------------- |
| Modals                 | Yes                   |
| Charts/Graphs          | Yes                   |
| Rich text editors      | Yes                   |
| Heavy data tables      | Yes                   |
| Admin-only features    | Yes                   |
| Below-the-fold content | Consider              |

### Step 7: Review Dynamic Import Usage

```typescript
// GOOD: Dynamic import for heavy components
const Chart = dynamic(() => import('./Chart'), {
  loading: () => <Skeleton />,
  ssr: false, // If client-only
});

// GOOD: Lazy load routes
const AdminDashboard = lazy(() => import('./AdminDashboard'));

// BAD: Static import for rarely used component
import HeavyModal from './HeavyModal'; // Always loaded
```

---

## Optimization Recommendations

### 1. Replace Heavy Dependencies

| Current           | Replacement                    | Savings |
| ----------------- | ------------------------------ | ------- |
| `moment`          | `dayjs`                        | ~67KB   |
| `lodash`          | `lodash-es` + specific imports | ~60KB   |
| Full icon library | Specific icon imports          | ~50KB+  |
| `axios`           | Native `fetch`                 | ~5KB    |

### 2. Enable Tree-Shaking

```typescript
// Before
import { format } from "date-fns";

// After (with modular imports)
import format from "date-fns/format";
```

### 3. Dynamic Imports

```typescript
// Heavy components
const RichTextEditor = dynamic(() => import('./RichTextEditor'), {
  loading: () => <EditorSkeleton />,
});

// Feature flags
const AdminPanel = dynamic(() => import('./AdminPanel'));
```

### 4. Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/hero.png"
  alt="Hero"
  width={1200}
  height={600}
  priority // For above-the-fold images
  placeholder="blur"
/>
```

### 5. Font Optimization

```typescript
// Use next/font for optimized fonts
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
```

---

## Report Template

````markdown
# Bundle Analysis Report

**Generated:** {timestamp}
**Build size:** {total_size}

## Executive Summary

| Metric        | Current | Target | Status   |
| ------------- | ------- | ------ | -------- |
| First Load JS | {size}  | <100KB | {status} |
| Largest Page  | {size}  | <50KB  | {status} |
| Shared Chunks | {size}  | <150KB | {status} |

## Bundle Breakdown

### By Route

| Route      | Size (gzip) | Status   |
| ---------- | ----------- | -------- |
| /          | {size}      | {status} |
| /dashboard | {size}      | {status} |

### Large Dependencies

| Package | Size   | Impact | Recommendation |
| ------- | ------ | ------ | -------------- |
| {name}  | {size} | High   | {action}       |

## Tree-Shaking Issues

### Problematic Imports Found

| File   | Import          | Fix               |
| ------ | --------------- | ----------------- |
| {path} | `import * as X` | Use named imports |

## Optimization Opportunities

### High Priority

1. **Replace moment with dayjs**
   - Current: ~70KB
   - After: ~3KB
   - Effort: Low

### Medium Priority

2. **Dynamic import heavy modals**
   - Files: {list}
   - Savings: ~{size}

### Low Priority

3. **...additional recommendations**

## Action Items

- [ ] Replace moment with dayjs
- [ ] Convert lodash to lodash-es
- [ ] Dynamic import AdminPanel
- [ ] Lazy load chart components

## Commands to Run

```bash
# Install replacement packages
pnpm add dayjs
pnpm remove moment

# Build and verify
pnpm build
```
````

````

---

## Package.json Scripts

Add these scripts for bundle analysis:

```json
{
  "scripts": {
    "build:analyze": "ANALYZE=true next build",
    "bundle:size": "next build && node scripts/check-bundle-size.js"
  }
}
````

---

## Automated Size Checks (CI)

The CI pipeline includes bundle analysis on PRs. See `.github/workflows/ci.yml`:

```yaml
bundle-analysis:
  name: Bundle Analysis
  runs-on: ubuntu-latest
  needs: changes # Runs in parallel with quality, unit-tests, build
  if: docs-only == 'false' && github.event_name == 'pull_request'
  steps:
    - name: Analyze web bundle
      run: cd apps/web && ANALYZE=true pnpm run build || true
```

---

## Tools Reference

| Tool                      | Purpose                   |
| ------------------------- | ------------------------- |
| `@next/bundle-analyzer`   | Visual bundle composition |
| `webpack-bundle-analyzer` | Detailed webpack stats    |
| `source-map-explorer`     | Source map analysis       |
| `bundlephobia.com`        | Package size lookup       |
| `import-cost` (VS Code)   | Real-time import size     |

---

## Related

- [CI/CD Pipeline](.github/workflows/ci.yml) - Bundle checks in CI
- [Performance Rules](../../rules/performance.md) - Performance guidelines
- [Senior Frontend Skill](../senior-frontend/SKILL.md) - Performance optimization
