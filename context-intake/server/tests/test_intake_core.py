from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_DIR))

from config import Settings
from intake_core import ingest_omi_memory_payload, ingest_omi_webhook_request, list_recent_intakes, regenerate_note, slugify


class IntakeCoreTest(unittest.TestCase):
    def settings(self, root: Path) -> Settings:
        return Settings(
            db_path=root / "runtime" / "context-intake.sqlite",
            raw_dir=root / "runtime" / "raw",
            notes_dir=root / "notes",
            webhook_token="webhook-secret",
            admin_token="admin-secret",
        )

    def payload(self) -> dict:
        return {
            "id": "memory_abc123",
            "created_at": "2026-06-15T13:00:00+00:00",
            "started_at": "2026-06-15T12:45:00+00:00",
            "finished_at": "2026-06-15T12:55:00+00:00",
            "folder_name": "Foundation",
            "structured": {
                "title": "Context intake planning",
                "overview": "Discussed using Omi to capture intake notes.",
                "category": "work",
                "action_items": [{"description": "Create local webhook", "completed": False}],
            },
            "transcript_segments": [
                {
                    "text": "Let's set up the context intake webhook.",
                    "speaker": "SPEAKER_00",
                    "speakerId": 0,
                    "speaker_name": "Chase",
                    "is_user": True,
                    "start": 0.0,
                    "end": 3.0,
                }
            ],
        }

    def test_ingest_writes_raw_db_and_note(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            settings = self.settings(Path(tmp))
            result = ingest_omi_memory_payload(
                settings,
                self.payload(),
                received_at=datetime(2026, 6, 15, 13, 5, tzinfo=UTC),
            )

            self.assertTrue(Path(result["note_path"]).exists())
            self.assertIn("context-intake-planning", result["note_path"])
            self.assertTrue(any(settings.raw_dir.rglob("*.json")))

            with sqlite3.connect(settings.db_path) as connection:
                conversation_count = connection.execute("SELECT COUNT(*) FROM conversations").fetchone()[0]
                segment_count = connection.execute("SELECT COUNT(*) FROM transcript_segments").fetchone()[0]

            self.assertEqual(conversation_count, 1)
            self.assertEqual(segment_count, 1)

    def test_duplicate_payload_does_not_rewrite_note(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            settings = self.settings(Path(tmp))
            received_at = datetime(2026, 6, 15, 13, 5, tzinfo=UTC)
            first = ingest_omi_memory_payload(settings, self.payload(), received_at=received_at)
            note_path = Path(first["note_path"])
            note_path.write_text("reviewed local edit", encoding="utf-8")

            second = ingest_omi_memory_payload(settings, self.payload(), received_at=received_at)

            self.assertFalse(second["created_note"])
            self.assertEqual(note_path.read_text(encoding="utf-8"), "reviewed local edit")

    def test_regenerate_note_overwrites_from_raw_payload(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            settings = self.settings(Path(tmp))
            result = ingest_omi_memory_payload(settings, self.payload())
            note_path = Path(result["note_path"])
            note_path.write_text("old template", encoding="utf-8")

            regenerated_path = regenerate_note(settings, result["conversation_id"])

            self.assertEqual(regenerated_path, str(note_path))
            self.assertIn("Context intake planning", note_path.read_text(encoding="utf-8"))

    def test_list_recent_intakes(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            settings = self.settings(Path(tmp))
            ingest_omi_memory_payload(settings, self.payload())

            intakes = list_recent_intakes(settings, limit=10)

            self.assertEqual(len(intakes), 1)
            self.assertEqual(intakes[0]["title"], "Context intake planning")

    def test_slugify_has_safe_fallback(self) -> None:
        self.assertEqual(slugify("Context Intake Planning!"), "context-intake-planning")
        self.assertEqual(slugify("!!!"), "untitled")

    def test_webhook_request_generates_note_for_conversation_json(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            settings = self.settings(Path(tmp))
            body = __import__("json").dumps(self.payload()).encode("utf-8")

            result = ingest_omi_webhook_request(
                settings,
                event_type="conversation",
                content_type="application/json",
                body=body,
                received_at=datetime(2026, 6, 15, 13, 5, tzinfo=UTC),
            )

            self.assertEqual(result["processing_status"], "note_generated")
            self.assertTrue(Path(result["note_path"]).exists())

    def test_webhook_request_stores_realtime_array_raw_only(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            settings = self.settings(Path(tmp))
            body = b'[{"text":"hello","speaker":"SPEAKER_00","start":0,"end":1}]'

            result = ingest_omi_webhook_request(
                settings,
                event_type="realtime-transcript",
                content_type="application/json",
                body=body,
            )

            self.assertEqual(result["processing_status"], "stored_raw")
            self.assertTrue(Path(result["raw_payload_path"]).exists())
            self.assertNotIn("note_path", result)

    def test_webhook_request_stores_audio_bytes_raw_only(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            settings = self.settings(Path(tmp))

            result = ingest_omi_webhook_request(
                settings,
                event_type="audio-bytes",
                content_type="application/octet-stream",
                body=b"\x00\x01\x02\x03",
            )

            self.assertEqual(result["processing_status"], "stored_raw")
            raw_path = Path(result["raw_payload_path"])
            self.assertTrue(raw_path.exists())
            self.assertEqual(raw_path.suffix, ".bin")


if __name__ == "__main__":
    unittest.main()
