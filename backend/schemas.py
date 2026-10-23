"""API request and response schemas."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class UserSignup(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    contact: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8)
    lat: float
    lng: float
    area_name: str = Field(min_length=1, max_length=160)


class UserLogin(BaseModel):
    contact: str
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    contact: str
    lat: float
    lng: float
    area_name: str

    model_config = ConfigDict(from_attributes=True)


class AuthOut(BaseModel):
    token: str
    user: UserOut


class ScrapInput(BaseModel):
    temp_id: str
    name: str = Field(default="Fabric scrap", max_length=160)
    width_cm: float = Field(gt=0)
    height_cm: float = Field(gt=0)
    color_hex: str
    crop_url: str
    tags: dict[str, Any]


class ScrapOut(ScrapInput):
    id: int
    owner_id: int

    model_config = ConfigDict(from_attributes=True)


class ProductOut(BaseModel):
    id: int
    name: str
    size_label: str
    pieces: list[dict[str, Any]]
    fabric_notes: str


class CustomProduct(BaseModel):
    name: str
    width_cm: float = Field(gt=0)
    height_cm: float = Field(gt=0)


class ProductMatchInput(BaseModel):
    product_id: int | None = None
    custom: CustomProduct | None = None


class RequestCreate(BaseModel):
    scrap_id: int


class RequestRespond(BaseModel):
    action: Literal["approve", "decline"]
