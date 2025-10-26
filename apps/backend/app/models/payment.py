# ruff: noqa
from __future__ import annotations

from datetime import datetime, UTC
from enum import StrEnum
from typing import Any, Optional

from bson import ObjectId
from pydantic import BaseModel, Field, field_serializer
from typing_extensions import Annotated
from pydantic.functional_validators import BeforeValidator


# --- Pydantic v2 uyumlu ObjectId tipi ---
def _to_object_id(v: Any) -> ObjectId:
    if isinstance(v, ObjectId):
        return v
    try:
        return ObjectId(str(v))
    except Exception as e:
        raise ValueError("Geçersiz ObjectId") from e


# Use PlainSerializer for JSON serialization
from pydantic import PlainSerializer

PyObjectId = Annotated[
    ObjectId,
    BeforeValidator(_to_object_id),
    PlainSerializer(lambda x: str(x), return_type=str),
]


# --- Enum'lar ---
class PaymentProvider(StrEnum):
    iyzico = "iyzico"
    paytr = "paytr"


class PaymentStatus(StrEnum):
    INITIATED = "INITIATED"
    PENDING_3DS = "PENDING_3DS"
    AUTHORIZED = "AUTHORIZED"  # instant-capture pratiğinde CAPTURED ile eşdeğer tutulabilir
    CAPTURED = "CAPTURED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class ThreeDSStatus(StrEnum):
    CHALLENGE = "CHALLENGE"
    FRICTIONLESS = "FRICTIONLESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    UNKNOWN = "UNKNOWN"


# --- İç modeller ---
class ThreeDSInfo(BaseModel):
    version: Optional[str] = Field(default=None, description="EMV 3DS sürümü (örn. 2.2.0)")
    status: Optional[ThreeDSStatus] = Field(default=None)
    eci: Optional[str] = Field(default=None, min_length=2, max_length=2, description="ECI (örn. 05/06)")
    cavv: Optional[str] = Field(default=None, description="CAVV/AVV değeri (varsa)")


class ProviderRefs(BaseModel):
    iyz_paymentId: Optional[str] = Field(default=None, description="iyzico ödeme ID")
    paytr_merchant_oid: Optional[str] = Field(default=None, description="PayTR merchant_oid")


# --- Ana modeller ---
class Payment(BaseModel):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    orderId: str = Field(..., min_length=1)
    provider: PaymentProvider
    status: PaymentStatus = PaymentStatus.INITIATED

    # Minor units (kuruş) tutuyoruz; para hesapları tamsayı
    amount: int = Field(..., ge=1, description="TRY kuruş vb. minor units")
    currency: str = Field(default="TRY", min_length=3, max_length=3)

    threeDS: Optional[ThreeDSInfo] = None
    providerRefs: ProviderRefs = Field(default_factory=ProviderRefs)

    idempotencyKey: Optional[str] = Field(default=None, max_length=128)
    # Sağlayıcı ham cevapları (PII maskeli yazılacak)
    raw: Optional[dict[str, Any]] = None

    createdAt: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updatedAt: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
    }


class PaymentEvent(BaseModel):
    id: PyObjectId = Field(default_factory=ObjectId, alias="_id")
    paymentId: PyObjectId = Field(..., description="Payment._id ile ilişki")
    provider: PaymentProvider
    externalEventId: str = Field(..., min_length=1, description="Sağlayıcı event ID")
    eventType: str = Field(..., min_length=1)
    status: str = Field(..., min_length=1, description="Provider-specific status")
    raw: dict[str, Any] = Field(default_factory=dict)
    processedAt: datetime = Field(default_factory=lambda: datetime.now(UTC), description="When the event was processed")
    createdAt: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
    }
