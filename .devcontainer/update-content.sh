#!/usr/bin/env bash

set -euo pipefail
echo "📜 $0"


if ! (mise install); then
  echo "💣 Problem installing Mise tools"
else
  echo "☑️ Installed Mise tools"
fi

if ! (corepack enable); then
  echo "💣 Problem Enabling Corepack"
else
  echo "☑️ Enabled Corepack"
fi

if ! (npm install); then
  echo "💣 Problem installing npm packages"
else
  echo "☑️ Npm packages installed"
fi
