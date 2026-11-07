#!/bin/sh
# Usage: scripts/devcontainer.sh up [devcontainer up flags...]
#        scripts/devcontainer.sh <command> [args...]
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)

GITHUB_TOKEN=${GITHUB_TOKEN:-$(gh auth token 2>/dev/null || true)}
GIT_AUTHOR_NAME=$(git -C "$root" config user.name || true)
GIT_AUTHOR_EMAIL=$(git -C "$root" config user.email || true)
GIT_COMMITTER_NAME=$GIT_AUTHOR_NAME
GIT_COMMITTER_EMAIL=$GIT_AUTHOR_EMAIL
export GITHUB_TOKEN GIT_AUTHOR_NAME GIT_AUTHOR_EMAIL GIT_COMMITTER_NAME GIT_COMMITTER_EMAIL

if [ "${1:-}" = up ]; then
	shift
	common=$(git -C "$root" rev-parse --path-format=absolute --git-common-dir)
	case "$common" in
	"$root"/*) exec devcontainer up --workspace-folder "$root" "$@" ;;
	# A git worktree's .git file names this absolute path, so mount it at the same path.
	*) exec devcontainer up --workspace-folder "$root" --mount "type=bind,source=$common,target=$common" "$@" ;;
	esac
fi
exec devcontainer exec --workspace-folder "$root" "$@"
