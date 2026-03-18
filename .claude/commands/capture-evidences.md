Capture screenshots of implemented features and post them as evidence to a GitHub issue.

## Instructions

1. **Detect issue number** from the argument or current branch name (e.g., `feat/GH-162_Title` -> `162`)
2. **Verify dev server** is running at `localhost:3000` (or specified port)
3. **Create output directory** at `.ai-context/task-outputs/GH-{number}/images/`

### Screenshot Capture

4. Navigate to each relevant page using Playwright MCP (`mcp__playwright__browser_navigate`)
5. Interact with features to show them working (hover, click, open dropdowns/modals)
6. Wait for animations (`mcp__playwright__browser_wait_for`)
7. Take screenshots with descriptive filenames (`mcp__playwright__browser_take_screenshot`)
8. Repeat for each distinct feature or state

**Capture checklist:**

- [ ] Default/resting state of the feature
- [ ] Interactive states (hover, open, expanded)
- [ ] Detail views (modals, panels)
- [ ] Alternate locale (if i18n implemented)
- [ ] Responsive views (if relevant)
- [ ] Dark mode (if relevant)

**Naming:** `{NN}-{description}.png` (e.g., `01-toast-notifications.png`)

### Upload to GitHub

9. Create a draft release to host images:
   ```
   gh release create temp-gh-{number}-images --draft --title "Evidence images for GH-{number}" --notes "Temporary draft release for hosting evidence images."
   ```
10. Upload all screenshots as release assets:
    ```
    gh release upload temp-gh-{number}-images .ai-context/task-outputs/GH-{number}/images/*.png
    ```
11. Build CDN URLs from the pattern:
    ```
    https://github.com/{owner}/{repo}/releases/download/temp-gh-{number}-images/{filename}
    ```

### Post to GitHub Issue

12. Post a comment on the issue with embedded images using `gh issue comment {number} --body "..."`:
    - Each image gets a heading and brief description
    - Use markdown image syntax: `![Description](CDN_URL)`
    - Add a footer noting screenshots are from localhost with mocks enabled
13. Verify the comment renders correctly

### Post checklist:

- [ ] Draft release created
- [ ] All images uploaded as release assets
- [ ] CDN URLs accessible
- [ ] Issue comment posted with embedded images
- [ ] Comment renders correctly on GitHub

## Usage

```
/capture-evidences [issue-number]
```

## Examples

- `/capture-evidences 162` - Capture and post evidences for issue #162
- `/capture-evidences` - Auto-detect issue from current branch

## Why Draft Releases?

GitHub API does not support direct image uploads to issue comments via token auth. Draft releases provide permanent CDN URLs for assets that can be embedded in markdown.

## Cleanup

After PR merge, delete the temporary release:

```
gh release delete temp-gh-{number}-images --yes
```

## Full Skill Reference

See `.claude/skills/capture-evidences/SKILL.md` for complete documentation.
