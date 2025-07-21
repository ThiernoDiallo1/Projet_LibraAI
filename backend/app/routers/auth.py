from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta
from pydantic import BaseModel
from app.models.user import User, UserCreate, UserResponse
from app.services.auth_service import (
    authenticate_user, create_access_token, get_password_hash,
    get_user_by_email, get_user_by_username, get_current_active_user
)
from app.services.email_service import email_service
from app.database import get_database
from app.config import settings
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Inscription d'un nouvel utilisateur"""
    logger.info(f"==== DÉBUT INSCRIPTION UTILISATEUR: {user_data.username} / {user_data.email} ====")
    db = get_database()
    
    # Vérifier si la base de données est disponible
    if db is None:
        logger.error("❌ Base de données non disponible")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection not available. Please try again later."
        )
    else:
        logger.info("✓ Base de données disponible")
    
    try:
        # Vérifier si l'email existe déjà
        logger.info(f"Vérification si email existe déjà: {user_data.email}")
        existing_user = await get_user_by_email(user_data.email)
        if existing_user:
            logger.warning(f"❌ Email déjà inscrit: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            logger.info("✓ Email disponible")
        
        # Vérifier si le nom d'utilisateur existe déjà
        logger.info(f"Vérification si username existe déjà: {user_data.username}")
        existing_username = await get_user_by_username(user_data.username)
        if existing_username:
            logger.warning(f"❌ Nom d'utilisateur déjà pris: {user_data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        else:
            logger.info("✓ Nom d'utilisateur disponible")
        
        # Créer le nouvel utilisateur
        logger.info("Hashage du mot de passe...")
        hashed_password = get_password_hash(user_data.password)
        
        # Créer un objet utilisateur complet avec tous les champs par défaut
        logger.info("Création de l'objet utilisateur complet...")
        user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            is_active=True,
            is_admin=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            borrowed_books=[],
            favorite_books=[],
            fine_amount=0.0
        )
        
        # Convertir en dict
        logger.info("Conversion de l'objet utilisateur en dictionnaire...")
        try:
            # Essayer Pydantic v2
            user_dict = user.model_dump(by_alias=True, exclude_unset=True)
            logger.info("✓ Utilisé model_dump() (Pydantic v2)")
        except AttributeError:
            # Fallback pour Pydantic v1
            user_dict = user.dict(by_alias=True, exclude_unset=True)
            logger.info("✓ Utilisé dict() (Pydantic v1)")
        
        # Debug: Afficher le dictionnaire
        logger.info(f"Contenu du dictionnaire utilisateur: {list(user_dict.keys())}")
        
        # Insertion en base
        logger.info("Insertion en base de données...")
        result = await db.users.insert_one(user_dict)
        logger.info(f"✓ Insertion réussie, ID généré: {result.inserted_id}")
        
        # Retourner l'utilisateur créé
        logger.info("Récupération de l'utilisateur créé...")
        created_user = await db.users.find_one({"_id": result.inserted_id})
        logger.info("✓ Utilisateur récupéré avec succès")
        
        user_response = UserResponse(
            id=str(created_user["_id"]),
            username=created_user["username"],
            email=created_user["email"],
            full_name=created_user["full_name"],
            is_active=created_user["is_active"],
            is_admin=created_user["is_admin"],
            created_at=created_user["created_at"],
            borrowed_books=created_user.get("borrowed_books", []),
            favorite_books=created_user.get("favorite_books", []),
            fine_amount=created_user.get("fine_amount", 0.0)
        )
        
        logger.info(f"==== FIN INSCRIPTION UTILISATEUR: {user_data.username} - SUCCÈS ====")
        return user_response
        
    except Exception as e:
        # Log détaillé de l'erreur pour faciliter le diagnostic
        logger.error(f"❌❌❌ ERREUR INSCRIPTION: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error(f"==== FIN INSCRIPTION UTILISATEUR: {user_data.username} - ÉCHEC ====")
        
        # Retourner un message d'erreur plus détaillé en développement
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during registration: {type(e).__name__} - {str(e)}"
        )

@router.post("/login")
async def login(login_data: LoginRequest):
    """Connexion utilisateur"""
    logger.info(f"==== DÉBUT LOGIN UTILISATEUR: {login_data.email} ====")
    try:
        logger.info(f"Tentative d'authentification avec l'email: {login_data.email}")
        user = await authenticate_user(login_data.email, login_data.password)
        if not user:
            logger.warning(f"❌ Échec d'authentification pour {login_data.email}: identifiants incorrects")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        logger.info(f"✓ Authentification réussie pour {login_data.email}")
        logger.info(f"Génération du token d'accès pour {login_data.email}")
        access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        logger.info(f"✓ Token généré avec succès pour {login_data.email}")
    except Exception as e:
        logger.error(f"❌❌❌ ERREUR LOGIN: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        logger.error(f"==== FIN LOGIN UTILISATEUR: {login_data.email} - ÉCHEC ====")
        raise
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
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
    }

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Demander une réinitialisation de mot de passe"""
    logger.info(f"==== DÉBUT DEMANDE RÉINITIALISATION: {request.email} ====")
    
    try:
        # Vérifier si l'utilisateur existe
        user = await get_user_by_email(request.email)
        
        if not user:
            # Pour des raisons de sécurité, on retourne toujours un succès
            # même si l'utilisateur n'existe pas
            logger.warning(f"Tentative de réinitialisation pour email inexistant: {request.email}")
            return {"message": "Si cet email existe, vous recevrez un lien de réinitialisation."}
        
        if not user.is_active:
            logger.warning(f"Tentative de réinitialisation pour compte inactif: {request.email}")
            return {"message": "Si cet email existe, vous recevrez un lien de réinitialisation."}
        
        # Générer le token de réinitialisation
        reset_token = email_service.generate_reset_token(request.email)
        logger.info(f"Token de réinitialisation généré pour {request.email}")
        
        # Envoyer l'email
        email_sent = email_service.send_password_reset_email(request.email, reset_token)
        
        if email_sent:
            logger.info(f"✓ Email de réinitialisation envoyé à {request.email}")
            return {
                "message": "Si cet email existe, vous recevrez un lien de réinitialisation.",
                "email_sent": True
            }
        else:
            logger.error(f"❌ Échec envoi email de réinitialisation à {request.email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de l'envoi de l'email. Veuillez réessayer plus tard."
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌❌❌ ERREUR RÉINITIALISATION: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur interne du serveur"
        )
    finally:
        logger.info(f"==== FIN DEMANDE RÉINITIALISATION: {request.email} ====")

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Réinitialiser le mot de passe avec un token"""
    logger.info(f"==== DÉBUT RÉINITIALISATION MOT DE PASSE ====")
    
    try:
        # Vérifier et décoder le token
        email = email_service.verify_reset_token(
            request.token, 
            max_age=settings.password_reset_token_expire_minutes * 60
        )
        
        if not email:
            logger.warning(f"Token de réinitialisation invalide ou expiré")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token de réinitialisation invalide ou expiré"
            )
        
        logger.info(f"Token valide pour l'email: {email}")
        
        # Vérifier que l'utilisateur existe toujours
        user = await get_user_by_email(email)
        if not user:
            logger.error(f"Utilisateur introuvable pour email: {email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur introuvable"
            )
        
        if not user.is_active:
            logger.warning(f"Compte inactif pour email: {email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Compte inactif"
            )
        
        # Valider le nouveau mot de passe
        if len(request.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le mot de passe doit contenir au moins 6 caractères"
            )
        
        # Hacher le nouveau mot de passe
        hashed_password = get_password_hash(request.new_password)
        
        # Mettre à jour le mot de passe dans la base de données
        db = get_database()
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Base de données non disponible"
            )
        
        result = await db.users.update_one(
            {"email": email},
            {"$set": {"hashed_password": hashed_password}}
        )
        
        if result.modified_count == 0:
            logger.error(f"Impossible de mettre à jour le mot de passe pour: {email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erreur lors de la mise à jour du mot de passe"
            )
        
        logger.info(f"✓ Mot de passe réinitialisé avec succès pour: {email}")
        
        return {
            "message": "Mot de passe réinitialisé avec succès",
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌❌❌ ERREUR RÉINITIALISATION MOT DE PASSE: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur interne du serveur"
        )
    finally:
        logger.info(f"==== FIN RÉINITIALISATION MOT DE PASSE ====")

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: UserResponse = Depends(get_current_active_user)):
    """Récupérer les informations de l'utilisateur connecté"""
    return current_user

@router.get("/verify-token")
async def verify_token(current_user: UserResponse = Depends(get_current_active_user)):
    """Vérifier la validité du token"""
    return {"valid": True, "user_id": current_user.id}

@router.get("/ping")
async def ping_auth():
    """Simple endpoint de test pour vérifier que l'API d'authentification est accessible"""
    logger.info("Endpoint /auth/ping appelé - API Auth accessible")
    return {"status": "ok", "message": "Auth API is reachable"}