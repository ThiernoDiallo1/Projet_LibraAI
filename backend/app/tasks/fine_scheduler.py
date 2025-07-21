import asyncio
import schedule
import time
import logging
from datetime import datetime
from threading import Thread
from app.services.fine_service import fine_service

logger = logging.getLogger(__name__)

class FineScheduler:
    def __init__(self):
        self.running = False
        self.thread = None
    
    async def update_fines_job(self):
        """Tâche de mise à jour quotidienne des amendes"""
        try:
            logger.info("Démarrage de la mise à jour quotidienne des amendes")
            result = await fine_service.update_overdue_borrowings()
            
            if result['success']:
                logger.info(f"Mise à jour des amendes terminée: {result['updated_borrowings']} emprunts mis à jour, {result['total_fines_added']}€ d'amendes ajoutées")
            else:
                logger.error(f"Erreur lors de la mise à jour des amendes: {result.get('error', 'Erreur inconnue')}")
                
        except Exception as e:
            logger.error(f"Erreur critique lors de la mise à jour des amendes: {e}")
    
    def run_async_job(self, async_func):
        """Exécuter une fonction async dans le scheduler synchrone"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(async_func())
        finally:
            loop.close()
    
    def schedule_jobs(self):
        """Planifier les tâches"""
        # Mise à jour quotidienne des amendes à 1h du matin
        schedule.every().day.at("01:00").do(
            lambda: self.run_async_job(self.update_fines_job)
        )
        
        # Mise à jour supplémentaire à midi pour les nouveaux retards
        schedule.every().day.at("12:00").do(
            lambda: self.run_async_job(self.update_fines_job)
        )
        
        logger.info("Tâches de mise à jour des amendes planifiées:")
        logger.info("- Mise à jour quotidienne à 01:00")
        logger.info("- Mise à jour supplémentaire à 12:00")
    
    def run_scheduler(self):
        """Boucle principale du scheduler"""
        logger.info("Démarrage du scheduler d'amendes")
        while self.running:
            schedule.run_pending()
            time.sleep(60)  # Vérifier toutes les minutes
        logger.info("Arrêt du scheduler d'amendes")
    
    def start(self):
        """Démarrer le scheduler"""
        if not self.running:
            self.running = True
            self.schedule_jobs()
            self.thread = Thread(target=self.run_scheduler, daemon=True)
            self.thread.start()
            logger.info("Scheduler d'amendes démarré en arrière-plan")
    
    def stop(self):
        """Arrêter le scheduler"""
        if self.running:
            self.running = False
            if self.thread:
                self.thread.join(timeout=5)
            logger.info("Scheduler d'amendes arrêté")
    
    async def run_manual_update(self):
        """Exécuter manuellement la mise à jour des amendes"""
        logger.info("Exécution manuelle de la mise à jour des amendes")
        return await self.update_fines_job()

# Instance globale du scheduler
fine_scheduler = FineScheduler()
