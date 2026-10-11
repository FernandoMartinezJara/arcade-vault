#!/usr/bin/env bash
# PostToolUse hook: strip blank lines from code files, format with Prettier,
# then run ESLint --fix on JS/TS files. Remaining ESLint errors are sent back
# to Claude (exit 2) so it can fix them.
project_dir="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
file="$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')"
[ -n "$file" ] && [ -f "$file" ] || exit 0
# Only touch files inside this project.
case "$file" in
  "$project_dir"/*) ;;
  *) exit 0 ;;
esac
cd "$project_dir" || exit 0
bin="$project_dir/node_modules/.bin"
# Files listed in .prettierignore are left untouched.
[ "$("$bin/prettier" --file-info "$file" | jq -r '.ignored')" = "true" ] && exit 0
# Blank lines are removed only from code; in Markdown they separate paragraphs.
case "$file" in
  *.js|*.jsx|*.mjs|*.cjs|*.ts|*.tsx|*.mts|*.cts|*.css|*.json)
    node "$project_dir/.claude/hooks/strip-blank-lines.mjs" "$file" "$project_dir" >&2
    ;;
esac
# --ignore-unknown skips file types Prettier can't parse.
"$bin/prettier" --write --ignore-unknown --log-level warn "$file" >&2
case "$file" in
  *.js|*.jsx|*.mjs|*.cjs|*.ts|*.tsx|*.mts|*.cts)
    if ! output="$("$bin/eslint" --fix --no-warn-ignored "$file" 2>&1)"; then
      echo "ESLint encontró problemas en $file:" >&2
      echo "$output" >&2
      exit 2
    fi
    ;;
esac
exit 0
