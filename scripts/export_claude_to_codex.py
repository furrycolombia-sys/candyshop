#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
CLAUDE_SKILLS_DIR = ROOT / ".claude" / "skills"
CLAUDE_COMMANDS_DIR = ROOT / ".claude" / "commands"
CODEX_SKILLS_DIR = ROOT / ".agents" / "skills"
GENERATED_MARKER = "<!-- generated-by: scripts/export_claude_to_codex.py -->"


def normalize_name(raw: str) -> str:
    name = re.sub(r"[^a-z0-9]+", "-", raw.lower()).strip("-")
    return re.sub(r"-{2,}", "-", name)


def parse_frontmatter(source_text: str) -> tuple[str | None, str | None]:
    lines = source_text.splitlines()
    if not lines or lines[0].strip() != "---":
        return None, None

    name = None
    description = None
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        value = value.strip().strip('"').strip("'")
        if key.strip() == "name":
            name = value
        elif key.strip() == "description":
            description = value

    return name, description


def first_meaningful_line(source_text: str) -> str | None:
    lines = source_text.splitlines()
    in_frontmatter = bool(lines and lines[0].strip() == "---")

    for line in lines[1:] if in_frontmatter else lines:
        stripped = line.strip()
        if in_frontmatter and stripped == "---":
            in_frontmatter = False
            continue
        if in_frontmatter or not stripped:
            continue
        if stripped.startswith("#"):
            continue
        return stripped
    return None


def default_description(name: str, source_rel: str, source_text: str) -> str:
    _, frontmatter_description = parse_frontmatter(source_text)
    if frontmatter_description:
        base = frontmatter_description.rstrip(".")
    else:
        base = (first_meaningful_line(source_text) or f"Codex wrapper for {name}").rstrip(".")

    return (
        f"{base}. Use when Codex should follow the existing Claude workflow in "
        f"`{source_rel}`. Read that source file before acting."
    )


def wrapper_body(name: str, source_rel: str, wrapper_type: str) -> str:
    title = name.replace("-", " ").title()
    source_label = "skill" if wrapper_type == "skill" else "command"
    return f"""# {title}

{GENERATED_MARKER}

Use the Claude-authored source file as the canonical workflow for this Codex {source_label}.

## Source

- `{source_rel}`

## Workflow

1. Read `{source_rel}` before taking action.
2. Adapt Claude-only slash commands, MCP calls, or shell assumptions to the current Codex toolset and local environment.
3. Execute the workflow directly when the user is asking for work, not just advice.
4. Keep `.claude` as the source of truth. If the workflow needs permanent changes, update the original Claude file too.
"""


def write_wrapper(
    name: str,
    description: str,
    source_rel: str,
    wrapper_type: str,
    *,
    overwrite_generated: bool = True,
) -> bool:
    target_dir = CODEX_SKILLS_DIR / name
    target_path = target_dir / "SKILL.md"
    existing = target_path.read_text(encoding="utf-8") if target_path.exists() else ""

    if target_path.exists() and GENERATED_MARKER not in existing:
        return False

    if target_path.exists() and GENERATED_MARKER in existing and not overwrite_generated:
        return False

    target_dir.mkdir(parents=True, exist_ok=True)
    target_path.write_text(
        "\n".join(
            [
                "---",
                f"name: {name}",
                f'description: "{description.replace(chr(34), chr(39))}"',
                "---",
                "",
                wrapper_body(name, source_rel, wrapper_type),
            ]
        ).rstrip()
        + "\n",
        encoding="utf-8",
    )
    return True


def export_skills() -> tuple[int, int]:
    created = 0
    skipped = 0

    for skill_dir in sorted(CLAUDE_SKILLS_DIR.iterdir()):
        if not skill_dir.is_dir():
            continue
        source_path = skill_dir / "SKILL.md"
        if not source_path.exists():
            continue

        source_text = source_path.read_text(encoding="utf-8")
        frontmatter_name, _ = parse_frontmatter(source_text)
        name = normalize_name(frontmatter_name or skill_dir.name)
        source_rel = source_path.relative_to(ROOT).as_posix()
        description = default_description(name, source_rel, source_text)

        if write_wrapper(name, description, source_rel, "skill"):
            created += 1
        else:
            skipped += 1

    return created, skipped


def export_commands() -> tuple[int, int]:
    created = 0
    skipped = 0

    for command_path in sorted(CLAUDE_COMMANDS_DIR.glob("*.md")):
        name = normalize_name(command_path.stem)
        source_text = command_path.read_text(encoding="utf-8")
        source_rel = command_path.relative_to(ROOT).as_posix()
        description = default_description(name, source_rel, source_text)

        if write_wrapper(
            name,
            description,
            source_rel,
            "command",
            overwrite_generated=False,
        ):
            created += 1
        else:
            skipped += 1

    return created, skipped


def main() -> None:
    CODEX_SKILLS_DIR.mkdir(parents=True, exist_ok=True)
    created_skills, skipped_skills = export_skills()
    created_commands, skipped_commands = export_commands()
    print(
        "Exported Claude assets to Codex wrappers:",
        f"skills created={created_skills}",
        f"skills skipped={skipped_skills}",
        f"commands created={created_commands}",
        f"commands skipped={skipped_commands}",
    )


if __name__ == "__main__":
    main()
