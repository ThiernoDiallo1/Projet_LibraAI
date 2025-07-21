from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from app.database import get_database
from app.models.user import UserResponse, UserUpdate, UserCreate, UserAdminResponse
from app.models.book import BookResponse
from app.services.auth_service import get_current_admin_user, get_current_user, get_password_hash
from datetime import datetime
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=List[UserAdminResponse])
async def list_users(
    skip: int = Query(0, description="Nombre d'éléments à sauter"),
    limit: int = Query(100, description="Nombre maximum d'éléments à retourner"),
    search: Optional[str] = Query(None, description="Terme de recherche pour username ou email"),
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_admin_user)
):
    """
    Récupère la liste des utilisateurs (admin seulement).
    Possibilité de filtrer par terme de recherche sur username ou email.
    """
    query = {}
    if search:
        # Recherche par username ou email contenant le terme
        query = {
            "$or": [
                {"username": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"full_name": {"$regex": search, "$options": "i"}}
            ]
        }
    
    users = await db.users.find(query).skip(skip).limit(limit).to_list(limit)
    
    # Conversion ObjectId en str pour chaque utilisateur
    for user in users:
        user["id"] = str(user["_id"])
        del user["_id"]
        
        # Supprimer le mot de passe hashé des résultats
        if "password" in user:
            del user["password"]
    
    return users

# Endpoints pour la gestion des favoris

@router.post("/favorites/add/{book_id}", status_code=status.HTTP_200_OK)
async def add_to_favorites(
    book_id: str,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Ajoute un livre aux favoris de l'utilisateur courant.
    """
    # Vérifier que le livre existe
    try:
        book_object_id = ObjectId(book_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid book ID format"
        )
        
    book = await db.books.find_one({"_id": book_object_id})
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
        
    # Ajouter à la liste des favoris de l'utilisateur s'il n'y est pas déjà
    # current_user est un objet Pydantic, pas un dictionnaire, donc on accède aux attributs avec le point
    user_id = ObjectId(current_user.id) if isinstance(current_user.id, str) else current_user.id
    
    # Vérifier si l'utilisateur a déjà une liste de favoris
    user = await db.users.find_one({"_id": user_id})
    
    if not user.get("favorites"):
        # Créer la liste de favoris s'il n'en a pas
        await db.users.update_one(
            {"_id": user_id},
            {"$set": {"favorites": [book_object_id]}}
        )
        return {"success": True, "message": "Book added to favorites"}
        
    # Vérifier si le livre est déjà dans les favoris
    if book_object_id in user.get("favorites", []):
        return {"success": True, "message": "Book is already in favorites"}
        
    # Ajouter le livre aux favoris
    await db.users.update_one(
        {"_id": user_id},
        {"$push": {"favorites": book_object_id}}
    )
    
    return {"success": True, "message": "Book added to favorites"}

@router.post("/favorites/remove/{book_id}", status_code=status.HTTP_200_OK)
async def remove_from_favorites(
    book_id: str,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Retire un livre des favoris de l'utilisateur courant.
    """
    try:
        book_object_id = ObjectId(book_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid book ID format"
        )
        
    user_id = ObjectId(current_user.id) if isinstance(current_user.id, str) else current_user.id
    
    # Retirer le livre des favoris
    result = await db.users.update_one(
        {"_id": user_id},
        {"$pull": {"favorites": book_object_id}}
    )
    
    if result.modified_count == 0:
        return {"success": True, "message": "Book was not in favorites"}
    
    return {"success": True, "message": "Book removed from favorites"}

@router.get("/favorites", response_model=List[BookResponse])
async def get_favorites(
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Récupère la liste des livres favoris de l'utilisateur courant.
    """
    user_id = ObjectId(current_user.id) if isinstance(current_user.id, str) else current_user.id
    
    # Récupérer l'utilisateur avec ses favoris
    user = await db.users.find_one({"_id": user_id})
    favorite_ids = user.get("favorites", [])
    
    if not favorite_ids:
        return []
    
    # Récupérer les livres correspondants
    books = await db.books.find({"_id": {"$in": favorite_ids}}).to_list(None)
    
    # Formater les livres pour le retour
    for book in books:
        book["id"] = str(book["_id"])
        del book["_id"]
    
    return books

@router.get("/{user_id}", response_model=UserAdminResponse)
async def get_user(
    user_id: str,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_admin_user)
):
    """
    Récupère les détails d'un utilisateur spécifique par son ID (admin seulement).
    """
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found"
            )
        
        user["id"] = str(user["_id"])
        del user["_id"]
        
        # Supprimer le mot de passe hashé des résultats
        if "password" in user:
            del user["password"]
        
        return user
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user: {str(e)}"
        )

@router.post("/", response_model=UserAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_admin_user)
):
    """
    Crée un nouvel utilisateur (admin seulement).
    """
    # Vérifier si l'email existe déjà
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Vérifier si le nom d'utilisateur existe déjà
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Créer l'utilisateur
    hashed_password = get_password_hash(user_data.password)
    user_dict = {
        "username": user_data.username,
        "email": user_data.email,
        "password": hashed_password,
        "full_name": user_data.full_name,
        "is_active": True,  # Par défaut actif
        "is_admin": False,  # Par défaut non-admin
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    created_user = await db.users.find_one({"_id": result.inserted_id})
    created_user["id"] = str(created_user["_id"])
    del created_user["_id"]
    del created_user["password"]
    
    return created_user

@router.put("/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_admin_user)
):
    """
    Met à jour un utilisateur existant (admin seulement).
    """
    # Protection supplémentaire pour éviter qu'un admin se désactive lui-même
    if user_id == current_user.id and user_data.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot deactivate their own account"
        )
    
    # Vérifier si l'utilisateur existe
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    # Préparation des données à mettre à jour
    update_data = {}
    if user_data.full_name is not None:
        update_data["full_name"] = user_data.full_name
    if user_data.is_active is not None:
        update_data["is_active"] = user_data.is_active
    if user_data.is_admin is not None:
        update_data["is_admin"] = user_data.is_admin
    
    # Mise à jour du mot de passe si fourni
    if user_data.password:
        update_data["password"] = get_password_hash(user_data.password)
    
    # Timestamp de mise à jour
    update_data["updated_at"] = datetime.utcnow()
    
    # Mettre à jour l'utilisateur
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    # Récupérer l'utilisateur mis à jour
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    updated_user["id"] = str(updated_user["_id"])
    del updated_user["_id"]
    if "password" in updated_user:
        del updated_user["password"]
    
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_admin_user)
):
    """
    Supprime un utilisateur (admin seulement).
    Protection pour empêcher l'auto-suppression.
    """
    # Empêcher un admin de se supprimer lui-même
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot delete their own account"
        )
    
    # Vérifier si l'utilisateur existe
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    # Suppression de l'utilisateur
    await db.users.delete_one({"_id": ObjectId(user_id)})
    
    return None
