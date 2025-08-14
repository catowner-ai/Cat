from __future__ import annotations

import datetime as dt
from typing import List, Optional

from sqlmodel import Field, SQLModel, Relationship


class Poll(SQLModel, table=True):
	id: Optional[int] = Field(default=None, primary_key=True)
	code: str = Field(index=True, unique=True)
	question: str
	created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.utcnow(), index=True)
	locale: Optional[str] = Field(default=None, index=True)

	options: List["Option"] = Relationship(back_populates="poll")
	votes: List["Vote"] = Relationship(back_populates="poll")


class Option(SQLModel, table=True):
	id: Optional[int] = Field(default=None, primary_key=True)
	poll_id: int = Field(index=True, foreign_key="poll.id")
	text: str

	poll: Optional[Poll] = Relationship(back_populates="options")
	votes: List["Vote"] = Relationship(back_populates="option")


class Vote(SQLModel, table=True):
	id: Optional[int] = Field(default=None, primary_key=True)
	poll_id: int = Field(index=True, foreign_key="poll.id")
	option_id: int = Field(index=True, foreign_key="option.id")
	voter_id: str = Field(index=True)
	created_at: dt.datetime = Field(default_factory=lambda: dt.datetime.utcnow())

	poll: Optional[Poll] = Relationship(back_populates="votes")
	option: Optional[Option] = Relationship(back_populates="votes")