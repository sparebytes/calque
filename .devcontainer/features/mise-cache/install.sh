#!/usr/bin/env bash
#
# Runs once at image build time, as root.

set -euo pipefail
echo "📜 $0"

_REMOTE_USER="${_REMOTE_USER:-vscode}"
_REMOTE_USER_HOME="${_REMOTE_USER_HOME:-/home/${_REMOTE_USER}}"

# Create the data dir with remote-user ownership so the named volume
# inherits sensible defaults on first mount. /var/cache is root-owned
# so this has to happen as root.
mkdir -p "${MISE_DATA_DIR}"
chown "${_REMOTE_USER}:" "${MISE_DATA_DIR}"

# Create user-relative mise dirs (config / state / download cache) AS the
# remote user so any newly-created parent dirs (e.g. ~/.local, ~/.local/state)
# end up owned correctly. The state dir is where mise writes its tracked-
# configs metadata; without it, `mise install` prints a permission warning.
runuser -u "${_REMOTE_USER}" -- mkdir -p \
    "${_REMOTE_USER_HOME}/.config/mise" \
    "${_REMOTE_USER_HOME}/.local/state/mise" \
    "${_REMOTE_USER_HOME}/.cache/mise"

# Interactive shells get full mise activation (shims + env vars + hooks).
# Non-interactive shells rely on the PATH augmentation set in the Dockerfile.
# Appending as root preserves the file's existing ownership.

# Activate Mise shims in login shell
PROFILE="/etc/profile.d/10-mise.sh"
echo 'eval "$(mise activate --shim)"' >> "${PROFILE}"

# Activate Mise in Bash
BASHRC="${_REMOTE_USER_HOME}/.bashrc"
if ! grep -q 'mise activate bash' "${BASHRC}" 2>/dev/null; then
    echo 'eval "$(mise activate bash)"' >> "${BASHRC}"
fi

# Activate Mise in ZSH
ZSHRC="${_REMOTE_USER_HOME}/.zshrc"
if ! grep -q 'mise activate zsh' "${ZSHRC}" 2>/dev/null; then
    echo 'eval "$(mise activate zsh)"' >> "${ZSHRC}"
fi

# Activate Mise in FISH
FISH_CONF_DIR="${_REMOTE_USER_HOME}/.config/fish/conf.d"
mkdir -p "${FISH_CONF_DIR}"
echo 'mise activate fish | source' > "${FISH_CONF_DIR}/mise.fish"
