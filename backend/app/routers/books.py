from fastapi import APIRouter, HTTPException, status, Depends, Form, UploadFile, File
from fastapi.responses import FileResponse
from app.database import get_database
from app.models.book import BookCreate, BookUpdate, BookResponse, Book
from app.models.user import UserResponse
from app.services.auth_service import get_current_admin_user, get_current_user
from typing import List, Optional
from bson.objectid import ObjectId
from datetime import datetime
import os
from pathlib import Path
import shutil
import uuid
import logging
from pydantic import BaseModel

class ProblemReport(BaseModel):
    description: str

router = APIRouter()
logger = logging.getLogger(__name__)

# Définir le chemin pour le stockage des images
IMAGE_DIR = Path("static/images")
os.makedirs(IMAGE_DIR, exist_ok=True)

# Stocker les signalements de problèmes temporairement en mémoire
# En production, on utiliserait une collection MongoDB dédiée
problem_reports = []

@router.get("/", response_model=List[BookResponse])
async def get_books(
    search: Optional[str] = None, 
    category: Optional[str] = None, 
    author: Optional[str] = None, 
    skip: int = 0, 
    limit: int = 20, 
    db = Depends(get_database)
):
    """
    Récupérer une liste de livres avec filtrage par titre, auteur et catégorie.
    """
    try:
        # Construire le filtre de recherche
        query = {}
        
        # Recherche par texte dans le titre OU l'auteur
        if search:
            # Utiliser une recherche insensible à la casse et partielle
            text_search = {"$regex": search, "$options": "i"}
            query["$or"] = [
                {"title": text_search},
                {"author": text_search},
                {"description": text_search}
            ]
        
        # Filtrer par catégorie si spécifié (chercher dans category ET genre)
        if category:
            category_search = {"$regex": category, "$options": "i"}
            query["$or"] = query.get("$or", []) + [
                {"category": category_search},
                {"genre": category_search}
            ]
        
        # Filtrer par auteur si spécifié
        if author:
            query["author"] = {"$regex": author, "$options": "i"}
        
        # Exécuter la requête avec pagination
        cursor = db.books.find(query).skip(skip).limit(limit)
        books = await cursor.to_list(length=limit)
        
        # Convertir les résultats en modèle de réponse avec gestion des champs manquants
        result = []
        for book in books:
            try:
                # Gérer le champ category/genre
                category_value = book.get("category") or book.get("genre", "Non spécifié")
                
                book_response = BookResponse(
                    id=str(book["_id"]),
                    title=book.get("title", "Titre inconnu"),
                    author=book.get("author", "Auteur inconnu"),
                    isbn=book.get("isbn", ""),
                    description=book.get("description", ""),
                    category=category_value,
                    publication_year=book.get("publication_year", 0),
                    publisher=book.get("publisher", ""),
                    pages=book.get("pages"),
                    language=book.get("language", "Français"),
                    cover_image=book.get("cover_image"),
                    available_copies=book.get("available_copies", 1),
                    total_copies=book.get("total_copies", 1),
                    created_at=book.get("created_at"),
                    rating=book.get("rating", 0.0),
                    reviews_count=book.get("reviews_count", 0)
                )
                result.append(book_response)
            except Exception as book_error:
                logger.error(f"Erreur lors du traitement du livre {book.get('_id')}: {book_error}")
                continue
        
        return result
        
    except Exception as e:
        logger.error(f"Erreur dans get_books: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des livres: {str(e)}"
        )

@router.post("/", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_book(
    book: BookCreate,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_admin_user)
):
    # Vérifier si un livre avec le même ISBN existe déjà
    if await db.books.find_one({"isbn": book.isbn}) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book with this ISBN already exists"
        )
    
    # Convertir le modèle Pydantic en dictionnaire
    book_dict = {}
    # Gestion compatible avec Pydantic v1 et v2
    try:
        # Pydantic v1
        book_dict = book.dict(by_alias=True)
    except AttributeError:
        # Pydantic v2
        book_dict = book.model_dump(by_alias=True)
    
    # Ajouter des champs supplémentaires
    book_dict["available_copies"] = book_dict["total_copies"]
    book_dict["created_at"] = datetime.utcnow()
    book_dict["updated_at"] = datetime.utcnow()
    book_dict["rating"] = 0.0
    book_dict["reviews_count"] = 0
    
    # Insérer dans la base de données
    new_book = await db.books.insert_one(book_dict)
    created_book = await db.books.find_one({"_id": new_book.inserted_id})
    
    return BookResponse(
        id=str(created_book["_id"]),
        title=created_book["title"],
        author=created_book["author"],
        isbn=created_book["isbn"],
        description=created_book.get("description"),
        category=created_book["category"],
        publication_year=created_book["publication_year"],
        publisher=created_book.get("publisher"),
        pages=created_book.get("pages"),
        language=created_book["language"],
        cover_image=created_book.get("cover_image"),
        available_copies=created_book["available_copies"],
        total_copies=created_book["total_copies"],
        created_at=created_book["created_at"],
        rating=created_book.get("rating", 0.0),
        reviews_count=created_book.get("reviews_count", 0)
    )

@router.post("/upload", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_book_with_image(
    title: str = Form(...),
    author: str = Form(...),
    isbn: str = Form(...),
    category: str = Form(...),
    publication_year: str = Form(...),  # On accepte une chaîne pour convertir manuellement
    total_copies: str = Form(...),      # On accepte une chaîne pour convertir manuellement
    description: Optional[str] = Form(None),
    publisher: Optional[str] = Form(None),
    pages: Optional[str] = Form(None),  # On accepte une chaîne pour convertir manuellement
    language: str = Form("Français"),
    cover_image: UploadFile = File(None),
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_admin_user)
):
    # Logs de diagnostic
    logger.info("=== DIAGNOSTIC UPLOAD IMAGE ===")
    logger.info(f"Titre: {title}")
    logger.info(f"Auteur: {author}")
    logger.info(f"ISBN: {isbn}")
    logger.info(f"Catégorie: {category}")
    logger.info(f"Année: {publication_year}")
    logger.info(f"Copies: {total_copies}")
    if cover_image:
        logger.info(f"Image: {cover_image.filename}, taille: {cover_image.size} bytes")
    else:
        logger.info("Pas d'image fournie")
    logger.info("================================")
    # Vérifier si un livre avec le même ISBN existe déjà
    if await db.books.find_one({"isbn": isbn}) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book with this ISBN already exists"
        )
    
    image_url = None
    
    # Si une image est fournie, la sauvegarder
    if cover_image:
        # Générer un nom de fichier unique pour éviter les collisions
        file_extension = os.path.splitext(cover_image.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Chemin complet pour sauvegarder l'image
        file_path = IMAGE_DIR / unique_filename
        
        # S'assurer que le répertoire existe
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Sauvegarder l'image
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(cover_image.file, buffer)
        
        # URL absolue pour accéder à l'image (incluant domaine et port)
        image_url = f"http://localhost:8000/static/images/{unique_filename}"
    
    # Convertir les chaînes en entiers avec gestion robuste des valeurs invalides
    try:
        # Publication year - valeur par défaut 2000 si invalide
        publication_year_int = 0
        if publication_year and publication_year.strip() and publication_year.strip().lower() != 'nan':
            try:
                publication_year_int = int(publication_year.strip())
            except ValueError:
                publication_year_int = 2000  # valeur par défaut
        
        # Total copies - valeur par défaut 1 si invalide
        total_copies_int = 1  # au moins 1 copie par défaut
        if total_copies and total_copies.strip() and total_copies.strip().lower() != 'nan':
            try:
                total_copies_int = int(total_copies.strip())
                if total_copies_int < 1:
                    total_copies_int = 1  # minimum 1 copie
            except ValueError:
                pass  # garde la valeur par défaut

        # Pages - None si invalide
        pages_int = None
        if pages and pages.strip() and pages.strip().lower() != 'nan':
            try:
                pages_int = int(pages.strip())
                if pages_int <= 0:  # Si négatif ou zéro
                    pages_int = None
            except ValueError:
                pass  # garde la valeur None

        logger.info(f"Conversion réussie - Année: {publication_year_int}, Copies: {total_copies_int}, Pages: {pages_int}")
        
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la conversion des types: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Erreur de conversion des données: {str(e)}"
        )

    # Créer le dictionnaire du livre
    book_dict = {
        "title": title,
        "author": author,
        "isbn": isbn,
        "category": category,
        "publication_year": publication_year_int,
        "total_copies": total_copies_int,
        "description": description,
        "publisher": publisher,
        "pages": pages_int,
        "language": language,
        "cover_image": image_url,
        "available_copies": total_copies_int,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "rating": 0.0,
        "reviews_count": 0
    }
    
    # Insérer dans la base de données
    new_book = await db.books.insert_one(book_dict)
    created_book = await db.books.find_one({"_id": new_book.inserted_id})
    
    return BookResponse(
        id=str(created_book["_id"]),
        title=created_book["title"],
        author=created_book["author"],
        isbn=created_book["isbn"],
        description=created_book.get("description"),
        category=created_book["category"],
        publication_year=created_book["publication_year"],
        publisher=created_book.get("publisher"),
        pages=created_book.get("pages"),
        language=created_book["language"],
        cover_image=created_book.get("cover_image"),
        available_copies=created_book["available_copies"],
        total_copies=created_book["total_copies"],
        created_at=created_book["created_at"],
        rating=created_book.get("rating", 0.0),
        reviews_count=created_book.get("reviews_count", 0)
    )

@router.get("/", response_model=List[BookResponse])
async def get_all_books(db = Depends(get_database)):
    books = []
    async for book in db.books.find():
        # Ajout de valeurs par défaut pour les champs qui pourraient être manquants
        books.append(
            BookResponse(
                id=str(book["_id"]),
                title=book["title"],
                author=book["author"],
                isbn=book["isbn"],
                description=book.get("description"),
                category=book["category"],
                publication_year=book["publication_year"],
                publisher=book.get("publisher"),
                pages=book.get("pages"),
                language=book.get("language", "Français"),
                cover_image=book.get("cover_image"),
                available_copies=book.get("available_copies", book.get("total_copies", 1)),
                total_copies=book.get("total_copies", 1),
                # Utiliser datetime.utcnow() comme valeur par défaut si created_at est absent
                created_at=book.get("created_at", datetime.utcnow()),
                rating=book.get("rating", 0.0),
                reviews_count=book.get("reviews_count", 0)
            )
        )
    return books

@router.post("/report-problem/{book_id}", status_code=status.HTTP_200_OK)
async def report_problem(
    book_id: str,
    problem: ProblemReport,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Signaler un problème avec un livre.
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
    
    # Créer un rapport de problème
    report = {
        "book_id": book_object_id,
        "user_id": ObjectId(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"],
        "description": problem.description,
        "reported_at": datetime.utcnow(),
        "status": "pending"  # pending, in_progress, resolved
    }
    
    # Enregistrer le rapport dans la base de données
    result = await db.problem_reports.insert_one(report)
    
    return {
        "success": True, 
        "message": "Problem reported successfully",
        "report_id": str(result.inserted_id)
    }

@router.get("/categories/list")
async def get_categories(db = Depends(get_database)):
    """
    Récupérer la liste de toutes les catégories de livres disponibles.
    """
    # Chercher toutes les catégories uniques dans la collection de livres
    categories = await db.books.distinct("category")
    # Filtrer les valeurs None et les chaînes vides
    valid_categories = [cat for cat in categories if cat]
    return {"categories": valid_categories}

@router.get("/{book_id}", response_model=BookResponse)
async def get_book(book_id: str, db = Depends(get_database)):
    book = await db.books.find_one({"_id": ObjectId(book_id)})
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID {book_id} not found"
        )
    
    return BookResponse(
        id=str(book["_id"]),
        title=book["title"],
        author=book["author"],
        isbn=book["isbn"],
        description=book.get("description"),
        category=book["category"],
        publication_year=book["publication_year"],
        publisher=book.get("publisher"),
        pages=book.get("pages"),
        language=book["language"],
        cover_image=book.get("cover_image"),
        available_copies=book["available_copies"],
        total_copies=book["total_copies"],
        created_at=book["created_at"],
        rating=book.get("rating", 0.0),
        reviews_count=book.get("reviews_count", 0)
    )

@router.put("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: str,
    book_update: BookUpdate,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_admin_user)
):
    # Vérifier si le livre existe
    book = await db.books.find_one({"_id": ObjectId(book_id)})
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID {book_id} not found"
        )
    
    # Convertir le modèle Pydantic en dictionnaire
    update_data = {}
    try:
        # Pydantic v1
        update_data = book_update.dict(exclude_unset=True)
    except AttributeError:
        # Pydantic v2
        update_data = book_update.model_dump(exclude_unset=True)
    
    # Mise à jour du nombre de copies disponibles si le nombre total a changé
    if "total_copies" in update_data:
        total_copies = update_data["total_copies"]
        # Calculer la différence entre les copies actuelles et les nouvelles copies
        diff = total_copies - book["total_copies"]
        # Mettre à jour les copies disponibles en fonction de la différence
        update_data["available_copies"] = book["available_copies"] + diff
        # S'assurer que available_copies n'est pas négatif
        if update_data["available_copies"] < 0:
            update_data["available_copies"] = 0
    
    # Ajouter le timestamp de mise à jour
    update_data["updated_at"] = datetime.utcnow()
    
    # Effectuer la mise à jour dans la base de données
    await db.books.update_one(
        {"_id": ObjectId(book_id)},
        {"$set": update_data}
    )
    
    # Récupérer le livre mis à jour
    updated_book = await db.books.find_one({"_id": ObjectId(book_id)})
    
    return BookResponse(
        id=str(updated_book["_id"]),
        title=updated_book["title"],
        author=updated_book["author"],
        isbn=updated_book["isbn"],
        description=updated_book.get("description"),
        category=updated_book["category"],
        publication_year=updated_book["publication_year"],
        publisher=updated_book.get("publisher"),
        pages=updated_book.get("pages"),
        language=updated_book["language"],
        cover_image=updated_book.get("cover_image"),
        available_copies=updated_book["available_copies"],
        total_copies=updated_book["total_copies"],
        created_at=updated_book["created_at"],
        rating=updated_book.get("rating", 0.0),
        reviews_count=updated_book.get("reviews_count", 0)
    )

@router.put("/{book_id}/upload", response_model=BookResponse)
async def update_book_with_image(
    book_id: str,
    title: str = Form(...),
    author: str = Form(...),
    isbn: str = Form(...),
    category: str = Form(...),
    publication_year: int = Form(...),
    total_copies: int = Form(...),
    description: Optional[str] = Form(None),
    publisher: Optional[str] = Form(None),
    pages: Optional[int] = Form(None),
    language: str = Form("Français"),
    cover_image: UploadFile = File(None),
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_admin_user)
):
    # Vérifier si le livre existe
    book = await db.books.find_one({"_id": ObjectId(book_id)})
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID {book_id} not found"
        )
    
    # Préparer les données de mise à jour
    update_data = {
        "title": title,
        "author": author,
        "isbn": isbn,
        "category": category,
        "publication_year": publication_year,
        "total_copies": total_copies,
        "description": description,
        "publisher": publisher,
        "pages": pages,
        "language": language,
        "updated_at": datetime.utcnow()
    }
    
    # Mise à jour du nombre de copies disponibles si le nombre total a changé
    diff = total_copies - book["total_copies"]
    update_data["available_copies"] = book["available_copies"] + diff
    if update_data["available_copies"] < 0:
        update_data["available_copies"] = 0
    
    # Si une nouvelle image est fournie, la sauvegarder et mettre à jour l'URL
    if cover_image:
        # Supprimer l'ancienne image si elle existe
        old_image = book.get("cover_image")
        if old_image and old_image.startswith("/static/images/"):
            old_image_name = old_image.split("/")[-1]
            old_image_path = IMAGE_DIR / old_image_name
            try:
                if os.path.exists(old_image_path):
                    os.remove(old_image_path)
                    logger.info(f"Ancienne image supprimée: {old_image_path}")
            except Exception as e:
                logger.error(f"Erreur lors de la suppression de l'ancienne image: {e}")
        
        # Générer un nom de fichier unique pour la nouvelle image
        file_extension = os.path.splitext(cover_image.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Chemin complet pour sauvegarder l'image
        file_path = IMAGE_DIR / unique_filename
        
        # S'assurer que le répertoire existe
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Sauvegarder l'image
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(cover_image.file, buffer)
        
        # URL relative pour accéder à l'image
        update_data["cover_image"] = f"/static/images/{unique_filename}"
        logger.info(f"Nouvelle image sauvegardée à {file_path}, URL: {update_data['cover_image']}")
    
    # Effectuer la mise à jour dans la base de données
    await db.books.update_one(
        {"_id": ObjectId(book_id)},
        {"$set": update_data}
    )
    
    # Récupérer le livre mis à jour
    updated_book = await db.books.find_one({"_id": ObjectId(book_id)})
    
    return BookResponse(
        id=str(updated_book["_id"]),
        title=updated_book["title"],
        author=updated_book["author"],
        isbn=updated_book["isbn"],
        description=updated_book.get("description"),
        category=updated_book["category"],
        publication_year=updated_book["publication_year"],
        publisher=updated_book.get("publisher"),
        pages=updated_book.get("pages"),
        language=updated_book["language"],
        cover_image=updated_book.get("cover_image"),
        available_copies=updated_book["available_copies"],
        total_copies=updated_book["total_copies"],
        created_at=updated_book["created_at"],
        rating=updated_book.get("rating", 0.0),
        reviews_count=updated_book.get("reviews_count", 0)
    )

@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: str,
    db = Depends(get_database),
    current_user: UserResponse = Depends(get_current_admin_user)
):
    # Vérifier si le livre existe
    book = await db.books.find_one({"_id": ObjectId(book_id)})
    if book is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Book with ID {book_id} not found"
        )
    
    # Supprimer l'image associée si elle existe
    cover_image = book.get("cover_image")
    if cover_image and cover_image.startswith("/static/images/"):
        image_name = cover_image.split("/")[-1]
        image_path = IMAGE_DIR / image_name
        try:
            if os.path.exists(image_path):
                os.remove(image_path)
                logger.info(f"Image supprimée: {image_path}")
        except Exception as e:
            logger.error(f"Erreur lors de la suppression de l'image: {e}")
    
    # Supprimer le livre de la base de données
    await db.books.delete_one({"_id": ObjectId(book_id)})
    return

@router.get("/static/images/{image_name}")
async def get_book_image(image_name: str):
    image_path = IMAGE_DIR / image_name
    if not os.path.exists(image_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    return FileResponse(image_path)


@router.get("/categories/list")
async def get_categories(db = Depends(get_database)):
    """
    Récupère toutes les catégories distinctes de livres disponibles dans la base de données.
    """
    logger.info("Récupération des catégories de livres")
    
    # Trouver toutes les catégories distinctes
    try:
        # Utilisation de distinct pour obtenir toutes les valeurs uniques du champ category
        categories = await db.books.distinct("category")
        
        # Filtrer les valeurs None ou vides
        categories = [cat for cat in categories if cat]
        
        # Trier alphabétiquement
        categories.sort()
        
        logger.info(f"Catégories trouvées: {categories}")
        return {"categories": categories}
    except Exception as e:
        logger.error(f"Erreur lors de la récupération des catégories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la récupération des catégories: {str(e)}"
        )
