from fastapi import APIRouter, Request, HTTPException, Body, Form, Depends
import logging
from app.models.book import BookCreate
from app.models.user import UserResponse
from app.services.auth_service import get_current_admin_user
from pydantic import ValidationError
import json
from fastapi.responses import JSONResponse

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/debug-add")
async def debug_add_book(request: Request):
    """Endpoint de debug pour voir les données exactes envoyées lors de l'ajout d'un livre"""
    # Récupération du body de la requête
    try:
        body = await request.json()
        
        # Logging détaillé des données reçues
        logger.info(f"DONNÉES REÇUES: {body}")
        
        # Analyse des types de données
        data_types = {key: f"{type(value).__name__} - {value}" for key, value in body.items()}
        logger.info(f"TYPES DE DONNÉES: {data_types}")
        
        # Tester la validation du modèle BookCreate
        try:
            book = BookCreate(**body)
            logger.info("✅ VALIDATION OK: Le modèle BookCreate valide correctement les données")
            
            # Vérifier chaque champ obligatoire
            expected_fields = ["title", "author", "isbn", "category", "publication_year"]
            missing_fields = [field for field in expected_fields if field not in body]
            if missing_fields:
                logger.warning(f"⚠️ ATTENTION: Champs obligatoires manquants: {missing_fields}")
                
        except ValidationError as e:
            logger.error(f"❌ ERREUR DE VALIDATION: {e}")
            return {
                "received_data": body,
                "data_types": data_types,
                "validation_error": str(e),
                "message": "Erreur de validation détectée (voir logs du serveur)"
            }
        
        # Retourner les données pour visualisation
        return {
            "received_data": body,
            "data_types": data_types,
            "message": "Données du formulaire reçues et analysées (voir logs du serveur)"
        }
    except Exception as e:
        logger.error(f"❌ ERREUR DE TRAITEMENT: {e}")
        raise HTTPException(status_code=400, detail=f"Erreur de traitement: {str(e)}")

@router.post("/form-debug")
async def debug_form_data(request: Request):
    """Endpoint pour déboguer les données de formulaire sans aucune validation"""
    try:
        # Essayer d'abord de lire comme JSON
        try:
            body = await request.json()
            content_type = "application/json"
        except:
            # Si ce n'est pas du JSON, essayer de lire comme form-data
            form = await request.form()
            body = {key: value for key, value in form.items()}
            content_type = "multipart/form-data"
            
        logger.info(f"DEBUG FORM - Content-Type: {content_type}")
        logger.info(f"DEBUG FORM - Headers: {request.headers}")
        logger.info(f"DEBUG FORM - Données reçues: {body}")
        
        # Analyser les types
        for key, value in body.items():
            logger.info(f"DEBUG FORM - Champ: {key}, Type: {type(value).__name__}, Valeur: {value}")
        
        return JSONResponse({
            "success": True,
            "content_type": content_type,
            "received_data": body
        })
    except Exception as e:
        logger.error(f"DEBUG FORM - ERREUR: {str(e)}")
        return JSONResponse({
            "success": False,
            "error": str(e)
        }, status_code=200)  # Même en cas d'erreur, on renvoie 200 pour voir le message
