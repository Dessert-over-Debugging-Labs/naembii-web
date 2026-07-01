#!/bin/bash
# Ralph Wiggum - Long-running AI agent loop
# Usage: ./scripts/ralph/ralph.sh [--tool codex|claude|amp|local] [max_iterations]

set -e

# Parse arguments
TOOL="codex"
MAX_ITERATIONS=10

while [[ $# -gt 0 ]]; do
  case $1 in
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    *)
      # Assume it's max_iterations if it's a number
      if [[ "$1" =~ ^[0-9]+$ ]]; then
        MAX_ITERATIONS="$1"
      fi
      shift
      ;;
  esac
done

# Validate tool choice
if [[ "$TOOL" != "amp" && "$TOOL" != "claude" && "$TOOL" != "codex" && "$TOOL" != "local" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'codex', 'claude', 'amp', or 'local'."
  exit 1
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"
SESSION_LOG_DIR="$SCRIPT_DIR/session_logs"
PROMPT_FILE="$SCRIPT_DIR/CODEX.md"
VALIDATOR_FILE="$SCRIPT_DIR/validate-prd.sh"

if [[ "$TOOL" == "amp" ]]; then
  PROMPT_FILE="$SCRIPT_DIR/prompt.md"
elif [[ "$TOOL" == "claude" ]]; then
  PROMPT_FILE="$SCRIPT_DIR/CLAUDE.md"
fi

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Error: prompt file not found: $PROMPT_FILE" >&2
  exit 1
fi

if [ ! -f "$PRD_FILE" ]; then
  echo "Error: PRD file not found: $PRD_FILE" >&2
  echo "Create it from scripts/ralph/prd.json.example or docs/PRD_TEMPLATE.md." >&2
  exit 1
fi

if [ ! -x "$VALIDATOR_FILE" ]; then
  echo "Error: PRD validator not found or not executable: $VALIDATOR_FILE" >&2
  exit 1
fi

"$VALIDATOR_FILE" "$PRD_FILE"

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")
  
  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    # Strip "ralph/" prefix from branch name for folder
    FOLDER_NAME=$(echo "$LAST_BRANCH" | sed 's|^ralph/||')
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"
    
    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"
    
    # Reset progress file for new run
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

# Initialize progress file if it doesn't exist
if [ ! -f "$PROGRESS_FILE" ]; then
  echo "# Ralph Progress Log" > "$PROGRESS_FILE"
  echo "Started: $(date)" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
fi

mkdir -p "$ARCHIVE_DIR" "$SESSION_LOG_DIR"

if [[ "$TOOL" == "local" ]]; then
  NEXT_STORY_JSON=$(jq -c '
    .userStories
    | map(select(.passes == false))
    | sort_by(.priority, .id)
    | first // empty
  ' "$PRD_FILE")

  if [ -z "$NEXT_STORY_JSON" ]; then
    echo "<promise>COMPLETE</promise>"
    exit 0
  fi

  PROJECT_NAME=$(jq -r '.project' "$PRD_FILE")
  BRANCH_NAME=$(jq -r '.branchName' "$PRD_FILE")
  STORY_ID=$(printf '%s' "$NEXT_STORY_JSON" | jq -r '.id')
  STORY_TITLE=$(printf '%s' "$NEXT_STORY_JSON" | jq -r '.title')
  STORY_DESCRIPTION=$(printf '%s' "$NEXT_STORY_JSON" | jq -r '.description')

  echo ""
  echo "==============================================================="
  echo "  Ralph Local Run Packet"
  echo "==============================================================="
  echo "Project: $PROJECT_NAME"
  echo "Project root: $PROJECT_ROOT"
  echo "PRD: $PRD_FILE"
  echo "Progress: $PROGRESS_FILE"
  echo "Branch: $BRANCH_NAME"
  echo ""
  echo "Next story: $STORY_ID - $STORY_TITLE"
  echo "$STORY_DESCRIPTION"
  echo ""
  echo "Acceptance criteria:"
  printf '%s' "$NEXT_STORY_JSON" | jq -r '.acceptanceCriteria[] | "- " + .'
  echo ""
  echo "Local Ralph procedure:"
  echo "1. Read scripts/ralph-figma/CODEX.md, scripts/ralph-figma/prd.json, and scripts/ralph-figma/progress.txt."
  echo "2. Switch to or create branch: $BRANCH_NAME"
  echo "3. Implement exactly this story and no later stories."
  echo "4. Run the checks documented in AGENTS.md/README."
  echo "5. If checks pass, set only $STORY_ID passes=true and add notes in scripts/ralph-figma/prd.json."
  echo "6. Append a progress entry to scripts/ralph-figma/progress.txt."
  echo "7. Commit with a Korean Conventional Commit summary, for example:"
  echo "   feat(app): $STORY_ID 한글 작업 요약"
  echo "8. Run: git log -1 --pretty=%s"
  echo "9. If the summary is English, amend the commit immediately."
  echo ""
  echo "Use this packet as the prompt for the current Codex/chat session when external agent execution is unavailable."
  exit 0
fi

echo "Starting Ralph - Tool: $TOOL - Max iterations: $MAX_ITERATIONS"
echo "Project root: $PROJECT_ROOT"
echo "PRD: $PRD_FILE"
echo "Prompt: $PROMPT_FILE"

for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "==============================================================="
  echo "  Ralph Iteration $i of $MAX_ITERATIONS ($TOOL)"
  echo "==============================================================="

  PROMPT_CONTENT="PROJECT_ROOT=$PROJECT_ROOT
PRD_FILE=$PRD_FILE
PROGRESS_FILE=$PROGRESS_FILE

$(cat "$PROMPT_FILE")"
  LOG_FILE="$SESSION_LOG_DIR/$(date +%Y%m%d-%H%M%S)-iter-$i-$TOOL.log"

  # Run the selected tool with the ralph prompt
  if [[ "$TOOL" == "amp" ]]; then
    OUTPUT=$(printf '%s' "$PROMPT_CONTENT" | (cd "$PROJECT_ROOT" && amp --dangerously-allow-all) 2>&1 | tee "$LOG_FILE" /dev/stderr) || true
  elif [[ "$TOOL" == "claude" ]]; then
    OUTPUT=$(printf '%s' "$PROMPT_CONTENT" | (cd "$PROJECT_ROOT" && claude --dangerously-skip-permissions --print) 2>&1 | tee "$LOG_FILE" /dev/stderr) || true
  else
    OUTPUT=$(printf '%s' "$PROMPT_CONTENT" | codex exec -C "$PROJECT_ROOT" --sandbox workspace-write --ephemeral - 2>&1 | tee "$LOG_FILE" /dev/stderr) || true
  fi
  
  # Check for completion authoritatively via the PRD, not by grepping the
  # tool output: codex echoes the prompt (which contains the COMPLETE
  # sentinel), so grepping output would false-positive on iteration 1.
  REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE" 2>/dev/null || echo "1")
  if [ "$REMAINING" = "0" ]; then
    echo ""
    echo "Ralph completed all tasks!"
    echo "Completed at iteration $i of $MAX_ITERATIONS"
    exit 0
  fi
  
  echo "Iteration $i complete. Continuing..."
  sleep 2
done

echo ""
echo "Ralph reached max iterations ($MAX_ITERATIONS) without completing all tasks."
echo "Check $PROGRESS_FILE for status."
exit 1
