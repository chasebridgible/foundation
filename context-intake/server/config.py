from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    db_path: Path
    raw_dir: Path
    notes_dir: Path
    webhook_token: str
    admin_token: str


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _path_from_env(name: str, default: Path) -> Path:
    value = os.getenv(name)
    return Path(value).expanduser() if value else default


def load_settings() -> Settings:
    root = _repo_root()
    return Settings(
        db_path=_path_from_env(
            "CONTEXT_INTAKE_DB_PATH",
            root / "context-intake" / "runtime" / "context-intake.sqlite",
        ),
        raw_dir=_path_from_env(
            "CONTEXT_INTAKE_RAW_DIR",
            root / "context-intake" / "runtime" / "raw",
        ),
        notes_dir=_path_from_env(
            "CONTEXT_INTAKE_NOTES_DIR",
            root / "context-intake" / "notes",
        ),
        webhook_token=os.getenv("CONTEXT_INTAKE_WEBHOOK_TOKEN", ""),
        admin_token=os.getenv("CONTEXT_INTAKE_ADMIN_TOKEN", ""),
    )
