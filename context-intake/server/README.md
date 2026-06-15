# Context Intake Server

FastAPI service for local Omi memory webhook intake.

Run:

```bash
uvicorn app:app --app-dir context-intake/server --host 127.0.0.1 --port 8765 --no-access-log
```

Run core tests without FastAPI installed:

```bash
python3 -m unittest discover -s context-intake/server/tests
```
