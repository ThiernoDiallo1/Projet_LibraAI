from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from app.database import get_database
from app.models.user import User, UserResponse
from bson import ObjectId

# Configuration du hachage des mots de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuration JWT
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifier un mot de passe"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hacher un mot de passe"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Créer un token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

async def get_user_by_email(email: str) -> Optional[User]:
    """Récupérer un utilisateur par email"""
    db = get_database()
    if db is None:
        return None
    user_data = await db.users.find_one({"email": email})
    if user_data:
        user_data["_id"] = str(user_data["_id"])
        return User(**user_data)
    return None

async def get_user_by_username(username: str) -> Optional[User]:
    """Récupérer un utilisateur par nom d'utilisateur"""
    db = get_database()
    if db is None:
        return None
    user_data = await db.users.find_one({"username": username})
    if user_data:
        user_data["_id"] = str(user_data["_id"])
        return User(**user_data)
    return None

async def get_user_by_id(user_id: str) -> Optional[User]:
    """Récupérer un utilisateur par ID"""
    db = get_database()
    if db is None:
        return None
    if not ObjectId.is_valid(user_id):
        return None
    
    user_data = await db.users.find_one({"_id": ObjectId(user_id)})
    if user_data:
        user_data["_id"] = str(user_data["_id"])
        return User(**user_data)
    return None

async def authenticate_user(email: str, password: str) -> Optional[User]:
    """Authentifier un utilisateur"""
    user = await get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserResponse:
    """Récupérer l'utilisateur actuel à partir du token JWT"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await get_user_by_id(user_id)
    if user is None:
        raise credentials_exception
    
    return UserResponse(
        id=str(user.id),
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        is_admin=user.is_admin,
        created_at=user.created_at,
        borrowed_books=user.borrowed_books,
        favorite_books=user.favorite_books,
        fine_amount=user.fine_amount
    )

async def get_current_active_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """Récupérer l'utilisateur actuel actif"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin_user(current_user: UserResponse = Depends(get_current_active_user)) -> UserResponse:
    """Récupérer l'utilisateur admin actuel"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user