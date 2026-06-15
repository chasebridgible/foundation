from __future__ import annotations

import hashlib
import json
import re
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from config import Settings


def init_db(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS intake_sources (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          uid TEXT,
          received_at TEXT NOT NULL,
          payload_hash TEXT NOT NULL UNIQUE,
          raw_payload_path TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          source_id TEXT NOT NULL,
          omi_id TEXT NOT NULL,
          created_at TEXT,
          started_at TEXT,
          finished_at TEXT,
          title TEXT,
          overview TEXT,
          folder_id TEXT,
          folder_name TEXT,
          category TEXT,
          status TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (source_id) REFERENCES intake_sources(id)
        );

        CREATE TABLE IF NOT EXISTS transcript_segments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id TEXT NOT NULL,
          segment_index INTEGER NOT NULL,
          speaker TEXT,
          speaker_id INTEGER,
          speaker_name TEXT,
          is_user INTEGER,
          start_seconds REAL,
          end_seconds REAL,
          text TEXT NOT NULL,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        );

        CREATE TABLE IF NOT EXISTS note_artifacts (
          conversation_id TEXT PRIMARY KEY,
          note_path TEXT NOT NULL,
          status TEXT NOT NULL,
          generated_at TEXT NOT NULL,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        );

        CREATE TABLE IF NOT EXISTS intake_events (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          content_type TEXT,
          received_at TEXT NOT NULL,
          payload_hash TEXT NOT NULL UNIQUE,
          raw_payload_path TEXT NOT NULL,
          processing_status TEXT NOT NULL,
          conversation_id TEXT
        );
        """
    )
    connection.commit()


def ingest_omi_webhook_request(
    settings: Settings,
    *,
    event_type: str,
    content_type: str,
    body: bytes,
    received_at: datetime | None = None,
) -> dict[str, Any]:
    received_at = received_at or datetime.now(UTC)
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    settings.raw_dir.mkdir(parents=True, exist_ok=True)
    settings.notes_dir.mkdir(parents=True, exist_ok=True)

    payload_hash = hashlib.sha256(body).hexdigest()
    parsed = parse_request_body(content_type, body)
    raw_path = write_raw_event(settings.raw_dir, event_type, content_type, body, parsed, received_at, payload_hash)
    processing_status = "stored_raw"
    conversation_id = None
    note_path = None
    created_note = False

    if isinstance(parsed, dict) and should_generate_note(parsed):
        result = ingest_omi_memory_payload(
            settings,
            parsed,
            received_at=received_at,
            overwrite_note=False,
            raw_path=raw_path,
            payload_hash=payload_hash,
        )
        processing_status = "note_generated"
        conversation_id = str(result["conversation_id"])
        note_path = str(result["note_path"])
        created_note = bool(result["created_note"])

    with sqlite3.connect(settings.db_path) as connection:
        init_db(connection)
        connection.execute(
            """
            INSERT OR IGNORE INTO intake_events
              (id, event_type, content_type, received_at, payload_hash, raw_payload_path,
               processing_status, conversation_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"omi-event-{payload_hash[:16]}",
                event_type,
                content_type,
                received_at.isoformat(),
                payload_hash,
                str(raw_path),
                processing_status,
                conversation_id,
            ),
        )
        connection.commit()

    response: dict[str, Any] = {
        "event_id": f"omi-event-{payload_hash[:16]}",
        "event_type": event_type,
        "processing_status": processing_status,
        "raw_payload_path": str(raw_path),
    }
    if conversation_id:
        response["conversation_id"] = conversation_id
    if note_path:
        response["note_path"] = note_path
        response["created_note"] = created_note
    return response


def ingest_omi_memory_payload(
    settings: Settings,
    payload: dict[str, Any],
    *,
    received_at: datetime | None = None,
    overwrite_note: bool = False,
    raw_path: Path | None = None,
    payload_hash: str | None = None,
) -> dict[str, str | bool]:
    received_at = received_at or datetime.now(UTC)
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    settings.raw_dir.mkdir(parents=True, exist_ok=True)
    settings.notes_dir.mkdir(parents=True, exist_ok=True)

    payload_hash = payload_hash or stable_payload_hash(payload)
    raw_path = raw_path or write_raw_payload(settings.raw_dir, payload, received_at, payload_hash)
    normalized = normalize_omi_memory_payload(payload, received_at, payload_hash, raw_path)
    note_path = note_path_for(settings.notes_dir, normalized)

    with sqlite3.connect(settings.db_path) as connection:
        connection.row_factory = sqlite3.Row
        init_db(connection)
        upsert_normalized_payload(connection, normalized)
        note_markdown = render_note_markdown(normalized, raw_path, payload_hash)
        created_note = write_note(note_path, note_markdown, overwrite=overwrite_note)
        connection.execute(
            """
            INSERT INTO note_artifacts (conversation_id, note_path, status, generated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(conversation_id) DO UPDATE SET
              note_path = excluded.note_path,
              generated_at = excluded.generated_at
            """,
            (
                normalized["conversation_id"],
                str(note_path),
                "draft",
                received_at.isoformat(),
            ),
        )
        connection.commit()

    return {
        "source_id": normalized["source_id"],
        "conversation_id": normalized["conversation_id"],
        "note_path": str(note_path),
        "created_note": created_note,
    }


def stable_payload_hash(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def parse_request_body(content_type: str, body: bytes) -> Any:
    if "application/json" not in content_type.lower():
        return None
    try:
        return json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def should_generate_note(payload: dict[str, Any]) -> bool:
    if isinstance(payload.get("summary_json"), dict):
        return True
    if isinstance(payload.get("structured"), dict):
        return True
    if isinstance(payload.get("transcript_segments"), list):
        return True
    return bool(payload.get("id") and (payload.get("title") or payload.get("overview")))


def write_raw_event(
    raw_dir: Path,
    event_type: str,
    content_type: str,
    body: bytes,
    parsed: Any,
    received_at: datetime,
    payload_hash: str,
) -> Path:
    suffix = ".bin"
    if parsed is not None:
        suffix = ".json"
    safe_event_type = slugify(event_type)
    day_dir = raw_dir / received_at.strftime("%Y") / received_at.strftime("%m") / received_at.strftime("%d") / safe_event_type
    day_dir.mkdir(parents=True, exist_ok=True)
    raw_path = day_dir / f"{received_at.strftime('%H%M%S')}--{payload_hash[:12]}{suffix}"
    if raw_path.exists():
        return raw_path
    if parsed is not None:
        raw_path.write_text(json.dumps(parsed, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")
    else:
        header = f"content-type: {content_type}\nsha256: {payload_hash}\n\n".encode("utf-8")
        raw_path.write_bytes(header + body)
    return raw_path


def write_raw_payload(raw_dir: Path, payload: dict[str, Any], received_at: datetime, payload_hash: str) -> Path:
    day_dir = raw_dir / received_at.strftime("%Y") / received_at.strftime("%m") / received_at.strftime("%d")
    day_dir.mkdir(parents=True, exist_ok=True)
    raw_path = day_dir / f"{received_at.strftime('%H%M%S')}--{payload_hash[:12]}.json"
    if not raw_path.exists():
        raw_path.write_text(json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=False) + "\n", encoding="utf-8")
    return raw_path


def normalize_omi_memory_payload(
    payload: dict[str, Any],
    received_at: datetime,
    payload_hash: str,
    raw_path: Path,
) -> dict[str, Any]:
    if isinstance(payload.get("summary_json"), dict):
        payload = normalize_day_summary_payload(payload)

    structured = payload.get("structured") if isinstance(payload.get("structured"), dict) else {}
    omi_id = str(payload.get("id") or payload.get("conversation_id") or payload_hash[:12])
    title = text_or_default(structured.get("title") or payload.get("title"), "Untitled Omi conversation")
    transcript_segments = payload.get("transcript_segments")
    if not isinstance(transcript_segments, list):
        transcript_segments = []

    return {
        "source_id": f"omi-{payload_hash[:16]}",
        "provider": "omi",
        "uid": payload.get("uid"),
        "received_at": received_at.isoformat(),
        "payload_hash": payload_hash,
        "raw_payload_path": str(raw_path),
        "conversation_id": f"omi-{omi_id}",
        "omi_id": omi_id,
        "created_at": payload.get("created_at"),
        "started_at": payload.get("started_at"),
        "finished_at": payload.get("finished_at"),
        "title": title,
        "overview": text_or_default(structured.get("overview") or payload.get("overview"), ""),
        "folder_id": payload.get("folder_id"),
        "folder_name": payload.get("folder_name"),
        "category": structured.get("category"),
        "status": "received",
        "segments": normalize_segments(transcript_segments),
        "action_items": structured.get("action_items") if isinstance(structured.get("action_items"), list) else [],
        "events": structured.get("events") if isinstance(structured.get("events"), list) else [],
    }


def normalize_day_summary_payload(payload: dict[str, Any]) -> dict[str, Any]:
    summary = payload["summary_json"]
    summary_id = summary.get("id") or summary.get("date") or stable_payload_hash(payload)[:12]
    title = summary.get("headline") or f"Omi day summary {summary.get('date', '')}".strip()
    overview = summary.get("overview") or ""
    action_items = summary.get("action_items") if isinstance(summary.get("action_items"), list) else []
    return {
        "id": f"day-summary-{summary_id}",
        "uid": payload.get("uid"),
        "created_at": payload.get("created_at") or summary.get("created_at"),
        "started_at": summary.get("date"),
        "finished_at": summary.get("date"),
        "structured": {
            "title": title,
            "overview": overview,
            "category": "day-summary",
            "action_items": action_items,
            "events": [],
        },
        "transcript_segments": [],
    }


def normalize_segments(segments: list[Any]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for index, segment in enumerate(segments):
        if not isinstance(segment, dict):
            continue
        text = text_or_default(segment.get("text"), "").strip()
        if not text:
            continue
        normalized.append(
            {
                "segment_index": index,
                "speaker": segment.get("speaker"),
                "speaker_id": segment.get("speakerId", segment.get("speaker_id")),
                "speaker_name": segment.get("speaker_name"),
                "is_user": bool(segment.get("is_user")) if segment.get("is_user") is not None else None,
                "start_seconds": segment.get("start"),
                "end_seconds": segment.get("end"),
                "text": text,
            }
        )
    return normalized


def upsert_normalized_payload(connection: sqlite3.Connection, normalized: dict[str, Any]) -> None:
    connection.execute(
        """
        INSERT OR IGNORE INTO intake_sources
          (id, provider, uid, received_at, payload_hash, raw_payload_path)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            normalized["source_id"],
            normalized["provider"],
            normalized["uid"],
            normalized["received_at"],
            normalized["payload_hash"],
            normalized["raw_payload_path"],
        ),
    )
    connection.execute(
        """
        INSERT INTO conversations
          (id, source_id, omi_id, created_at, started_at, finished_at, title, overview,
           folder_id, folder_name, category, status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source_id = excluded.source_id,
          created_at = excluded.created_at,
          started_at = excluded.started_at,
          finished_at = excluded.finished_at,
          title = excluded.title,
          overview = excluded.overview,
          folder_id = excluded.folder_id,
          folder_name = excluded.folder_name,
          category = excluded.category,
          status = excluded.status,
          updated_at = excluded.updated_at
        """,
        (
            normalized["conversation_id"],
            normalized["source_id"],
            normalized["omi_id"],
            normalized["created_at"],
            normalized["started_at"],
            normalized["finished_at"],
            normalized["title"],
            normalized["overview"],
            normalized["folder_id"],
            normalized["folder_name"],
            normalized["category"],
            normalized["status"],
            normalized["received_at"],
        ),
    )
    connection.execute("DELETE FROM transcript_segments WHERE conversation_id = ?", (normalized["conversation_id"],))
    connection.executemany(
        """
        INSERT INTO transcript_segments
          (conversation_id, segment_index, speaker, speaker_id, speaker_name, is_user,
           start_seconds, end_seconds, text)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                normalized["conversation_id"],
                segment["segment_index"],
                segment["speaker"],
                segment["speaker_id"],
                segment["speaker_name"],
                None if segment["is_user"] is None else int(segment["is_user"]),
                segment["start_seconds"],
                segment["end_seconds"],
                segment["text"],
            )
            for segment in normalized["segments"]
        ],
    )


def note_path_for(notes_dir: Path, normalized: dict[str, Any]) -> Path:
    started_at = parse_iso_datetime(normalized.get("started_at")) or parse_iso_datetime(normalized.get("created_at"))
    day = started_at or datetime.now(UTC)
    slug = slugify(normalized["title"])
    return notes_dir / day.strftime("%Y") / day.strftime("%m") / f"{day.strftime('%Y-%m-%d')}--{slug}--{normalized['conversation_id']}.md"


def render_note_markdown(normalized: dict[str, Any], raw_path: Path, payload_hash: str) -> str:
    segments = normalized["segments"]
    transcript_excerpt = "\n".join(
        f"- {segment.get('speaker_name') or segment.get('speaker') or 'Speaker'}: {segment['text']}"
        for segment in segments[:5]
    )
    action_items = render_action_items(normalized["action_items"])
    overview = normalized["overview"] or "No Omi overview was provided."

    return f"""---
source: omi
source_id: {normalized["source_id"]}
omi_conversation_id: {normalized["omi_id"]}
context_intake_id: {normalized["conversation_id"]}
captured_at: {normalized["received_at"]}
note_status: draft
payload_hash: {payload_hash}
raw_payload_path: {raw_path}
---

# {normalized["title"]}

## Summary

{overview}

## Action Items

{action_items}

## Candidate Foundation Signals

- Capability signals:
- Job or process signals:
- Decisions:
- Risks or gaps:
- Evidence worth preserving:

## Transcript Excerpt

{transcript_excerpt or "- No transcript segments were included in the webhook payload."}

## Review Checklist

- [ ] Remove sensitive details that should not become repo substrate.
- [ ] Confirm the summary accurately reflects the source conversation.
- [ ] Mark useful capability, job, process, decision, or evidence signals.
- [ ] Change `note_status` to `reviewed` only after human or agent review.
"""


def render_action_items(action_items: list[Any]) -> str:
    if not action_items:
        return "- None captured by Omi."
    lines = []
    for item in action_items:
        if isinstance(item, dict):
            description = text_or_default(item.get("description"), "").strip()
            completed = bool(item.get("completed"))
        else:
            description = str(item).strip()
            completed = False
        if description:
            lines.append(f"- [{'x' if completed else ' '}] {description}")
    return "\n".join(lines) if lines else "- None captured by Omi."


def write_note(note_path: Path, markdown: str, *, overwrite: bool) -> bool:
    note_path.parent.mkdir(parents=True, exist_ok=True)
    if note_path.exists() and not overwrite:
        return False
    note_path.write_text(markdown, encoding="utf-8")
    return True


def list_recent_intakes(settings: Settings, *, limit: int) -> list[dict[str, Any]]:
    with sqlite3.connect(settings.db_path) as connection:
        connection.row_factory = sqlite3.Row
        init_db(connection)
        rows = connection.execute(
            """
            SELECT c.id, c.omi_id, c.title, c.started_at, c.finished_at, c.updated_at,
                   n.note_path, n.status AS note_status
            FROM conversations c
            LEFT JOIN note_artifacts n ON n.conversation_id = c.id
            ORDER BY c.updated_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def regenerate_note(settings: Settings, conversation_id: str) -> str:
    with sqlite3.connect(settings.db_path) as connection:
        connection.row_factory = sqlite3.Row
        init_db(connection)
        row = connection.execute(
            """
            SELECT s.raw_payload_path
            FROM conversations c
            JOIN intake_sources s ON s.id = c.source_id
            WHERE c.id = ?
            """,
            (conversation_id,),
        ).fetchone()
    if row is None:
        raise KeyError(f"Conversation not found: {conversation_id}")
    payload = json.loads(Path(row["raw_payload_path"]).read_text(encoding="utf-8"))
    result = ingest_omi_memory_payload(settings, payload, overwrite_note=True)
    return str(result["note_path"])


def text_or_default(value: Any, default: str) -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:72] or "untitled"


def parse_iso_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
