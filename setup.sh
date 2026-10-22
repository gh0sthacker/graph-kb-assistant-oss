#!/usr/bin/env sh
set -eu

if ! command -v go >/dev/null 2>&1; then
  printf '%s\n' 'Go 1.27 or newer is required. Install Go, then run ./setup.sh again.' >&2
  exit 1
fi

mkdir -p bin
go build -trimpath -o bin/bb-assistant ./cmd/bb-assistant
printf '%s\n' 'Built ./bin/bb-assistant'
