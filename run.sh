#!/usr/bin/env bash
# Serve the game locally. ES modules are blocked over file://, so it needs a server.
# Usage: ./run.sh          (then open http://localhost:8793)
#        ./run.sh 9000     (to use a different port)

set -euo pipefail

PORT="${1:-8793}"
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. It ships with macOS; on Linux install it, or use any other"
  echo "static file server pointed at this directory."
  exit 1
fi

# True if something is already listening on the port. Uses bash's /dev/tcp so
# there is nothing to install.
port_answers() {
  (exec 3<>"/dev/tcp/127.0.0.1/${1}") 2>/dev/null
}

open_browser() {
  # NO_OPEN=1 (used by the preview pane and the smoke test) skips opening a browser.
  if [ -z "${NO_OPEN:-}" ] && command -v open >/dev/null 2>&1; then
    open "http://localhost:${PORT}"
  fi
}

# Check the port before announcing anything. A leftover server from an earlier
# session is the usual cause, and it is probably already serving this directory.
if port_answers "${PORT}"; then
  holder_pid=""
  holder_dir=""
  if command -v lsof >/dev/null 2>&1; then
    holder_pid="$(lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN -t 2>/dev/null | head -n 1 || true)"
    if [ -n "${holder_pid}" ]; then
      holder_dir="$(lsof -a -p "${holder_pid}" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n 1 || true)"
    fi
  fi

  if [ -n "${holder_dir}" ] && [ "${holder_dir}" = "${PWD}" ]; then
    echo "Already serving this directory on http://localhost:${PORT} (PID ${holder_pid})."
    echo "Nothing to start. Opening it."
    open_browser
    exit 0
  fi

  echo "Port ${PORT} is already in use, and not by this game."
  if [ -n "${holder_pid}" ]; then
    echo "  Held by PID ${holder_pid}${holder_dir:+, serving ${holder_dir}}"
    echo "  Stop it with:  kill ${holder_pid}"
  fi
  echo "  Or use another port:  ./run.sh $((PORT + 1))"
  exit 1
fi

# Announce it and open a browser only once it actually answers, in the
# background, so the server itself can stay in the foreground where ctrl-C
# reaches it directly.
(
  for _ in $(seq 1 50); do
    if port_answers "${PORT}"; then
      echo "Serving on http://localhost:${PORT}  (ctrl-C to stop)"
      open_browser
      exit 0
    fi
    sleep 0.1
  done
  echo "Server did not come up on port ${PORT} within 5 seconds."
) &

# Still just python3's own stdlib server — nothing to install — but with
# caching turned off. `python3 -m http.server` sends no Cache-Control, so a
# browser is free to reuse a module script without asking, and editing a file
# in /src then reloading can silently run the old code.
exec python3 - "${PORT}" <<'PYTHON'
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoStoreHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()


port = int(sys.argv[1])
server = ThreadingHTTPServer(('', port), NoStoreHandler)
print('Serving HTTP on port %d, caching disabled' % port, flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    print()
PYTHON
