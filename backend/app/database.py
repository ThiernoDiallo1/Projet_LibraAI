from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging
import sys

# Configuration avancée du logging
logging.basicConfig(level=logging.INFO, stream=sys.stdout,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    database = None

db = Database()

async def connect_to_mongo():
    """Connexion à MongoDB Atlas"""
    try:
        # Logs plus détaillés pour le diagnostic
        print("========== DIAGNOSTIC MONGODB ==========")
        print(f"Tentative de connexion à MongoDB: {settings.mongodb_url}")
        logger.info(f"Tentative de connexion à MongoDB: {settings.mongodb_url}")
        
        # Initialisation du client avec un timeout plus long pour MongoDB Atlas
        print("Initialisation du client MongoDB...")
        db.client = AsyncIOMotorClient(
            settings.mongodb_url, 
            serverSelectionTimeoutMS=30000,  # 30 secondes pour MongoDB Atlas
            connectTimeoutMS=20000,  # 20 secondes pour la connexion
            socketTimeoutMS=20000,   # 20 secondes pour les opérations
            maxPoolSize=50,
            retryWrites=True
        )
        db.database = db.client[settings.database_name]
        
        # Test de connexion explicite
        print("Test de ping MongoDB...")
        await db.client.admin.command('ping')
        print("✅ Ping MongoDB réussi!")
        logger.info("✅ Connexion à MongoDB Atlas réussie")
        
        # Création des index
        print("Création des index MongoDB...")
        await create_indexes()
        print("✅ Index MongoDB créés")
        print("=======================================")
        
    except Exception as e:
        print(f"❌ ERREUR MongoDB: {e}")
        logger.error(f"Erreur de connexion à MongoDB: {e}")
        logger.warning("L'application fonctionnera sans base de données")
        # Ne pas lever l'exception pour permettre au serveur de démarrer
        db.client = None
        db.database = None
        print("=======================================")

async def close_mongo_connection():
    """Fermeture de la connexion MongoDB"""
    if db.client:
        db.client.close()
        print("Connexion MongoDB fermée")
        logger.info("Connexion MongoDB fermée")

async def create_indexes():
    """Création des index pour optimiser les requêtes"""
    try:
        # Index pour les utilisateurs
        await db.database.users.create_index("email", unique=True)
        await db.database.users.create_index("username", unique=True)
        
        # Index pour les livres
        await db.database.books.create_index("isbn", unique=True)
        await db.database.books.create_index("title")
        await db.database.books.create_index("author")
        
        # Index pour les emprunts
        await db.database.borrowings.create_index([("user_id", 1), ("book_id", 1)])
        await db.database.borrowings.create_index("due_date")
        
        logger.info("Index MongoDB créés avec succès")
        
    except Exception as e:
        logger.error(f"Erreur lors de la création des index: {e}")

def get_database():
    return db.database