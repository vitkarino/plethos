from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AssistantConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    message: str = Field(min_length=1, max_length=2000)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be empty")
        return stripped


class AssistantChatRequest(BaseModel):
    recording_id: str = Field(min_length=1)
    message: str = Field(min_length=1, max_length=2000)
    conversation_history: list[AssistantConversationMessage] = Field(default_factory=list, max_length=20)

    @field_validator("recording_id", "message")
    @classmethod
    def strip_non_empty(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("must not be empty")
        return stripped
