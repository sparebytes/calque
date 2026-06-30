#!/usr/bin/env bash

set -euo pipefail
echo "📜 $0"

_REMOTE_USER="${_REMOTE_USER:-vscode}"

# Make sure that the remote user owns their home folder and the workspaces folder
sudo chown -R "${_REMOTE_USER}:" "/home/${_REMOTE_USER}"
if [ -d "/workspaces" ]; then
  sudo chown -R vscode:vscode "/workspaces" 2>/dev/null || true
fi
if [ -d "/workspace" ]; then
  sudo chown -R vscode:vscode "/workspace" 2>/dev/null || true
fi
