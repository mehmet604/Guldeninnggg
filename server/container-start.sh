#!/bin/sh
set -eu

if [ "$(id -u)" -eq 0 ]; then
  mkdir -p "$DATA_DIR"
  chown node:node "$DATA_DIR"
  exec setpriv --reuid=node --regid=node --init-groups -- node server/start.mjs
fi

exec node server/start.mjs
