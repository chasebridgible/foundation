from __future__ import annotations

import sqlite3
from typing import Any

from fastapi import FastAPI, HTTPException, Query

from config import load_settings
from intake_core import ingest_omi_memory_payload, list_recent_intakes, regenerate_note

app = FastAPI(title="Foundation Context Intake", version="0.1.0")


@app.get("/health")
def health() -> dict[str, Any]:
    settings = load_settings()
    db_ready = False
    try:
        settings.db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(settings.db_path):
            db_ready = True
    except sqlite3.Error:
        db_ready = False

    return {
        "ok": db_ready,
        "db_path": str(settings.db_path),
        "raw_dir": str(settings.raw_dir),
        "notes_dir": str(settings.notes_dir),
        "webhook_token_configured": bool(settings.webhook_token),
        "admin_token_configured": bool(settings.admin_token),
    }


@app.post("/webhooks/omi/memory/{webhook_token}")
def receive_omi_memory(webhook_token: str, payload: dict[str, Any]) -> dict[str, Any]:
    settings = load_settings()
    if not settings.webhook_token or webhook_token != settings.webhook_token:
        raise HTTPException(status_code=401, detail="Invalid webhook token")

    result = ingest_omi_memory_payload(settings, payload)
    return {
        "ok": True,
        "source_id": result["source_id"],
        "conversation_id": result["conversation_id"],
        "note_path": result["note_path"],
        "created_note": result["created_note"],
    }


@app.get("/admin/intakes")
def admin_intakes(token: str = Query(...), limit: int = Query(25, ge=1, le=100)) -> dict[str, Any]:
    settings = load_settings()
    if not settings.admin_token or token != settings.admin_token:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    return {"intakes": list_recent_intakes(settings, limit=limit)}


@app.post("/admin/intakes/{conversation_id}/regenerate-note")
def admin_regenerate_note(conversation_id: str, token: str = Query(...)) -> dict[str, Any]:
    settings = load_settings()
    if not settings.admin_token or token != settings.admin_token:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    try:
        note_path = regenerate_note(settings, conversation_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True, "conversation_id": conversation_id, "note_path": note_path}
