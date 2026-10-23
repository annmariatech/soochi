"""Database models for accounts, scraps, products, and reuse requests."""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    contact: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    area_name: Mapped[str] = mapped_column(String(160))
    scraps: Mapped[list["Scrap"]] = relationship(back_populates="owner")


class Scrap(Base):
    __tablename__ = "scraps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    temp_id: Mapped[str] = mapped_column(String(80))
    name: Mapped[str] = mapped_column(String(160), default="Fabric scrap")
    width_cm: Mapped[float] = mapped_column(Float)
    height_cm: Mapped[float] = mapped_column(Float)
    area_cm2: Mapped[float | None] = mapped_column(Float, nullable=True)
    shape_type: Mapped[str] = mapped_column(String(20), default="rectangle")
    radius_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    color_hex: Mapped[str] = mapped_column(String(16))
    crop_url: Mapped[str] = mapped_column(String(500))
    tags: Mapped[dict] = mapped_column(JSON)
    owner: Mapped[User] = relationship(back_populates="scraps")
    requests: Mapped[list["ReuseRequest"]] = relationship(back_populates="scrap")


class Product(Base):
    """Product catalog table, available for seeded/custom catalog entries."""

    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    size_label: Mapped[str] = mapped_column(String(120))
    pieces: Mapped[list] = mapped_column(JSON)
    fabric_notes: Mapped[str] = mapped_column(Text, default="")


class ReuseRequest(Base):
    __tablename__ = "requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    scrap_id: Mapped[int] = mapped_column(ForeignKey("scraps.id"), index=True)
    requester_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    scrap: Mapped[Scrap] = relationship(back_populates="requests")


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("user_id", "scrap_id", name="uq_favorite_user_scrap"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    scrap_id: Mapped[int] = mapped_column(ForeignKey("scraps.id", ondelete="CASCADE"), index=True)
