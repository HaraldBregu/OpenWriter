#!/bin/bash
cd "$CLAUDE_PROJECT_DIR" || exit 0

# Skip if nothing changed
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  exit 0
fi

git add -A
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "Auto-commit from Claude Code [$TIMESTAMP]" 2>/dev/null || true
exit 0
