#!/usr/bin/env bash

set -euo pipefail
echo "📜 $0"

_REMOTE_USER="${_REMOTE_USER:-vscode}"
_REMOTE_USER_HOME="${_REMOTE_USER_HOME:-/home/${_REMOTE_USER}}"

CLAUDE_JSON="${_REMOTE_USER_HOME}/.claude.json"

if [ ! -f "${CLAUDE_JSON}" ]; then
  echo '{"hasCompletedOnboarding":true}' > "${CLAUDE_JSON}"
  chown "${_REMOTE_USER}:${_REMOTE_USER}" "${CLAUDE_JSON}"
fi

mkdir -p "${_REMOTE_USER_HOME}/.claude"
chown "${_REMOTE_USER}:${_REMOTE_USER}" "${_REMOTE_USER_HOME}/.claude"

CLAUDE_SETTINGS_JSON="${_REMOTE_USER_HOME}/.claude/settings.json"
if [ ! -f "${CLAUDE_SETTINGS_JSON}" ]; then
  echo '{ "permissions": { "defaultMode": "bypassPermissions" } }' > "${CLAUDE_SETTINGS_JSON}"
  chown "${_REMOTE_USER}:${_REMOTE_USER}" "${CLAUDE_SETTINGS_JSON}"
fi
