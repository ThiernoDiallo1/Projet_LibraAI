from datetime import datetime, timedelta
from app.models.borrowing import BorrowingStatus
from bson import ObjectId
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class FineService:
    def __init__(self):
        self._db = None
        self.fine_per_day = 1.0  # 1€ par jour de retard
        self.max_fine_per_book = 30.0  # Maximum 30€ par livre
        self._initialized = False
    
    def get_database(self):
        """Obtenir la base de données"""
        # Import à l'intérieur de la fonction pour éviter les problèmes d'importation circulaire
        from app.database import get_database, db
        
        # Vérifier si nous avons déjà une connexion valide
        if self._db is not None:
            return self._db
            
        # Obtenir une instance de la base de données
        db_instance = get_database()
        
        # Si nous avons une instance valide, la conserver
        if db_instance is not None:
            logger.info("Successfully obtained database connection in FineService")
            self._db = db_instance
            self._initialized = True
            return self._db
        
        # Si la base n'est pas disponible via get_database(), essayer directement via db.database
        if db is not None and db.database is not None:
            logger.info("Using db.database in FineService as fallback")
            self._db = db.database
            self._initialized = True
            return self._db
            
        # Si toutes les tentatives échouent, logger l'erreur
        logger.error("Failed to initialize database in FineService.get_database()")
        return None
    
    async def calculate_fine_for_borrowing(self, borrowing: dict) -> float:
        """Calculer l'amende pour un emprunt en retard"""
        if borrowing["status"] != BorrowingStatus.OVERDUE:
            return 0.0
        
        due_date = borrowing["due_date"]
        current_date = datetime.utcnow()
        
        # Calculer les jours de retard
        days_overdue = (current_date - due_date).days
        
        if days_overdue <= 0:
            return 0.0
        
        # Calculer l'amende
        fine = days_overdue * self.fine_per_day
        
        # Appliquer le maximum
        fine = min(fine, self.max_fine_per_book)
        
        return round(fine, 2)
    
    async def update_overdue_borrowings(self) -> dict:
        """Mettre à jour tous les emprunts en retard et calculer les amendes"""
        try:
            db = self.get_database()
            if db is None:
                logger.error("Failed to get database connection")
                return {"success": False, "error": "Database connection error"}
            borrowings_collection = db.borrowings
            users_collection = db.users
            
            # Trouver tous les emprunts actifs dont la date d'échéance est dépassée
            current_date = datetime.utcnow()
            overdue_borrowings = await borrowings_collection.find({
                "status": BorrowingStatus.ACTIVE,
                "due_date": {"$lt": current_date}
            }).to_list(length=None)
            
            updated_count = 0
            total_fines_added = 0.0
            
            for borrowing in overdue_borrowings:
                # Mettre à jour le statut à OVERDUE
                await borrowings_collection.update_one(
                    {"_id": borrowing["_id"]},
                    {"$set": {"status": BorrowingStatus.OVERDUE}}
                )
                
                # Calculer la nouvelle amende
                borrowing["status"] = BorrowingStatus.OVERDUE  # Pour le calcul
                new_fine = await self.calculate_fine_for_borrowing(borrowing)
                
                if new_fine > borrowing.get("fine_amount", 0):
                    # Mettre à jour l'amende de l'emprunt
                    fine_difference = new_fine - borrowing.get("fine_amount", 0)
                    
                    await borrowings_collection.update_one(
                        {"_id": borrowing["_id"]},
                        {"$set": {"fine_amount": new_fine}}
                    )
                    
                    # Mettre à jour l'amende totale de l'utilisateur
                    await users_collection.update_one(
                        {"_id": ObjectId(borrowing["user_id"])},
                        {"$inc": {"fine_amount": fine_difference}}
                    )
                    
                    total_fines_added += fine_difference
                    updated_count += 1
            
            logger.info(f"Mis à jour {updated_count} emprunts en retard. Total des amendes ajoutées: {total_fines_added}€")
            
            return {
                "success": True,
                "updated_borrowings": updated_count,
                "total_fines_added": total_fines_added,
                "message": f"Mis à jour {updated_count} emprunts en retard"
            }
            
        except Exception as e:
            logger.error(f"Erreur lors de la mise à jour des amendes: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Erreur lors de la mise à jour des amendes"
            }
    
    async def get_user_total_fines(self, user_id: str) -> float:
        """Obtenir le total des amendes pour un utilisateur"""
        try:
            logger.info(f"=== DEBUT get_user_total_fines pour {user_id} ===")
            # Obtenir la base de données
            db = self.get_database()
            if db is None:
                logger.error(f"❌ ERREUR: Failed to get database connection pour {user_id}")
                return 0.0
                
            logger.info(f"✅ Connexion DB obtenue: {db is not None}")
            users_collection = db.users
            logger.info(f"✅ Collection users: {users_collection is not None}")
            
            # Convertir en ObjectId si nécessaire
            user_obj_id = ObjectId(user_id) if not isinstance(user_id, ObjectId) else user_id
            logger.info(f"Recherche de l'utilisateur avec ID: {user_obj_id}")
            
            # Débug - lister quelques utilisateurs pour vérifier
            debug_users = await users_collection.find().limit(3).to_list(length=3)
            if debug_users is not None and len(debug_users) > 0:
                logger.info(f"Exemple d'utilisateurs dans la base: {[u.get('username') for u in debug_users]}")
            
            # Trouver l'utilisateur
            user = await users_collection.find_one({"_id": user_obj_id})
            logger.info(f"Utilisateur trouvé: {user is not None}")
            
            if user is not None and "fine_amount" in user:
                fine_amount = user.get("fine_amount", 0.0)
                logger.info(f"💰 SUCCÈS: Retrieved fine amount {fine_amount} for user {user_id}")
                if isinstance(fine_amount, (int, float)):
                    logger.info(f"Le montant est bien un nombre: {type(fine_amount).__name__}")
                else:
                    logger.warning(f"Type du montant d'amende inattendu: {type(fine_amount).__name__}, conversion en float")
                    fine_amount = float(fine_amount)
                return fine_amount
            
            if user is not None:
                logger.warning(f"⚠️ User {user_id} found but has no fine_amount field")
                # Afficher les champs disponibles pour débug
                logger.warning(f"Champs disponibles: {list(user.keys())}")
                # Essayer de mettre à jour l'utilisateur avec un champ fine_amount à 5.0
                logger.info(f"Tentative de mise à jour du champ fine_amount à 5.0 pour {user_id}")
                try:
                    await users_collection.update_one(
                        {"_id": user_obj_id},
                        {"$set": {"fine_amount": 5.0}}
                    )
                    logger.info("✅ Mise à jour du champ fine_amount réussie")
                    return 5.0
                except Exception as update_err:
                    logger.error(f"❌ Erreur lors de la mise à jour de fine_amount: {update_err}")
            else:
                logger.warning(f"⚠️ User {user_id} not found in database")
            
            logger.info("=== FIN get_user_total_fines (retourne 0.0 par défaut) ===")
            return 0.0
            
        except Exception as e:
            logger.error(f"❌ ERREUR GLOBALE: Erreur lors de la récupération des amendes pour l'utilisateur {user_id}: {e}")
            return 0.0
    
    async def process_payment(self, user_id: str, payment_amount: float) -> dict:
        """Traiter un paiement d'amende"""
        try:
            db = self.get_database()
            if db is None:
                logger.error("Failed to get database connection")
                return {"success": False, "error": "Database connection error"}
            users_collection = db.users
            
            # Obtenir l'utilisateur
            user = await users_collection.find_one({"_id": ObjectId(user_id)})
            if user is None:
                return {"success": False, "message": "Utilisateur non trouvé"}
            
            current_fine = user.get("fine_amount", 0.0)
            
            if payment_amount > current_fine:
                return {"success": False, "message": "Le montant du paiement dépasse les amendes dues"}
            
            # Réduire l'amende de l'utilisateur
            new_fine_amount = current_fine - payment_amount
            await users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"fine_amount": round(new_fine_amount, 2)}}
            )
            
            # Si les amendes sont entièrement payées, réactiver le compte si nécessaire
            if new_fine_amount == 0:
                await users_collection.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": {"is_active": True}}
                )
            
            logger.info(f"Paiement de {payment_amount}€ traité pour l'utilisateur {user_id}")
            
            return {
                "success": True,
                "previous_fine": current_fine,
                "payment_amount": payment_amount,
                "remaining_fine": new_fine_amount,
                "message": f"Paiement de {payment_amount}€ traité avec succès"
            }
            
        except Exception as e:
            logger.error(f"Erreur lors du traitement du paiement: {e}")
            return {"success": False, "message": f"Erreur lors du traitement du paiement: {str(e)}"}
    
    async def get_overdue_borrowings_for_user(self, user_id: str) -> list:
        """Obtenir tous les emprunts en retard pour un utilisateur"""
        try:
            db = self.get_database()
            if db is None:
                logger.error("Failed to get database connection")
                return {"success": False, "error": "Database connection error"}
            borrowings_collection = db.borrowings
            books_collection = db.books
            
            # Trouver les emprunts en retard
            overdue_borrowings = await borrowings_collection.find({
                "user_id": user_id,
                "status": BorrowingStatus.OVERDUE
            }).to_list(length=None)
            
            # Enrichir avec les informations du livre
            result = []
            for borrowing in overdue_borrowings:
                book = await books_collection.find_one({"_id": ObjectId(borrowing["book_id"])})
                borrowing_info = {
                    "id": str(borrowing["_id"]),
                    "book_id": borrowing["book_id"],
                    "book_title": book["title"] if book else "Livre inconnu",
                    "book_author": book["author"] if book else "Auteur inconnu",
                    "borrowed_at": borrowing["borrowed_at"],
                    "due_date": borrowing["due_date"],
                    "days_overdue": (datetime.utcnow() - borrowing["due_date"]).days,
                    "fine_amount": borrowing.get("fine_amount", 0.0)
                }
                result.append(borrowing_info)
            
            return result
            
        except Exception as e:
            logger.error(f"Erreur lors de la récupération des emprunts en retard: {e}")
            return []

# Instance globale du service
fine_service = FineService()

# L'initialisation complète sera faite au premier appel à get_database()
# après que la connexion à la base de données ait été établie dans main.py
logger.info("FineService instance created, database will be initialized on first use")
