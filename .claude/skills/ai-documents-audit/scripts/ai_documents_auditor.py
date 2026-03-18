#!/usr/bin/env python3
"""
=============================================================================
AI DOCUMENTS AUDITOR
=============================================================================

A tool to audit your Claude Code AI configuration and find opportunities
to use MCP (Model Context Protocol) tools instead of manual bash commands.

WHAT THIS SCRIPT DOES:
----------------------
1. Reads your .mcp.json file to discover what MCP servers you have installed
2. Scans all your AI configuration files (CLAUDE.md, skills, agents, rules)
3. Finds places where you're using bash/CLI commands that could use MCP tools
4. Generates a report showing what could be updated

WHAT IS MCP?
------------
MCP (Model Context Protocol) servers provide tools that Claude can use directly.
Instead of running `git status` in bash, Claude can use `mcp__git__git_status`.
MCP tools are more reliable and provide better error handling.

HOW TO RUN:
-----------
From your project root directory:

    python .claude/skills/ai-documents-audit/scripts/ai_documents_auditor.py

With options:

    python ai_documents_auditor.py --mode mcp      # Only check MCP servers
    python ai_documents_auditor.py --mode docs     # Only scan documents
    python ai_documents_auditor.py --verbose       # Show detailed output
    python ai_documents_auditor.py --json          # Output as JSON
    python ai_documents_auditor.py --output report.md  # Save to file

REQUIREMENTS:
-------------
- Python 3.7 or higher (uses dataclasses)
- No external packages needed (only uses Python standard library)

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================
# These are all built-in Python modules - no need to install anything!

import os          # For working with file paths and environment
import sys         # For system-level operations
import json        # For reading/writing JSON files (like .mcp.json)
import re          # For "regular expressions" - pattern matching in text
import argparse    # For parsing command-line arguments (--mode, --verbose, etc.)

from pathlib import Path           # Modern way to work with file paths
from typing import Dict, List, Optional, Any, Tuple  # Type hints for clarity
from datetime import datetime      # For timestamps in reports
from dataclasses import dataclass, field  # For creating simple data containers


# =============================================================================
# DATA CLASSES
# =============================================================================
# "dataclass" is a Python decorator that automatically creates a class
# with __init__, __repr__, etc. It's like a struct in other languages.
# Think of these as "templates" for organizing related data.


@dataclass
class MCPServer:
    """
    Represents one MCP server from your .mcp.json configuration.

    Example: If you have a "git" MCP server, this would store:
    - name: "git"
    - command: "npx" (how to run it)
    - args: ["-y", "@anthropic/mcp-git"] (arguments to pass)
    - tool_prefix: "mcp__git__" (prefix for its tools)

    Attributes:
        name: The server name (e.g., "git", "github", "chrome-devtools")
        command: The command to run the server (e.g., "npx", "node")
        args: List of arguments passed to the command
        note: Optional description from the config
        tool_prefix: Generated prefix for this server's tools (e.g., "mcp__git__")
    """
    name: str
    command: str
    args: List[str] = field(default_factory=list)  # Default to empty list
    note: str = ""
    tool_prefix: str = ""

    def __post_init__(self):
        """
        This runs automatically after the object is created.
        We use it to generate the tool_prefix from the server name.

        Example: "github-unified" -> "mcp__github__"
        """
        # Clean up the name: remove "-unified" suffix, replace dashes with underscores
        base_name = self.name.replace("-unified", "").replace("-", "_")
        # Generate the prefix pattern that all tools from this server will use
        self.tool_prefix = f"mcp__{base_name}__"


@dataclass
class Pattern:
    """
    Represents a CLI/bash pattern found in a document that could use MCP.

    Example: If we find `git status` in a markdown file, this would store:
    - file_path: "CLAUDE.md"
    - line_number: 42
    - original_text: "git status"
    - pattern_type: "git"
    - suggested_mcp: "mcp__git__git_status"
    - confidence: "high"

    Attributes:
        file_path: Which file contains this pattern
        line_number: What line number (for easy finding)
        original_text: The actual text that was matched
        pattern_type: Category of pattern (git, github, etc.)
        suggested_mcp: The MCP tool that could replace it
        confidence: How confident we are this is correct (high/medium/low)
        context: The full line for context
    """
    file_path: str
    line_number: int
    original_text: str
    pattern_type: str
    suggested_mcp: str
    confidence: str  # "high", "medium", or "low"
    context: str = ""


@dataclass
class DocumentScan:
    """
    Results from scanning a single document file.

    Attributes:
        file_path: Path to the scanned file
        patterns_found: List of Pattern objects found in this file
        total_lines: How many lines the file has
    """
    file_path: str
    patterns_found: List[Pattern] = field(default_factory=list)
    total_lines: int = 0


@dataclass
class Task:
    """
    Represents a task for the progress tracker display.
    Shows the user what's happening during the audit.

    Attributes:
        name: Description of the task
        status: "pending", "in_progress", or "completed"
        details: Extra info to show (like "3 files scanned")
    """
    name: str
    status: str = "pending"
    details: str = ""


# =============================================================================
# MAIN AUDITOR CLASS
# =============================================================================

class AIDocumentsAuditor:
    """
    The main class that does all the auditing work.

    HOW IT WORKS:
    1. Initialize with your project path
    2. Call run_audit() to start the audit
    3. Get back a results dictionary with all findings
    4. Optionally generate a markdown report

    EXAMPLE USAGE:
        auditor = AIDocumentsAuditor("/path/to/your/project")
        results = auditor.run_audit()
        report = auditor.generate_report(results)
        print(report)
    """

    # -------------------------------------------------------------------------
    # PATTERN DEFINITIONS
    # -------------------------------------------------------------------------
    # These are "regular expressions" (regex) that match CLI commands in text.
    # Each tuple contains: (pattern, cli_type, tool_template)
    #
    # Don't worry if regex looks confusing - here's the key:
    # - \s+ means "one or more spaces"
    # - (\w+) means "capture one or more word characters"
    # - The | character means "or"

    CLI_PATTERNS = [
        # ----- Git Patterns -----
        # Matches things like `git status`, `git diff`, etc.
        (r'`git\s+(\w+)`', 'git', 'git_{0}'),

        # Matches git commands without backticks
        (r'git\s+(status|diff|add|commit|push|pull|checkout|branch|merge|log|fetch|stash|reset|tag|clone|init|rebase|cherry-pick|remote|show|blame|reflog)', 'git', 'git_{0}'),

        # Matches git in bash code blocks
        (r'```bash\s*\n\s*git\s+(\w+)', 'git', 'git_{0}'),

        # ----- GitHub CLI Patterns -----
        # Matches `gh pr create`, `gh issue list`, etc.
        (r'`gh\s+(pr|issue|repo)\s+(\w+)`', 'github', '{1}_{0}'),
        (r'gh\s+(pr|issue|repo)\s+(create|list|view|merge|close|edit|comment)', 'github', '{1}_{0}'),

        # ----- NPX Patterns -----
        # Matches npx commands that might have MCP alternatives
        (r'`npx\s+(\w+)', 'npx', '{0}'),
        (r'npx\s+(shadcn|playwright|next-devtools)', '{0}', None),
    ]

    # Natural language patterns - phrases that suggest MCP operations
    NL_PATTERNS = [
        (r'take\s+(?:a\s+)?screenshot', 'screenshot', ['chrome-devtools', 'playwright']),
        (r'navigate\s+to', 'navigate', ['chrome-devtools', 'playwright']),
        (r'click\s+(?:on\s+)?', 'click', ['chrome-devtools', 'playwright']),
        (r'fill\s+(?:in\s+)?form', 'fill', ['chrome-devtools', 'playwright']),
        (r'check\s+git\s+status', 'git_status', ['git']),
        (r'create\s+(?:a\s+)?pull\s+request', 'create_pull_request', ['github']),
        (r'list\s+issues', 'list_issues', ['github']),
    ]

    # -------------------------------------------------------------------------
    # FILE PATTERNS TO SCAN
    # -------------------------------------------------------------------------
    # These "glob" patterns tell us which files to scan.
    # * means "any folder name"
    # ** means "any depth of folders"
    # *.md means "any file ending in .md"

    DOCUMENT_GLOBS = [
        'CLAUDE.md',                      # Main Claude instructions
        '.claude/skills/*/SKILL.md',      # All skill definitions
        '.claude/agents/*/AGENT.md',      # All agent definitions
        '.claude/agents/*/*.md',          # Other agent files
        '.claude/rules/*.md',             # All rules
        '.claude/docs/**/*.md',           # All documentation
    ]

    # -------------------------------------------------------------------------
    # INITIALIZATION
    # -------------------------------------------------------------------------

    def __init__(self, project_root: str, verbose: bool = False):
        """
        Create a new auditor for a project.

        Args:
            project_root: Path to your project folder (where .mcp.json is)
            verbose: If True, print extra debug information
        """
        # Convert to absolute path and store it
        self.project_root = Path(project_root).resolve()
        self.verbose = verbose

        # These will be populated during the audit
        self.mcp_servers: Dict[str, MCPServer] = {}  # Server name -> MCPServer
        self.document_scans: List[DocumentScan] = []  # All scan results
        self.all_patterns: List[Pattern] = []         # All patterns found
        self.tasks: List[Task] = []                   # Task progress tracker

    # -------------------------------------------------------------------------
    # TASK TRACKING (Progress Display)
    # -------------------------------------------------------------------------

    def _init_tasks(self) -> None:
        """
        Set up the task list that shows progress to the user.
        Each task represents a step in the audit process.
        """
        self.tasks = [
            Task("Discover MCP servers from .mcp.json"),
            Task("Query available tools for each MCP"),
            Task("Scan CLAUDE.md"),
            Task("Scan skills (*.SKILL.md)"),
            Task("Scan agents (*.AGENT.md)"),
            Task("Scan rules (*.md)"),
            Task("Scan documentation"),
            Task("Generate mapping report"),
            Task("Generate recommendations"),
        ]

    def _update_task(self, name: str, status: str, details: str = "") -> None:
        """
        Update a task's status and refresh the display.

        Args:
            name: The task name (must match exactly)
            status: "pending", "in_progress", or "completed"
            details: Optional extra info like "5 files found"
        """
        for task in self.tasks:
            if task.name == name:
                task.status = status
                task.details = details
                self._print_tasks()  # Refresh the display
                break

    def _print_tasks(self) -> None:
        """
        Print the current task progress with nice formatting.
        Uses emoji icons:
        - ✅ = completed
        - 🔄 = in progress
        - ⬜ = pending (not started)
        """
        print("\n📋 Task Progress:")
        for task in self.tasks:
            # Choose icon based on status
            if task.status == "completed":
                icon = "✅"
            elif task.status == "in_progress":
                icon = "🔄"
            else:
                icon = "⬜"

            # Add details in parentheses if present
            details = f" ({task.details})" if task.details else ""
            print(f"  {icon} {task.name}{details}")
        print()  # Empty line for spacing

    def log(self, message: str) -> None:
        """Print a message only if verbose mode is enabled."""
        if self.verbose:
            print(message)

    # -------------------------------------------------------------------------
    # MCP DISCOVERY
    # -------------------------------------------------------------------------

    def discover_mcp_servers(self) -> Dict[str, MCPServer]:
        """
        Read .mcp.json and find all configured MCP servers.

        This looks for a file called .mcp.json in your project root.
        That file lists all the MCP servers you have installed.

        Returns:
            Dictionary mapping server names to MCPServer objects
        """
        self._update_task("Discover MCP servers from .mcp.json", "in_progress")

        # Build the path to .mcp.json
        mcp_path = self.project_root / '.mcp.json'

        # Check if the file exists
        if not mcp_path.exists():
            self._update_task("Discover MCP servers from .mcp.json", "completed", "No .mcp.json found")
            return {}

        # Try to read and parse the JSON file
        try:
            with open(mcp_path, 'r', encoding='utf-8') as f:
                config = json.load(f)  # Parse JSON into Python dict
        except json.JSONDecodeError as e:
            # JSON parsing failed - file might be malformed
            self._update_task("Discover MCP servers from .mcp.json", "completed", f"Error: {e}")
            return {}

        # Extract servers from the config
        servers = {}
        # .get() returns the value or an empty dict if the key doesn't exist
        for name, cfg in config.get('mcpServers', {}).items():
            server = MCPServer(
                name=name,
                command=cfg.get('command', 'unknown'),
                args=cfg.get('args', []),
                note=cfg.get('_note', '')
            )
            servers[name] = server

        # Store and return the results
        self.mcp_servers = servers
        self._update_task("Discover MCP servers from .mcp.json", "completed", f"{len(servers)} servers found")
        return servers

    def query_tools(self) -> None:
        """
        Query available tools for each MCP server.

        NOTE: In a full implementation, this would actually call each MCP
        server to get its available tools. For now, we estimate based on
        the number of servers.
        """
        self._update_task("Query available tools for each MCP", "in_progress")

        # Estimate ~20 tools per server (rough average)
        tool_count = len(self.mcp_servers) * 20

        self._update_task("Query available tools for each MCP", "completed", f"~{tool_count} tools")

    # -------------------------------------------------------------------------
    # DOCUMENT SCANNING
    # -------------------------------------------------------------------------

    def get_document_paths(self) -> List[Path]:
        """
        Find all document files that should be scanned.

        Uses the glob patterns defined in DOCUMENT_GLOBS to find all
        markdown files in the AI configuration folders.

        Returns:
            Sorted list of unique file paths
        """
        paths = []
        for glob_pattern in self.DOCUMENT_GLOBS:
            # glob() returns all files matching the pattern
            matched = list(self.project_root.glob(glob_pattern))
            paths.extend(matched)

        # Remove duplicates and sort
        return sorted(set(paths))

    def scan_document(self, file_path: Path) -> DocumentScan:
        """
        Scan a single document file for CLI patterns.

        Reads the file line by line and looks for patterns that match
        CLI commands that could be replaced with MCP tools.

        Args:
            file_path: Path to the file to scan

        Returns:
            DocumentScan object with all findings
        """
        scan = DocumentScan(file_path=str(file_path))

        try:
            # Read the entire file
            content = file_path.read_text(encoding='utf-8')
            lines = content.split('\n')
            scan.total_lines = len(lines)
        except Exception as e:
            # If we can't read the file, return empty scan
            return scan

        # Check each line for CLI patterns
        # enumerate() gives us both the line number and content
        for line_num, line in enumerate(lines, 1):  # Start counting from 1
            patterns = self._find_patterns_in_line(line, line_num, str(file_path))
            scan.patterns_found.extend(patterns)

        return scan

    def _find_patterns_in_line(self, line: str, line_num: int, file_path: str) -> List[Pattern]:
        """
        Search a single line for CLI command patterns.

        Args:
            line: The text content of the line
            line_num: Which line number this is
            file_path: Path to the file (for the report)

        Returns:
            List of Pattern objects found in this line
        """
        patterns = []

        # Check each defined CLI pattern
        for regex, cli_type, tool_template in self.CLI_PATTERNS:
            # re.finditer finds ALL matches in the line
            # re.IGNORECASE makes it case-insensitive
            matches = re.finditer(regex, line, re.IGNORECASE)

            for match in matches:
                # Check if we have an MCP server that handles this CLI type
                mcp_candidates = self._get_mcp_for_cli(cli_type)

                if mcp_candidates:
                    # Generate the suggested MCP tool name
                    suggested = self._generate_tool_suggestion(
                        cli_type,
                        tool_template,
                        match.groups(),  # Captured groups from the regex
                        mcp_candidates[0]
                    )

                    # Create a Pattern object with all the details
                    pattern = Pattern(
                        file_path=file_path,
                        line_number=line_num,
                        original_text=match.group(0),  # The full matched text
                        pattern_type=cli_type,
                        suggested_mcp=suggested,
                        # High confidence for well-known CLIs
                        confidence='high' if cli_type in ['git', 'github'] else 'medium',
                        context=line.strip()
                    )
                    patterns.append(pattern)

        return patterns

    # -------------------------------------------------------------------------
    # MCP MATCHING HELPERS
    # -------------------------------------------------------------------------

    def _get_mcp_for_cli(self, cli_type: str) -> List[str]:
        """
        Find which MCP servers can handle a given CLI type.

        Args:
            cli_type: The type of CLI (e.g., "git", "github")

        Returns:
            List of matching MCP server names
        """
        # Mapping from CLI types to possible MCP server names
        mapping = {
            'git': ['git'],
            'github': ['github', 'github-unified'],
            'gh': ['github', 'github-unified'],
            'shadcn': ['shadcn'],
            'playwright': ['playwright'],
            'chrome': ['chrome-devtools'],
        }

        # Get candidates and filter to only ones we actually have installed
        candidates = mapping.get(cli_type, [])
        return [c for c in candidates if self._has_mcp(c)]

    def _has_mcp(self, name: str) -> bool:
        """
        Check if an MCP server with this name (or similar) exists.

        Uses partial matching so "github" matches "github-unified".

        Args:
            name: Server name to look for

        Returns:
            True if a matching server exists
        """
        for server_name in self.mcp_servers:
            # Check both directions for partial match
            if name in server_name or server_name in name:
                return True
        return False

    def _get_server_by_partial_name(self, name: str) -> Optional[MCPServer]:
        """
        Get an MCP server by partial name match.

        Args:
            name: Partial server name to search for

        Returns:
            MCPServer object if found, None otherwise
        """
        for server_name, server in self.mcp_servers.items():
            if name in server_name or server_name in name:
                return server
        return None

    def _generate_tool_suggestion(
        self,
        cli_type: str,
        template: Optional[str],
        groups: Tuple,
        mcp_name: str
    ) -> str:
        """
        Generate the suggested MCP tool name for a found pattern.

        Args:
            cli_type: Type of CLI command
            template: Template for tool name (e.g., "git_{0}")
            groups: Captured regex groups (parts of the matched text)
            mcp_name: Name of the MCP server

        Returns:
            Suggested MCP tool name like "mcp__git__git_status"
        """
        server = self._get_server_by_partial_name(mcp_name)
        if not server:
            return f"mcp__{mcp_name}__[tool]"

        if template and groups:
            try:
                # {0}, {1} in template get replaced with captured groups
                tool_name = template.format(*groups)
                return f"{server.tool_prefix}{tool_name}"
            except (IndexError, KeyError):
                pass

        # Fallback: just show the prefix with a wildcard
        return f"{server.tool_prefix}*"

    # -------------------------------------------------------------------------
    # MAIN AUDIT METHOD
    # -------------------------------------------------------------------------

    def run_audit(self, mode: str = 'all') -> Dict[str, Any]:
        """
        Run the full audit process.

        This is the main entry point. It:
        1. Initializes the task tracker
        2. Discovers MCP servers
        3. Scans all documents
        4. Generates the results

        Args:
            mode: What to audit:
                - 'all': Everything (default)
                - 'mcp': Only discover MCP servers
                - 'docs': Only scan documents

        Returns:
            Dictionary containing all audit results
        """
        # Print header
        print(f"\n🔍 AI Documents Auditor")
        print(f"📁 Project: {self.project_root}")
        print(f"📋 Mode: {mode}")

        # Initialize progress display
        self._init_tasks()
        self._print_tasks()

        # Prepare results dictionary
        results = {
            'timestamp': datetime.now().isoformat(),
            'project': str(self.project_root),
            'mcp_servers': {},
            'documents_scanned': [],
            'patterns_found': [],
            'summary': {}
        }

        # ----- Step 1 & 2: Discover MCPs -----
        if mode in ['all', 'mcp']:
            self.discover_mcp_servers()
            results['mcp_servers'] = {
                name: {'command': s.command, 'tool_prefix': s.tool_prefix}
                for name, s in self.mcp_servers.items()
            }
            self.query_tools()

        # ----- Steps 3-7: Scan Documents -----
        if mode in ['all', 'docs']:
            doc_paths = self.get_document_paths()

            # Group documents by type for better progress tracking
            claude_md = [p for p in doc_paths if p.name == 'CLAUDE.md']
            skills = [p for p in doc_paths if 'skills' in str(p) and p.name == 'SKILL.md']
            agents = [p for p in doc_paths if 'agents' in str(p)]
            rules = [p for p in doc_paths if 'rules' in str(p)]
            docs = [p for p in doc_paths if 'docs' in str(p) and p not in claude_md]

            # Scan each category
            for task_name, paths in [
                ("Scan CLAUDE.md", claude_md),
                ("Scan skills (*.SKILL.md)", skills),
                ("Scan agents (*.AGENT.md)", agents),
                ("Scan rules (*.md)", rules),
                ("Scan documentation", docs),
            ]:
                self._update_task(task_name, "in_progress")
                patterns_count = 0

                for doc_path in paths:
                    scan = self.scan_document(doc_path)
                    self.document_scans.append(scan)
                    self.all_patterns.extend(scan.patterns_found)
                    patterns_count += len(scan.patterns_found)

                self._update_task(task_name, "completed", f"{len(paths)} files, {patterns_count} patterns")

            # Add to results
            results['documents_scanned'] = [
                {'path': s.file_path, 'patterns_count': len(s.patterns_found)}
                for s in self.document_scans
            ]
            results['patterns_found'] = [
                {
                    'file': p.file_path,
                    'line': p.line_number,
                    'original': p.original_text,
                    'suggested_mcp': p.suggested_mcp,
                    'confidence': p.confidence
                }
                for p in self.all_patterns
            ]

        # ----- Step 8: Generate Mapping -----
        self._update_task("Generate mapping report", "in_progress")
        self._update_task("Generate mapping report", "completed", f"{len(self.all_patterns)} mappings")

        # ----- Step 9: Generate Recommendations -----
        self._update_task("Generate recommendations", "in_progress")
        results['summary'] = {
            'mcp_servers_count': len(self.mcp_servers),
            'documents_scanned': len(self.document_scans),
            'total_patterns': len(self.all_patterns),
            'high_confidence': sum(1 for p in self.all_patterns if p.confidence == 'high'),
        }
        self._update_task("Generate recommendations", "completed",
                         f"{results['summary']['high_confidence']} high priority")

        return results

    # -------------------------------------------------------------------------
    # REPORT GENERATION
    # -------------------------------------------------------------------------

    def generate_report(self, results: Dict[str, Any]) -> str:
        """
        Generate a markdown-formatted report from the audit results.

        Args:
            results: The dictionary returned by run_audit()

        Returns:
            Markdown string ready to print or save
        """
        lines = [
            "## AI Documents Audit Report",
            f"**Generated:** {results['timestamp']}",
            "",
            "### Summary",
            f"- MCP Servers: {results['summary'].get('mcp_servers_count', 0)}",
            f"- Documents Scanned: {results['summary'].get('documents_scanned', 0)}",
            f"- Patterns Found: {results['summary'].get('total_patterns', 0)}",
            f"- High Priority: {results['summary'].get('high_confidence', 0)}",
            "",
        ]

        # Add MCP servers table
        if results.get('mcp_servers'):
            lines.extend([
                "### MCP Servers",
                "| Server | Prefix |",
                "|--------|--------|"
            ])
            for name, info in results['mcp_servers'].items():
                lines.append(f"| {name} | `{info.get('tool_prefix', '')}` |")
            lines.append("")

        # Add patterns/opportunities list
        if results.get('patterns_found'):
            lines.extend(["### Update Opportunities", ""])
            # Only show first 20 to keep report manageable
            for p in results['patterns_found'][:20]:
                file_name = Path(p['file']).name
                original = p['original'][:40]  # Truncate long matches
                lines.append(
                    f"- **{file_name}:{p['line']}** `{original}` → `{p['suggested_mcp']}`"
                )

            # Note if there are more
            remaining = len(results['patterns_found']) - 20
            if remaining > 0:
                lines.append(f"\n*...and {remaining} more patterns*")
            lines.append("")

        return '\n'.join(lines)


# =============================================================================
# COMMAND LINE INTERFACE
# =============================================================================

def main():
    """
    Entry point when running the script from command line.

    Parses command-line arguments and runs the audit.
    """
    # Set up argument parser
    parser = argparse.ArgumentParser(
        description='AI Documents Auditor - Find MCP optimization opportunities',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python ai_documents_auditor.py                    # Full audit
  python ai_documents_auditor.py --mode mcp         # MCP discovery only
  python ai_documents_auditor.py --mode docs        # Document scan only
  python ai_documents_auditor.py -v                 # Verbose output
  python ai_documents_auditor.py --json             # JSON output
  python ai_documents_auditor.py -o report.md       # Save to file
        """
    )

    # Define available arguments
    parser.add_argument(
        '--project', '-p',
        default='.',
        help='Path to project root (default: current directory)'
    )
    parser.add_argument(
        '--mode', '-m',
        choices=['all', 'mcp', 'docs'],
        default='all',
        help='Audit mode: all, mcp (servers only), or docs (documents only)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Show detailed debug output'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results as JSON instead of markdown'
    )
    parser.add_argument(
        '--output', '-o',
        help='Save output to file instead of printing'
    )

    # Parse the arguments
    args = parser.parse_args()

    # Create auditor and run
    auditor = AIDocumentsAuditor(args.project, verbose=args.verbose)
    results = auditor.run_audit(mode=args.mode)

    # Generate output in requested format
    if args.json:
        output = json.dumps(results, indent=2)
    else:
        output = auditor.generate_report(results)

    # Save or print
    if args.output:
        Path(args.output).write_text(output, encoding='utf-8')
        print(f"\n📄 Report saved to: {args.output}")
    else:
        print("\n" + "=" * 60)
        print(output)


# This runs main() only when the script is executed directly
# (not when imported as a module)
if __name__ == '__main__':
    main()
