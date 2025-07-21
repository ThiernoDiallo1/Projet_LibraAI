from fastapi import APIRouter, Depends, HTTPException
from app.services.auth_service import get_current_active_user
from app.models.user import User
from app.database import get_database
from pymongo.database import Database
from datetime import datetime, timedelta
from typing import Dict, Any, List

router = APIRouter(
    prefix="/stats",
    tags=["statistics"],
    responses={404: {"description": "Not found"}},
)

@router.get("/test")
async def test_endpoint():
    """Endpoint de test pour vérifier que le routeur stats est bien chargé."""
    return {"message": "Le routeur stats est bien chargé!"}

@router.get("/admin-dashboard")
async def admin_dashboard(db: Database = Depends(get_database), current_user: User = Depends(get_current_active_user)):
    """
    Fournit les statistiques pour le tableau de bord administrateur.
    Nécessite un utilisateur authentifié avec des privilèges d'administration.
    """
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Accès restreint aux administrateurs")
    
    # Date actuelle
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    last_30_days = now - timedelta(days=30)
    
    # Statistiques utilisateurs
    total_users = db.users.count_documents({})
    active_users = db.users.count_documents({"is_active": True})
    new_users_month = db.users.count_documents({"created_at": {"$gte": start_of_month}})
    
    # Statistiques livres
    total_books = db.books.count_documents({})
    books_added_month = db.books.count_documents({"created_at": {"$gte": start_of_month}})
    
    # Statistiques emprunts
    total_borrowings = db.borrowings.count_documents({})
    active_borrowings = db.borrowings.count_documents({"returned": False})
    borrowings_month = db.borrowings.count_documents({"borrowed_at": {"$gte": start_of_month}})
    
    # Statistiques réservations
    total_reservations = db.reservations.count_documents({})
    active_reservations = db.reservations.count_documents({"fulfilled": False})
    reservations_month = db.reservations.count_documents({"reserved_at": {"$gte": start_of_month}})
    
    # Top 5 des livres les plus empruntés
    pipeline = [
        {"$group": {"_id": "$book_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_borrowed_ids = [item["_id"] for item in db.borrowings.aggregate(pipeline)]
    top_borrowed_books = []
    for book_id in top_borrowed_ids:
        book = db.books.find_one({"_id": book_id})
        if book:
            top_borrowed_books.append({
                "id": str(book["_id"]),
                "title": book.get("title", ""),
                "isbn": book.get("isbn", ""),
                "count": db.borrowings.count_documents({"book_id": book_id})
            })
    
    # Activité récente - derniers emprunts et retours
    recent_activity = []
    
    # Derniers emprunts
    recent_borrowings = list(db.borrowings.find({"returned": False}).sort("borrowed_at", -1).limit(5))
    for borrowing in recent_borrowings:
        book = db.books.find_one({"_id": borrowing["book_id"]})
        user = db.users.find_one({"_id": borrowing["user_id"]})
        if book and user:
            recent_activity.append({
                "type": "emprunt",
                "date": borrowing.get("borrowed_at", now).isoformat(),
                "book_title": book.get("title", ""),
                "user_name": user.get("username", ""),
                "id": str(borrowing["_id"])
            })
    
    # Derniers retours
    recent_returns = list(db.borrowings.find({"returned": True}).sort("returned_at", -1).limit(5))
    for borrowing in recent_returns:
        book = db.books.find_one({"_id": borrowing["book_id"]})
        user = db.users.find_one({"_id": borrowing["user_id"]})
        if book and user and "returned_at" in borrowing:
            recent_activity.append({
                "type": "retour",
                "date": borrowing.get("returned_at", now).isoformat(),
                "book_title": book.get("title", ""),
                "user_name": user.get("username", ""),
                "id": str(borrowing["_id"])
            })
    
    # Trier l'activité récente par date
    recent_activity.sort(key=lambda x: x["date"], reverse=True)
    recent_activity = recent_activity[:5]  # Limiter aux 5 activités les plus récentes
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "new_this_month": new_users_month
        },
        "books": {
            "total": total_books,
            "added_this_month": books_added_month
        },
        "borrowings": {
            "total": total_borrowings,
            "active": active_borrowings,
            "this_month": borrowings_month
        },
        "reservations": {
            "total": total_reservations,
            "active": active_reservations,
            "this_month": reservations_month
        },
        "top_borrowed_books": top_borrowed_books,
        "recent_activity": recent_activity
    }
