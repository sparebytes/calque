#!/usr/bin/env bash
#
# Runs once at image build time, as root.

set -euo pipefail

_REMOTE_USER="${_REMOTE_USER:-vscode}"

# Create the pnpm cache dir with remote-user ownership so the named volume
# inherits sensible defaults on first mount.
mkdir -p "${PNPM_HOME}"
chown "${_REMOTE_USER}:" "${PNPM_HOME}"
