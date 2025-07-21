from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, books, borrowings, chatbot, payments, debug_books, users
# Import stats séparément pour s'assurer qu'il est bien chargé
from app.routers.stats import router as stats_router
from app.config import settings
from app.tasks.fine_scheduler import fine_scheduler

app = FastAPI(
    title="LibraAi API",
    description="API pour la gestion intelligente de bibliothèque avec IA",
    version="1.0.0"
)

# Configuration CORS - Allow all origins for debugging
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for debugging
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Événements de démarrage et arrêt
@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    # Démarrer le scheduler d'amendes
    fine_scheduler.start()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()
    # Arrêter le scheduler d'amendes
    fine_scheduler.stop()

# Montage des fichiers statiques
app.mount("/static", StaticFiles(directory="static"), name="static")

# Routes principales
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(books.router, prefix="/books", tags=["Books"])
app.include_router(borrowings.router, prefix="/borrowings", tags=["Borrowings"])
app.include_router(chatbot.router, prefix="/chat", tags=["Chatbot"])
app.include_router(payments.router, prefix="/payments", tags=["Payments"])
app.include_router(debug_books.router, prefix="/debug", tags=["Debug"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(stats_router, prefix="/stats", tags=["Statistics"])

@app.get("/")
async def root():
    return {"message": "LibraAi API - Bibliothèque Intelligente"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "api_version": "1.0.0"}

@app.get("/stats-test")
async def stats_test():
    return {"message": "Stats test endpoint is working directly from main.py!"}

@app.get("/stats/admin-dashboard-test")
async def admin_dashboard_test():
    return {
        "users_count": 10,
        "active_borrowings_count": 5,
        "overdue_borrowings_count": 2,
        "books_count": 100,
        "most_borrowed_books": [
            {"id": "1", "title": "Test Book 1", "count": 10},
            {"id": "2", "title": "Test Book 2", "count": 8}
        ],
        "borrowings_by_month": [
            {"month": "Jan 2025", "count": 20},
            {"month": "Feb 2025", "count": 15}
        ],
        "returns_by_month": [
            {"month": "Jan 2025", "count": 18},
            {"month": "Feb 2025", "count": 12}
        ],
        "books_by_category": [
            {"category": "Fiction", "count": 50},
            {"category": "Non-Fiction", "count": 30}
        ]
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)