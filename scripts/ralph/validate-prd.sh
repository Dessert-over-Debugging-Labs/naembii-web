#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="${1:-$SCRIPT_DIR/prd.json}"

error() {
  echo "Error: $*" >&2
}

if ! command -v jq >/dev/null 2>&1; then
  error "jq is required to validate Ralph PRD files."
  exit 127
fi

if [ ! -f "$PRD_FILE" ]; then
  error "PRD file not found: $PRD_FILE"
  exit 1
fi

if ! jq empty "$PRD_FILE" >/dev/null 2>&1; then
  error "PRD file is not valid JSON: $PRD_FILE"
  exit 1
fi

if ! jq -e '
  type == "object" and
  (.project | type == "string" and length > 0) and
  (.branchName | type == "string" and length > 0) and
  (.description | type == "string" and length > 0) and
  (.userStories | type == "array")
' "$PRD_FILE" >/dev/null; then
  error "PRD must include non-empty project, branchName, description, and userStories array."
  exit 1
fi

if jq -e '
  (.project | test("^(REPLACE_ME|PLACEHOLDER|TODO)$"; "i")) or
  (.branchName | test("replace-me|placeholder|todo"; "i"))
' "$PRD_FILE" >/dev/null; then
  error "PRD still contains placeholder project or branchName values."
  exit 1
fi

if ! jq -e '.userStories | length > 0' "$PRD_FILE" >/dev/null; then
  error "PRD must contain at least one user story."
  exit 1
fi

if ! jq -e '
  all(.userStories[]; (
    (.id | type == "string" and length > 0) and
    (.title | type == "string" and length > 0) and
    (.description | type == "string" and length > 0) and
    (.priority | type == "number") and
    (.passes | type == "boolean") and
    (.acceptanceCriteria | type == "array" and length > 0) and
    all(.acceptanceCriteria[]; type == "string" and length > 0)
  ))
' "$PRD_FILE" >/dev/null; then
  error "Each story must include id, title, description, numeric priority, boolean passes, and non-empty acceptanceCriteria."
  exit 1
fi

DUPLICATE_IDS="$(jq -r '
  .userStories
  | group_by(.id)
  | map(select(length > 1) | .[0].id)
  | .[]
' "$PRD_FILE")"

if [ -n "$DUPLICATE_IDS" ]; then
  error "Duplicate story ids found:"
  printf '%s\n' "$DUPLICATE_IDS" >&2
  exit 1
fi

NEXT_STORY="$(jq -r '
  .userStories
  | map(select(.passes == false))
  | sort_by(.priority, .id)
  | first
  | if . == null then empty else "\(.id): \(.title)" end
' "$PRD_FILE")"

echo "PRD validation passed: $PRD_FILE"

if [ -n "$NEXT_STORY" ]; then
  echo "Next story: $NEXT_STORY"
else
  echo "All stories are marked passes: true."
fi
