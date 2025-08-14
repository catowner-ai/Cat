from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator
import os

from sqlmodel import SQLModel, Session, create_engine

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./pulsepoll.db")

engine = create_engine(
	DATABASE_URL,
	connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
	pool_pre_ping=True,
)


def init_db() -> None:
	SQLModel.metadata.create_all(engine)


@contextmanager
def get_session() -> Iterator[Session]:
	session = Session(engine)
	try:
		yield session
	finally:
		session.close()