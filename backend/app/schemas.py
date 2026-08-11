from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterOrganizationRequest(BaseModel):
    organization_name: str
    admin_name: str
    email: EmailStr
    password: str
    confirm_password: str
    phone: Optional[str] = None

    @field_validator('confirm_password')
    @classmethod
    def confirm_password_matches(cls, value: str, info):
        if info.data.get('password') and value != info.data['password']:
            raise ValueError('Passwords do not match.')
        return value

    @field_validator('organization_name', 'admin_name')
    @classmethod
    def min_len_two(cls, value: str):
        if value and len(value) < 2:
            raise ValueError('Must be at least 2 characters.')
        return value

    @field_validator('password', 'confirm_password')
    @classmethod
    def min_len_eight(cls, value: str):
        if value and len(value) < 8:
            raise ValueError('Must be at least 8 characters.')
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator('password')
    @classmethod
    def min_len_eight(cls, value: str):
        if value and len(value) < 8:
            raise ValueError('Must be at least 8 characters.')
        return value


class UserPublic(BaseModel):
    id: int
    name: str
    email: str
    role: str
    organization_id: int
    organization_name: Optional[str] = None


class AccessTokenResponse(BaseModel):
    token: str
    user: UserPublic


class CreateSupervisorRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    worksite_ids: List[int] = Field(default_factory=list)

    @field_validator('full_name')
    @classmethod
    def min_len_two(cls, value: str):
        if value and len(value) < 2:
            raise ValueError('Must be at least 2 characters.')
        return value

    @field_validator('password')
    @classmethod
    def min_len_eight(cls, value: str):
        if value and len(value) < 8:
            raise ValueError('Must be at least 8 characters.')
        return value


class WorksiteBase(BaseModel):
    name: str
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geofence_radius_meters: float = 100.0
    active: bool = True

    @field_validator('name')
    @classmethod
    def min_len_two(cls, value: str):
        if value and len(value) < 2:
            raise ValueError('Must be at least 2 characters.')
        return value


class WorksiteCreate(WorksiteBase):
    pass


class WorksiteUpdate(WorksiteBase):
    pass


class WorksitePublic(WorksiteBase):
    id: int
    organization_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {'from_attributes': True}


class DashboardSnapshot(BaseModel):
    organization_name: Optional[str] = None
    supervisors: int = 0
    worksites: int = 0
    users: int = 0
    role: str = 'ADMIN'
    empty_state: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str
