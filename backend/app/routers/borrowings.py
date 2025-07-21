from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.encoders import jsonable_encoder
from typing import List, Optional
from datetime import datetime, timedelta
import logging
from app.models.borrowing import (
    Borrowing, Reservation, BorrowingCreate, BorrowingResponse,
    ReservationCreate, ReservationResponse, BorrowingStatus, ReservationStatus
)
from app.models.user import UserResponse
from app.services.auth_service import get_current_active_user, get_current_admin_user
from app.database import get_database
from bson import ObjectId

# Configurer le logger pour ce module
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/borrow", response_model=BorrowingResponse)
async def borrow_book(
    borrowing_data: BorrowingCreate,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Emprunter un livre"""
    db = get_database()
    
    # Vérifier que le livre existe
    book = await db.books.find_one({"_id": ObjectId(borrowing_data.book_id)})
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Vérifier la disponibilité
    if book["available_copies"] <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book not available for borrowing"
        )
    
    # Vérifier que l'utilisateur n'a pas déjà emprunté ce livre
    existing_borrowing = await db.borrowings.find_one({
        "user_id": current_user.id,
        "book_id": borrowing_data.book_id,
        "status": BorrowingStatus.ACTIVE
    })
    
    if existing_borrowing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already borrowed this book"
        )
    
    # Créer l'emprunt
    borrowing = Borrowing(
        user_id=current_user.id,
        book_id=borrowing_data.book_id,
        borrowed_at=datetime.utcnow(),
        due_date=datetime.utcnow() + timedelta(days=14),
        status=BorrowingStatus.ACTIVE,
        fine_amount=0.0,
        renewal_count=0,
        max_renewals=2
    )
    
    # Insérer l'emprunt (compatible Pydantic v1/v2)
    try:
        # Pydantic v2
        borrowing_dict = borrowing.model_dump(by_alias=True)
    except AttributeError:
        # Pydantic v1
        borrowing_dict = borrowing.dict(by_alias=True)
        
    result = await db.borrowings.insert_one(borrowing_dict)
    
    # Mettre à jour le nombre de copies disponibles
    await db.books.update_one(
        {"_id": ObjectId(borrowing_data.book_id)},
        {"$inc": {"available_copies": -1}}
    )
    
    # Ajouter le livre aux livres empruntés de l'utilisateur
    await db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {"$push": {"borrowed_books": borrowing_data.book_id}}
    )
    
    # Retourner l'emprunt créé
    created_borrowing = await db.borrowings.find_one({"_id": result.inserted_id})
    return BorrowingResponse(
        id=str(created_borrowing["_id"]),
        user_id=created_borrowing["user_id"],
        book_id=created_borrowing["book_id"],
        borrowed_at=created_borrowing["borrowed_at"],
        due_date=created_borrowing["due_date"],
        returned_at=created_borrowing.get("returned_at"),
        status=created_borrowing["status"],
        fine_amount=created_borrowing.get("fine_amount", 0.0),
        renewal_count=created_borrowing.get("renewal_count", 0),
        max_renewals=created_borrowing.get("max_renewals", 2)
    )

@router.post("/return/{borrowing_id}")
async def return_book(
    borrowing_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Retourner un livre emprunté"""
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"==== DÉBUT RETOUR LIVRE - ID emprunt: {borrowing_id} ====")
    db = get_database()
    logger.info(f"✓ Base de données disponible")
    
    logger.info(f"Vérification validité ObjectId: {borrowing_id}")
    if not ObjectId.is_valid(borrowing_id):
        logger.error(f"❌ ObjectId non valide: {borrowing_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid borrowing ID"
        )
    logger.info(f"✓ ObjectId valide")
    
    # Récupérer l'emprunt
    logger.info(f"Recherche de l'emprunt dans la base de données: {borrowing_id}")
    
    # 1. Première tentative avec ObjectId
    borrowing = await db.borrowings.find_one({"_id": ObjectId(borrowing_id)})
    
    # 2. Si ça échoue, essayons de trouver l'emprunt dans la liste complète des emprunts de l'utilisateur
    if not borrowing:
        logger.warning(f"⚠️ Emprunt non trouvé directement avec ObjectId. Recherche via liste des emprunts utilisateur...")
        user_borrowings = await db.borrowings.find({"user_id": current_user.id}).to_list(20)
        
        if user_borrowings:
            logger.info(f"Emprunts disponibles pour l'utilisateur {current_user.id}:")
            for b in user_borrowings:
                b_id_str = str(b['_id'])
                logger.info(f"- ID: {b_id_str}, Livre: {b.get('book_id')}, Status: {b.get('status', 'inconnu')}")
                
                # Vérifions si un des emprunts correspond à notre ID recherché
                if b_id_str == borrowing_id:
                    logger.info(f"✅ Emprunt trouvé via la liste d'emprunts utilisateur: {b_id_str}")
                    borrowing = b
                    break
        
        if not borrowing:
            logger.error(f"❌ Emprunt non trouvé dans la base de données: {borrowing_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Borrowing not found"
            )
    
    logger.info(f"✓ Emprunt trouvé: {borrowing.get('_id')} pour le livre {borrowing.get('book_id')}")
    
    # Vérifier que c'est l'utilisateur qui a emprunté le livre ou un admin
    logger.info(f"Vérification des autorisations - User ID: {current_user.id}, Borrowing User ID: {borrowing.get('user_id')}, Is Admin: {current_user.is_admin}")
    if borrowing["user_id"] != current_user.id and not current_user.is_admin:
        logger.error(f"❌ Non autorisé: User ID {current_user.id} != Borrowing User ID {borrowing.get('user_id')} et non admin")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to return this book"
        )
    
    logger.info(f"✓ Autorisation validée")
    
    # Vérifier que le livre n'est pas déjà retourné
    logger.info(f"Vérification du statut de l'emprunt: {borrowing.get('status')}")
    if borrowing["status"] == BorrowingStatus.RETURNED:
        logger.error(f"❌ Livre déjà retourné")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book already returned"
        )
    
    logger.info(f"✓ Statut valide pour retour")

    # Calculer l'amende si en retard
    fine_amount = 0.0
    now = datetime.utcnow()
    logger.info(f"Date actuelle: {now}, Date d'échéance: {borrowing.get('due_date')}")
    
    if now > borrowing["due_date"]:
        days_late = (now - borrowing["due_date"]).days
        fine_amount = days_late * 1.0  # 1€ par jour de retard
        logger.info(f"Livre en retard de {days_late} jours, amende: {fine_amount} €")
    else:
        logger.info("Livre retourné dans les délais, pas d'amende")
    
    # Mettre à jour l'emprunt
    logger.info(f"Mise à jour de l'emprunt {borrowing_id} pour le marquer comme retourné")
    
    # Utilisons directement l'ID du document que nous avons trouvé
    borrowing_object_id = borrowing['_id']  # Ceci est déjà un ObjectId MongoDB
    logger.info(f"Utilisation de l'ID MongoDB natif: {borrowing_object_id}")
    
    update_result = await db.borrowings.update_one(
        {"_id": borrowing_object_id},  # On utilise l'objet natif, pas une conversion
        {
            "$set": {
                "returned_at": now,
                "status": BorrowingStatus.RETURNED,
                "fine_amount": fine_amount
            }
        }
    )
    logger.info(f"Résultat de la mise à jour de l'emprunt: {update_result.modified_count} document(s) modifié(s)")
    
    # Si la mise à jour n'a pas fonctionné, essayons une approche alternative
    if update_result.modified_count == 0:
        logger.warning(f"La mise à jour avec l'ID natif a échoué, tentative avec une autre approche")
        # Essai avec force_str pour assurer une comparaison de chaînes
        update_result = await db.borrowings.update_many(
            {"user_id": current_user.id, "book_id": borrowing["book_id"], "status": BorrowingStatus.ACTIVE}, 
            {
                "$set": {
                    "returned_at": now,
                    "status": BorrowingStatus.RETURNED,
                    "fine_amount": fine_amount
                }
            }
        )
        logger.info(f"Résultat de la mise à jour alternative: {update_result.modified_count} document(s) modifié(s)")

    
    # Mettre à jour le nombre de copies disponibles
    logger.info(f"Mise à jour du nombre de copies disponibles pour le livre {borrowing['book_id']}")
    book_update_result = await db.books.update_one(
        {"_id": ObjectId(borrowing["book_id"])},
        {"$inc": {"available_copies": 1}}
    )
    logger.info(f"Résultat de la mise à jour du livre: {book_update_result.modified_count} document(s) modifié(s)")
    
    # Retirer le livre des livres empruntés de l'utilisateur
    logger.info(f"Retrait du livre de la liste des emprunts de l'utilisateur {borrowing['user_id']}")
    
    # Vérifions si le champ borrowed_books existe
    user = await db.users.find_one({"_id": ObjectId(borrowing["user_id"])})
    if user and "borrowed_books" in user:
        logger.info(f"Liste des livres empruntés avant mise à jour: {user.get('borrowed_books', [])}")
        
        # Utiliser l'ID natif pour la mise à jour
        user_update_result = await db.users.update_one(
            {"_id": ObjectId(borrowing["user_id"])},
            {"$pull": {"borrowed_books": borrowing["book_id"]}}
        )
        logger.info(f"Résultat du retrait du livre: {user_update_result.modified_count} document(s) modifié(s)")
        
        # Vérifions si la mise à jour a réussi
        if user_update_result.modified_count == 0:
            logger.warning(f"Le retrait du livre avec $pull a échoué, essai alternatif")
            
            # Récupérer la liste actuelle et la mettre à jour manuellement
            user_after = await db.users.find_one({"_id": ObjectId(borrowing["user_id"])})
            current_books = user_after.get("borrowed_books", [])
            logger.info(f"Liste actuelle des livres: {current_books}")
            
            if borrowing["book_id"] in current_books:
                new_books = [b for b in current_books if b != borrowing["book_id"]]
                logger.info(f"Nouvelle liste des livres (après retrait): {new_books}")
                
                manual_update = await db.users.update_one(
                    {"_id": ObjectId(borrowing["user_id"])},
                    {"$set": {"borrowed_books": new_books}}
                )
                logger.info(f"Résultat de la mise à jour manuelle: {manual_update.modified_count} document(s)")
    else:
        logger.warning(f"Utilisateur non trouvé ou champ 'borrowed_books' non présent")

    
    # Ajouter l'amende à l'utilisateur si nécessaire
    if fine_amount > 0:
        logger.info(f"Ajout de l'amende de {fine_amount} € à l'utilisateur {borrowing['user_id']}")
        fine_result = await db.users.update_one(
            {"_id": ObjectId(borrowing["user_id"])},
            {"$inc": {"fine_amount": fine_amount}}
        )
        logger.info(f"Résultat de l'ajout d'amende: {fine_result.modified_count} document(s) modifié(s)")
    
    logger.info(f"==== FIN RETOUR LIVRE - ID emprunt: {borrowing_id} - SUCCÈS ====\n")
    return {
        "message": "Book returned successfully",
        "fine_amount": fine_amount,
        "returned_at": now
    }

@router.post("/reserve", response_model=ReservationResponse)
async def reserve_book(
    reservation_data: ReservationCreate,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Réserver un livre"""
    db = get_database()
    
    # Vérifier que le livre existe
    book = await db.books.find_one({"_id": ObjectId(reservation_data.book_id)})
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Vérifier que l'utilisateur n'a pas déjà une réservation active
    existing_reservation = await db.reservations.find_one({
        "user_id": current_user.id,
        "book_id": reservation_data.book_id,
        "status": ReservationStatus.PENDING
    })
    
    if existing_reservation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending reservation for this book"
        )
    
    # Créer la réservation avec tous les champs requis
    now = datetime.utcnow()
    reservation = Reservation(
        user_id=current_user.id,
        book_id=reservation_data.book_id,
        reserved_at=now,
        expires_at=now + timedelta(days=7),
        status=ReservationStatus.PENDING,
        notified=False
    )
    
    # Insérer la réservation
    # Convertir en dict avec tous les champs inclus
    try:
        # Pydantic v2
        reservation_dict = reservation.model_dump(by_alias=True)
    except AttributeError:
        # Pydantic v1 fallback
        reservation_dict = reservation.dict(by_alias=True)
    
    # Vérifier que les champs essentiels sont présents
    logger.info(f"Champs de la réservation avant insertion: {reservation_dict.keys()}")
    
    result = await db.reservations.insert_one(reservation_dict)
    
    # Retourner la réservation créée
    created_reservation = await db.reservations.find_one({"_id": result.inserted_id})
    return ReservationResponse(
        id=str(created_reservation["_id"]),
        user_id=created_reservation["user_id"],
        book_id=created_reservation["book_id"],
        reserved_at=created_reservation["reserved_at"],
        expires_at=created_reservation["expires_at"],
        status=created_reservation["status"],
        notified=created_reservation.get("notified", False)
    )

@router.get("/my-borrowings", response_model=List[BorrowingResponse])
async def get_my_borrowings(
    status: Optional[BorrowingStatus] = None,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Récupérer les emprunts de l'utilisateur connecté"""
    db = get_database()
    
    filter_query = {"user_id": current_user.id}
    if status:
        filter_query["status"] = status
    
    cursor = db.borrowings.find(filter_query).sort("borrowed_at", -1)
    borrowings = await cursor.to_list(length=100)
    
    borrowing_responses = []
    for borrowing in borrowings:
        borrowing_responses.append(BorrowingResponse(
            id=str(borrowing["_id"]),
            user_id=borrowing["user_id"],
            book_id=borrowing["book_id"],
            borrowed_at=borrowing["borrowed_at"],
            due_date=borrowing["due_date"],
            returned_at=borrowing.get("returned_at"),
            status=borrowing["status"],
            fine_amount=borrowing.get("fine_amount", 0.0),
            renewal_count=borrowing.get("renewal_count", 0),
            max_renewals=borrowing.get("max_renewals", 2)
        ))
    
    return borrowing_responses

@router.get("/my-reservations", response_model=List[ReservationResponse])
async def get_my_reservations(
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Récupérer les réservations de l'utilisateur connecté"""
    db = get_database()
    
    cursor = db.reservations.find({"user_id": current_user.id}).sort("reserved_at", -1)
    reservations = await cursor.to_list(length=100)
    
    reservation_responses = []
    
    # Créer un dictionnaire pour garder en mémoire les livres déjà récupérés
    book_cache = {}
    
    for reservation in reservations:
        try:
            # Utiliser datetime.utcnow() comme valeur par défaut pour les champs de date manquants
            now = datetime.utcnow()
            
            # Afficher les champs disponibles dans la réservation pour le débogage
            logger.info(f"Champs disponibles dans la réservation: {reservation.keys()}")
            
            book_id = reservation["book_id"]
            book_info = None
            
            # Si le livre n'est pas déjà dans le cache, le récupérer de la base de données
            if book_id not in book_cache:
                if ObjectId.is_valid(book_id):
                    book = await db.books.find_one({"_id": ObjectId(book_id)})
                    if book:
                        book_cache[book_id] = {
                            "id": book_id,
                            "title": book.get("title", "Titre inconnu"),
                            "author": book.get("author", "Auteur inconnu"),
                            "cover_image": book.get("cover_image")
                        }
                        logger.info(f"Livre trouvé pour la réservation: {book.get('title')}")
            
            # Récupérer les informations du livre du cache
            if book_id in book_cache:
                book_info = book_cache[book_id]
            
            reservation_responses.append(ReservationResponse(
                id=str(reservation["_id"]),
                user_id=reservation["user_id"],
                book_id=reservation["book_id"],
                reserved_at=reservation.get("reserved_at", now),
                expires_at=reservation.get("expires_at", now + timedelta(days=7)),
                status=reservation.get("status", ReservationStatus.PENDING),
                notified=reservation.get("notified", False),
                book_info=book_info
            ))
        except Exception as e:
            logger.error(f"Erreur lors du traitement de la réservation {reservation.get('_id')}: {str(e)}")
            # On continue avec les autres réservations même si une échoue
    
    return reservation_responses

@router.post("/renew/{borrowing_id}")
@router.post("/renewal/{borrowing_id}")  # Route alternative pour tester
async def renew_borrowing(
    borrowing_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Renouveler un emprunt"""
    logger.info(f"Tentative de renouvellement de l'emprunt avec ID: {borrowing_id}")
    db = get_database()
    
    if not ObjectId.is_valid(borrowing_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid borrowing ID"
        )
    
    # Récupérer l'emprunt
    logger.info(f"Recherche de l'emprunt avec ID: {borrowing_id} (ObjectId: {ObjectId(borrowing_id)})")
    
    # Vérifier si l'emprunt existe
    all_borrowings = await db.borrowings.find().to_list(length=20)
    logger.info(f"Emprunts disponibles dans la base: {[str(b['_id']) for b in all_borrowings if '_id' in b]}")
    
    # Recherche directe par ObjectId (méthode standard)
    borrowing = await db.borrowings.find_one({"_id": ObjectId(borrowing_id)})
    
    # Si non trouvé, essayer une approche alternative en recherchant manuellement
    if not borrowing:
        logger.warning(f"Tentative de recherche alternative pour l'ID {borrowing_id}")
        # Essayer de trouver manuellement l'emprunt dans la liste récupérée
        for b in all_borrowings:
            if '_id' in b and str(b['_id']) == borrowing_id:
                borrowing = b
                logger.info(f"Emprunt trouvé par méthode alternative: {borrowing}")
                break
    
    if not borrowing:
        logger.error(f"Emprunt avec ID {borrowing_id} non trouvé dans la base de données")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Borrowing not found"
        )
    else:
        logger.info(f"Emprunt trouvé: {borrowing}")


    
    # Vérifier que c'est l'utilisateur qui a emprunté le livre
    if borrowing["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to renew this borrowing"
        )
    
    # Vérifier que l'emprunt est actif
    if borrowing["status"] != BorrowingStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only renew active borrowings"
        )
    
    # Vérifier le nombre de renouvellements
    renewal_count = borrowing.get("renewal_count", 0)
    max_renewals = borrowing.get("max_renewals", 2)
    
    if renewal_count >= max_renewals:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum renewals reached"
        )
    
    # Calculer la nouvelle date d'échéance
    new_due_date = borrowing["due_date"] + timedelta(days=14)
    
    # Mettre à jour l'emprunt
    await db.borrowings.update_one(
        {"_id": ObjectId(borrowing_id) if isinstance(borrowing['_id'], ObjectId) else borrowing['_id']},
        {
            "$set": {
                "due_date": new_due_date,
                "renewal_count": renewal_count + 1
            }
        }
    )
    
    # Récupérer l'emprunt mis à jour
    updated_borrowing = None
    
    # Utiliser la même méthode de recherche que précédemment
    if isinstance(borrowing['_id'], ObjectId):
        updated_borrowing = await db.borrowings.find_one({"_id": borrowing['_id']})
    else:
        # Récupérer tous les emprunts pour trouver celui qui correspond
        fresh_borrowings = await db.borrowings.find().to_list(length=20)
        for b in fresh_borrowings:
            if '_id' in b and str(b['_id']) == str(borrowing['_id']):
                updated_borrowing = b
                break
    
    if not updated_borrowing:
        logger.warning(f"Impossible de récupérer l'emprunt mis à jour, on utilise l'ancien avec les mises à jour")
        # Créer une copie avec les champs mis à jour
        updated_borrowing = dict(borrowing)
        updated_borrowing['due_date'] = new_due_date
        updated_borrowing['renewal_count'] = renewal_count + 1
    
    # Convertir l'ObjectId en string pour la sérialisation JSON
    if '_id' in updated_borrowing and isinstance(updated_borrowing['_id'], ObjectId):
        updated_borrowing['_id'] = str(updated_borrowing['_id'])
    
    return {
        "message": "Borrowing renewed successfully",
        "new_due_date": new_due_date,
        "renewals_remaining": max_renewals - (renewal_count + 1),
        "updated_borrowing": jsonable_encoder(updated_borrowing)  # Inclure l'emprunt complet mis à jour
    }