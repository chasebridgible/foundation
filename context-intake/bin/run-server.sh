#!/usr/bin/env bash
set -euo pipefail

cd /Users/chasebmini/Developer/repos/foundation
set -a
source context-intake/.env
set +a

exec .venv-context-intake/bin/uvicorn app:app --app-dir context-intake/server --host 127.0.0.1 --port 8765 --no-access-log
