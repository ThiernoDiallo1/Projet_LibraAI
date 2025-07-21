from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

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

class Book(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    title: str = Field(..., min_length=1, max_length=200)
    author: str = Field(..., min_length=1, max_length=100)
    isbn: str = Field(..., min_length=10, max_length=17)
    description: Optional[str] = None
    category: str
    publication_year: int
    publisher: Optional[str] = None
    pages: Optional[int] = None
    language: str = "Français"
    cover_image: Optional[str] = None
    available_copies: int = Field(default=1, ge=0)
    total_copies: int = Field(default=1, ge=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    rating: float = Field(default=0.0, ge=0, le=5)
    reviews_count: int = 0

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class BookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    author: str = Field(..., min_length=1, max_length=100)
    isbn: str = Field(..., min_length=10, max_length=17)
    description: Optional[str] = None
    category: str
    publication_year: int
    publisher: Optional[str] = None
    pages: Optional[int] = None
    language: str = "Français"
    cover_image: Optional[str] = None
    total_copies: int = Field(default=1, ge=1)

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    publication_year: Optional[int] = None
    publisher: Optional[str] = None
    pages: Optional[int] = None
    language: Optional[str] = None
    cover_image: Optional[str] = None
    available_copies: Optional[int] = None
    total_copies: Optional[int] = None

class BookResponse(BaseModel):
    id: str
    title: str
    author: str
    isbn: str
    description: Optional[str]
    category: str
    publication_year: int
    publisher: Optional[str]
    pages: Optional[int]
    language: str
    cover_image: Optional[str]
    available_copies: int
    total_copies: int
    created_at: datetime
    rating: float
    reviews_count: int