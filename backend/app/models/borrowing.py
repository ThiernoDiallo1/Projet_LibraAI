from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timedelta
from bson import ObjectId
from enum import Enum

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type, _handler):
        from pydantic_core import core_schema
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ])
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema, handler):
        field_schema.update(type="string")
        return field_schema

class BorrowingStatus(str, Enum):
    ACTIVE = "active"
    RETURNED = "returned"
    OVERDUE = "overdue"

class ReservationStatus(str, Enum):
    PENDING = "pending"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

class Borrowing(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    book_id: str
    borrowed_at: datetime = Field(default_factory=datetime.utcnow)
    due_date: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(days=14))
    returned_at: Optional[datetime] = None
    status: BorrowingStatus = BorrowingStatus.ACTIVE
    fine_amount: float = 0.0
    renewal_count: int = 0
    max_renewals: int = 2

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Reservation(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    book_id: str
    reserved_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(days=7))
    status: ReservationStatus = ReservationStatus.PENDING
    notified: bool = False

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class BorrowingCreate(BaseModel):
    book_id: str

class BorrowingResponse(BaseModel):
    id: str
    user_id: str
    book_id: str
    borrowed_at: datetime
    due_date: datetime
    returned_at: Optional[datetime]
    status: BorrowingStatus
    fine_amount: float
    renewal_count: int
    max_renewals: int

class ReservationCreate(BaseModel):
    book_id: str

class BookInfo(BaseModel):
    id: str
    title: str
    author: str
    cover_image: Optional[str] = None

class ReservationResponse(BaseModel):
    id: str
    user_id: str
    book_id: str
    reserved_at: datetime
    expires_at: datetime
    status: ReservationStatus
    notified: bool
    book_info: Optional[BookInfo] = None