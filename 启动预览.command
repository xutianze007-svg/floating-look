#!/bin/zsh
cd "$(dirname "$0")"
if /usr/bin/curl -s --max-time 1 http://127.0.0.1:4173/ >/dev/null; then
  open http://127.0.0.1:4173/
else
  if command -v node >/dev/null; then
    node server.mjs &
  else
    /usr/local/bin/node server.mjs &
  fi
  preview_pid=$!
  trap 'kill $preview_pid 2>/dev/null' EXIT
  for attempt in {1..60}; do
    if /usr/bin/curl -s --max-time 1 http://127.0.0.1:4173/ >/dev/null; then
      open http://127.0.0.1:4173/
      break
    fi
    sleep 0.1
  done
  wait $preview_pid
fi
